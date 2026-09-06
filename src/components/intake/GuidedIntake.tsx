"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceInput } from "@/components/start/VoiceInput";
import { VoiceComposer } from "@/components/start/VoiceComposer";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/components/SiteHeader";
import { CATEGORIES, findCategory } from "@/lib/case/categories";
import { createDefaultEvidence } from "@/lib/case/evidence";
import { OFFICERS } from "@/lib/case/officers";
import { newCase, saveCase } from "@/lib/case/store";
import type { Entities, Triage } from "@/lib/case/types";
import type { DictKey } from "@/lib/i18n/dict/en";
import { useI18n } from "@/lib/i18n/context";
import {
  emptyIntake,
  evidenceIdsFor,
  hasCompletedSafetyGate,
  hasCurrentSafetyAnswer,
  SAFETY_GATE_TTL_MS,
  needsFastFinancialAction,
  nextIntakeStep,
  timingEstimate,
  callTurns,
  cleanCallTranscript,
  victimTurnsFromTranscript,
  type ChildContext,
  type EvidenceKind,
  type IncidentTiming,
  type IntakeAnalysis,
  type IntakeChannel,
  type IntakeDraft,
  type MoneyAnswer,
  type SafetyAnswer,
} from "@/lib/intake/interview";
import {
  INTAKE_STORAGE_KEY,
  loadBrowserIntakeDraft,
  saveBrowserIntakeDraft,
} from "@/lib/intake/persistence";
import {
  assessRbiEligibility,
  type RbiEligibilityAssessment,
  type RbiEligibilityInput,
  type RbiInitiation,
  type RbiReportTiming,
  type RbiYesNoUnknown,
} from "@/lib/legal/rbi";
import {
  clearStoredVaaniSession,
  readStoredVaaniSession,
  writeStoredVaaniSession,
  type StoredVaaniSession,
} from "@/lib/integrations/vaani-client";
import Image from "next/image";
import { LiveVoiceCall } from "@/components/intake/LiveVoiceCall";
import { mapVaaniCall } from "@/lib/intake/from-vaani";
import { firstName } from "@/lib/intake/name";
import {
  callAnalysis,
  callPollDelayMs,
  draftFromCall,
  CALL_POLL_BUDGET_MS,
} from "@/lib/intake/call-to-case";
import {
  answerDetail,
  askedDetails,
  detailAnswerText,
  detailProgress,
  detailsForCase,
  isDetailAnswer,
  localDateTimeValue,
  nameAnswered,
  nextDetail,
  NAME_QUESTION,
  skipDetail,
  skipRemainingDetails,
  DETAIL_GROUPS,
  DETAIL_QUESTIONS,
  type DetailKind,
  type DetailPhase,
  type DetailQuestion,
} from "@/lib/intake/details";
import {
  WhatsAppBubble,
  WhatsAppComposer,
  WhatsAppHeader,
  WhatsAppSystemNote,
  WhatsAppSendButton,
  WhatsAppRecordingBar,
  WhatsAppInput,
  WhatsAppButtons,
  WhatsAppButton,
  WhatsAppDateChip,
  WhatsAppTyping,
  WhatsAppListSheet,
  PhoneFrame,
  WHATSAPP_WALLPAPER,
  whatsappWallpaperStyle,
} from "@/components/intake/WhatsAppChrome";
import { cn, inr } from "@/lib/utils";

const OBSOLETE_WHATSAPP_SIMULATION_KEYS = [
  "kavach.whatsapp-simulation.v1",
  "kavach.whatsapp-simulation.v2",
] as const;

type T = ReturnType<typeof useI18n>["t"];
type Message = {
  role: "agent" | "user";
  text: string;
  urgent?: boolean;
  promptId?: string;
};
type EntityArrayKey = keyof Entities;

const EVIDENCE_OPTIONS: { id: Exclude<EvidenceKind, "none">; key: Parameters<T>[0] }[] = [
  { id: "transaction", key: "intake.evTransaction" },
  { id: "bank-message", key: "intake.evBank" },
  { id: "payment-reference", key: "intake.evReference" },
  { id: "chat", key: "intake.evChat" },
  { id: "call-log", key: "intake.evCall" },
  { id: "email", key: "intake.evEmail" },
  { id: "link", key: "intake.evLink" },
];

/** What became of a finished call, from the panel's point of view. */
type CallHandoff =
  | { ok: true }
  | { ok: false; reason: "no-transcript" }
  | { ok: false; reason: "needs-review"; transcript: string; victimTurns: string };

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      globalThis.clearTimeout(timer);
      reject(new Error("aborted"));
    }, { once: true });
  });
}

async function postCapability(path: string, token: string, signal: AbortSignal) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    signal,
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { response, data };
}

function retryAfterSeconds(response: Response): number | null {
  const asked = Number(response.headers.get("Retry-After"));
  return Number.isFinite(asked) && asked > 0 ? asked : null;
}

/**
 * Wait for the provider to finish writing up the call.
 *
 * A browser call is usually transcribed within seconds of hanging up, but the
 * provider answers "not ready" until it is. This waits out that gap on the
 * caller's behalf, respects the Retry-After it is given, and gives up at a
 * budget rather than spinning forever — a stalled hand-off falls back to the
 * manual controls, which is a worse experience but never a dead end.
 */
async function pollTranscript(token: string, signal: AbortSignal): Promise<string | null> {
  const deadline = Date.now() + CALL_POLL_BUDGET_MS;
  let retryAfter: number | null = null;
  for (let attempt = 0; ; attempt += 1) {
    if (attempt > 0) {
      const delay = callPollDelayMs(attempt - 1, retryAfter);
      if (Date.now() + delay > deadline) return null;
      await sleep(delay, signal);
    }
    const { response, data } = await postCapability("/api/vaani/transcript", token, signal);
    const transcript = typeof data.transcript === "string" ? data.transcript : "";
    if (response.ok && transcript.trim()) return transcript;
    if (!data.retryable) return null;
    retryAfter = retryAfterSeconds(response);
  }
}

/**
 * The fields the agent captured during the call.
 *
 * Structured output can lag the transcript by a moment, so one retry is worth
 * it: every field that arrives here is a field the caller does not have to type
 * again. An empty result is survivable — the model reads the transcript instead.
 */
async function fetchCallExtraction(token: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { response, data } = await postCapability("/api/vaani/outcome", token, signal);
      const extracted = data.extracted;
      if (response.ok && extracted && typeof extracted === "object" && !Array.isArray(extracted)) {
        return extracted as Record<string, unknown>;
      }
      if (!data.retryable) return {};
      await sleep(callPollDelayMs(1, retryAfterSeconds(response)), signal);
    } catch {
      return {};
    }
  }
  return {};
}

async function triageNarrative(
  text: string,
  language: string,
  signal: AbortSignal,
): Promise<IntakeAnalysis | null> {
  try {
    const response = await fetch("/api/ai/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: language }),
      signal,
    });
    if (!response.ok) return null;
    return await response.json() as IntakeAnalysis;
  } catch {
    return null;
  }
}

/**
 * The question a step is asking, for the page that shows one at a time.
 *
 * These used to live only in the message log. Taking the log away left several
 * steps as four bare buttons — "Within the last hour", "Earlier today" — with
 * nothing on screen saying what they were an answer to.
 *
 * The steps that build their own card are absent on purpose: the story has the
 * composer, and a follow-up has its heading, its reason and where to find it.
 */
function stepPrompt(step: ReturnType<typeof nextIntakeStep>): { q: DictKey; sub?: DictKey } | null {
  switch (step) {
    case "boundaries": return { q: "intake.boundaryQ", sub: "intake.boundaryBody" };
    case "safety": return { q: "intake.safetyQ" };
    case "emergency": return { q: "intake.emergencyH", sub: "intake.emergencyBody" };
    case "age": return { q: "intake.ageQ" };
    case "child-safety": return { q: "intake.childH", sub: "intake.childBody" };
    case "money": return { q: "intake.moneyQ" };
    case "timing": return { q: "intake.timingQ" };
    case "verify": return { q: "intake.verifyQ" };
    case "rbi-initiation": return { q: "intake.rbiInitiationQ" };
    case "rbi-credentials": return { q: "intake.rbiCredentialQ" };
    case "rbi-bank-fault": return { q: "intake.rbiBankFaultQ" };
    case "rbi-report-timing": return { q: "intake.rbiReportQ" };
    case "rbi-review": return { q: "intake.rbiReviewQ" };
    case "evidence": return { q: "intake.evidenceQ", sub: "intake.evidenceSub" };
    case "routing": return { q: "intake.routingQ", sub: "intake.routingSub" };
    case "ready": return { q: "intake.readyQ", sub: "intake.readyBody" };
    default: return null;
  }
}

export function GuidedIntake({ lockChannel, onReset }: {
  lockChannel?: IntakeChannel;
  /** Told when the person starts over, so the page can go back to the box. */
  onReset?: () => void;
} = {}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [draft, setDraft] = useState<IntakeDraft>(() => emptyIntake());
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<"checking" | "saving" | "saved" | "error">("checking");
  const [showReset, setShowReset] = useState(false);
  const [safetyClock, setSafetyClock] = useState(() => Date.now());
  // The hand-off from a finished call runs for tens of seconds. It has to write
  // the draft as it stands when it completes, not as it was when the call ended.
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const currentRef = useRef<HTMLDivElement>(null);
  const evidenceChoice = draft.pendingEvidence ?? [];
  const step = nextIntakeStep(draft);
  const voiceGateComplete = hasCompletedSafetyGate(draft);
  const whatsapp = draft.channel === "whatsapp";
  // The two steps where the composer is a live field rather than a hint: the
  // story, and each follow-up question after it.
  // Two different things: whether the bar at the foot of the screen is a live
  // field, and whether the step's own control *is* that field. Routing is the
  // case that separates them — the district is typed into the composer while
  // "use this location" stays a reply button up in the conversation.
  const typing = step === "story" || step === "details" || step === "name"
    || (draft.channel === "whatsapp" && step === "routing" && Boolean(draft.state));
  const composerOwnsControls = draft.channel === "whatsapp"
    && (step === "story" || step === "details" || step === "name");
  // The unified page asks one thing at a time: everything already settled goes
  // behind a fold rather than stacking above the question being asked.
  const flashcards = lockChannel === "web";
  // The voice channel is a microphone, not a chat with a microphone above it.
  const voiceOnly = draft.channel === "voice";
  const [chatClock, setChatClock] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    queueMicrotask(() => setChatClock(
      new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    ));
  }, []);
  const safetyAnswerTime = Date.parse(draft.safetyCheckedAt ?? "");
  const messages = useMemo(
    () => buildMessages(
      draft,
      t,
      new Date(Math.max(safetyClock, Number.isFinite(safetyAnswerTime) ? safetyAnswerTime : 0)),
      draft.channel === "whatsapp",
    ),
    [draft, safetyAnswerTime, safetyClock, t],
  );
  useEffect(() => {
    const restored = loadBrowserIntakeDraft();
    for (const key of OBSOLETE_WHATSAPP_SIMULATION_KEYS) {
      try { localStorage.removeItem(key); } catch { /* Browser storage may be unavailable. */ }
    }
    queueMicrotask(() => {
      if (restored.draft) setDraft(restored.draft);
      setPersistence(restored.available ? "saved" : "error");
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const next = saveBrowserIntakeDraft(draft) ? "saved" : "error";
    queueMicrotask(() => setPersistence(next));
  }, [draft, hydrated]);

  useEffect(() => {
    if (!draft.safetyCheckedAt) return;
    const expiresAt = new Date(draft.safetyCheckedAt).getTime() + SAFETY_GATE_TTL_MS;
    const delay = Math.max(0, expiresAt - Date.now() + 25);
    const timer = setTimeout(() => setSafetyClock(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [draft.safetyCheckedAt]);

  useEffect(() => {
    const current = currentRef.current;
    current?.focus({ preventScroll: true });
    current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step]);

  const patch = useCallback((value: Partial<IntakeDraft>) => {
    setPersistence("saving");
    setDraft((current) => ({ ...current, ...value }));
    setError(null);
  }, []);

  // A page that fixes the channel wins over whatever is in the stored draft,
  // and the front door's "rather talk to someone" link asks for voice by query.
  useEffect(() => {
    if (!hydrated) return;
    const asked = lockChannel
      ?? (new URLSearchParams(window.location.search).get("channel") === "voice" ? "voice" : undefined);
    if (asked && draftRef.current.channel !== asked) patch({ channel: asked });
  }, [hydrated, lockChannel, patch]);

  const appendNarrative = useCallback((chunk: string) => {
    const clean = chunk.replace(/\s+/g, " ").trim();
    if (!clean) return;
    setPersistence("saving");
    setDraft((current) => {
      if (current.narrative.includes(clean)) return current;
      return {
        ...current,
        narrative: [current.narrative.trim(), clean].filter(Boolean).join(" "),
        analysis: undefined,
        analysisConfirmed: false,
      };
    });
  }, []);

  const answer = useCallback((value: Partial<IntakeDraft>, label: string) => {
    void label;
    if (value.safetyCheckedAt) {
      setSafetyClock(new Date(value.safetyCheckedAt).getTime());
    }
    patch(value);
  }, [patch]);

  /**
   * Fill the case from the call, and ask the model only for the gaps.
   *
   * Vaani has already returned the amount, the bank, the UPI id, the reference
   * and a written chronology. Re-deriving those from the transcript would be
   * slower, cost a request, and give a second chance to be wrong — so they are
   * taken as they are, and the model is called only when the category or the
   * English account is missing.
   */
  const applyCallFacts = useCallback(async (token: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/vaani/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) return false;
      const data = await response.json() as { extracted?: Record<string, unknown> };
      if (!data.extracted || !Object.keys(data.extracted).length) return false;

      const facts = mapVaaniCall(data.extracted);
      if (facts.needsModel || !facts.triage.categoryId) return false;

      setDraft((current) => ({
        ...current,
        moneyMoved: facts.moneyMoved ?? current.moneyMoved,
        transactionInitiation: facts.transactionInitiation ?? current.transactionInitiation,
        callerName: facts.callerName ?? current.callerName,
        bankName: facts.bankName ?? current.bankName,
        state: facts.state ?? current.state,
        district: facts.district ?? current.district,
        analysis: {
          triage: {
            categoryId: facts.triage.categoryId!,
            subcategoryId: facts.triage.subcategoryId,
            confidence: facts.triage.confidence ?? 0.6,
            amount: facts.triage.amount,
            incidentAt: facts.triage.incidentAt,
            englishNarrative: facts.triage.englishNarrative,
            applicableTracks: facts.triage.applicableTracks ?? [],
            urgency: facts.triage.urgency ?? "moderate",
          },
          entities: facts.entities,
          source: "vaani",
        },
        analysisConfirmed: false,
      }));
      setPersistence("saving");
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const analyse = useCallback(async () => {
    const narrative = draft.narrative.trim();
    if (narrative.length < 25) {
      setError(t("intake.storyShort"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: narrative, lang: lang.code }),
      });
      if (!response.ok) throw new Error("triage-failed");
      const result = await response.json() as IntakeAnalysis;
      const incidentAt = timingEstimate(draft.incidentTiming, result.triage.incidentAt);
      const analysis: IntakeAnalysis = {
        ...result,
        triage: { ...result.triage, incidentAt },
      };
      setPersistence("saving");
      setDraft((current) => ({
        ...current,
        analysis,
        analysisConfirmed: false,
      }));
    } catch {
      setError(t("start.error"));
    } finally {
      setBusy(false);
    }
  }, [draft, lang.code, t]);

  const updateTriage = useCallback((value: Partial<Triage>) => {
    setPersistence("saving");
    setDraft((current) => {
      if (!current.analysis) return current;
      const category = value.categoryId ? findCategory(value.categoryId) : undefined;
      return {
        ...current,
        analysis: {
          ...current.analysis,
          triage: {
            ...current.analysis.triage,
            ...value,
            ...(category ? { applicableTracks: category.tracks } : {}),
          },
        },
      };
    });
  }, []);

  const updateEntity = useCallback((field: EntityArrayKey, index: number, value?: string) => {
    setPersistence("saving");
    setDraft((current) => {
      if (!current.analysis) return current;
      const nextValues = value === undefined
        ? current.analysis.entities[field].filter((_, itemIndex) => itemIndex !== index)
        : current.analysis.entities[field].map((item, itemIndex) => itemIndex === index ? value : item);
      return {
        ...current,
        analysisConfirmed: false,
        analysis: {
          ...current.analysis,
          entities: { ...current.analysis.entities, [field]: nextValues },
        },
      };
    });
  }, []);

  /**
   * Write an interview out as a case file, and say which case it became.
   *
   * The draft is passed in rather than read from state: the voice hand-off
   * assembles a draft and opens the case in the same tick, and state set a
   * moment earlier would not be visible yet.
   */
  const commitCase = useCallback((
    source: IntakeDraft,
    options?: { transcriptToken?: string; event?: string },
  ): string | null => {
    const analysis = source.analysis;
    if (!analysis) return null;
    const incidentAt = analysis.triage.incidentAt;
    const now = new Date().toISOString();
    const available = new Set(evidenceIdsFor(source.evidence));
    const evidence = createDefaultEvidence(now).map((item) =>
      available.has(item.id) ? { ...item, status: "added" as const, updatedAt: now } : item,
    );
    const rbiInput = rbiInputFromDraft(source);
    const answers = source.details ?? {};

    const c = newCase({
      language: lang.code,
      rawStatement: source.narrative.trim(),
      triage: analysis.triage,
      entities: analysis.entities,
      amount: analysis.triage.amount,
      incidentAt,
      incidentTimingRange: source.incidentTiming,
      bankAlertAt: source.bankAlertAt,
      txns: analysis.triage.amount || analysis.entities.refs[0]
        ? [{ amount: analysis.triage.amount, ref: analysis.entities.refs[0], at: incidentAt }]
        : [],
      victim: {
        name: source.callerName,
        // Answered in the follow-ups, and the reason the letters come out of
        // this without a single square bracket in the address block.
        phone: answers.phone,
        email: answers.email,
        address: answers.address,
        policeStation: answers.policeStation,
        state: source.state,
        district: source.district,
        ageContext: source.childContext,
      },
      bank: {
        name: source.bankName,
        branchAddress: answers.branchAddress,
        last4: answers.accountLast4,
        ackRef: answers.bankAck,
        notifiedAt: answers.bankNotifiedAt,
      },
      suspect: {
        phones: analysis.entities.phones,
        upiIds: analysis.entities.upiIds,
        accounts: analysis.entities.accounts,
        urls: analysis.entities.urls,
        handles: analysis.entities.handles,
      },
      evidenceText: source.evidenceNote ?? "",
      files: source.files,
      evidence,
      // Kept on the case, not in the browser session, so this case's Call tab
      // shows this call and no later one can overwrite it.
      ...(options?.transcriptToken
        ? { voiceCall: { transcriptToken: options.transcriptToken, endedAt: now } }
        : {}),
      legal: rbiInput ? {
        rbi: {
          input: rbiInput,
          assessment: assessRbiEligibility(rbiInput),
          assessedAt: now,
        },
      } : undefined,
    });
    if (answers.ncrpAck) {
      // Where the placeholder panel would put it, so a number given in the chat
      // and a number typed beside the letter end up in the same place.
      c.tracks = [
        ...c.tracks.filter((track) => track.id !== "ncrp"),
        { id: "ncrp" as const, ref: answers.ncrpAck },
      ];
    }
    c.events.push({
      at: now,
      kind: "triaged",
      label: options?.event ?? `Guided interview confirmed · ${source.channel} channel`,
    });
    if (!saveCase(c)) {
      setPersistence("error");
      setError(t("rep.save.error"));
      return null;
    }
    try { localStorage.removeItem(INTAKE_STORAGE_KEY); } catch { /* ignore */ }
    clearStoredVaaniSession();
    return c.id;
  }, [lang.code, t]);

  const openCase = useCallback(() => {
    const id = commitCase(draft);
    if (id) router.push(`/case/${id}`);
  }, [commitCase, draft, router]);

  /**
   * The follow-up being asked, and the answer being typed into it.
   *
   * The answer is held here rather than in the draft because the draft is what
   * decides which question comes next: writing every keystroke into it would
   * mark the question answered on the first letter typed and skip to the next
   * one. It is cleared whenever the question changes.
   */
  /**
   * Going back.
   *
   * Every answer was final: a mistyped bank name, or an amount the model read
   * out of the story wrongly, had nowhere to be corrected — and the amount in
   * particular was never even asked, because it arrived already filled in. Any
   * line in the case file can now be tapped, which reopens that question here
   * with what is already there.
   */
  const [editing, setEditing] = useState<string | null>(null);
  const detail = (editing ? DETAIL_QUESTIONS.find((q) => q.id === editing) : undefined)
    ?? (step === "details"
      ? nextDetail(draft)
      : step === "name" ? NAME_QUESTION : undefined);
  // Keyed by the question it belongs to, so moving on empties the field without
  // an effect that reaches back into state after every render.
  const [statePicker, setStatePicker] = useState(false);
  /**
   * The composer, behaving the way WhatsApp's does.
   *
   * There, the circle at the end of the bar is a microphone until you type a
   * character and a send arrow after that, the camera steps aside at the same
   * moment, and while a voice note is recording the field is replaced by a
   * timer and a bin. All of that is state the composer has to hold, so it is
   * held here, and the microphone reports into it.
   */
  const [micMode, setMicMode] = useState<"idle" | "listening" | "processing" | "unsupported" | "nothing">("idle");
  const [recordedFor, setRecordedFor] = useState(0);
  const micRef = useRef<{ cancel: () => void } | null>(null);
  const recordStartRef = useRef(0);
  const onMicMode = useCallback((mode: typeof micMode) => {
    if (mode === "listening") {
      recordStartRef.current = Date.now();
      setRecordedFor(0);
    }
    setMicMode(mode);
  }, []);
  const [typed, setTyped] = useState<{ id: string; value: string }>({ id: "", value: "" });
  const detailValue = detail && typed.id === detail.id ? typed.value : "";
  // Keyed to whichever question is on screen — the next one in the run, or the
  // one that was reopened to be corrected.
  const setDetailValue = (value: string) => setTyped({ id: detail?.id ?? "", value });

  const startEditing = useCallback((id: string) => {
    const question = DETAIL_QUESTIONS.find((q) => q.id === id);
    if (!question) return;
    setEditing(id);
    setTyped({ id, value: question.read(draftRef.current) });
  }, []);

  const saveDetail = useCallback(() => {
    if (!detail || !isDetailAnswer(detail, detailValue)) return;
    patch(answerDetail(draft, detail, detailValue));
    setEditing(null);
  }, [detail, detailValue, draft, patch]);

  const passDetail = useCallback(() => {
    if (!detail) return;
    // While correcting something, this is "leave it as it was".
    if (editing) { setEditing(null); return; }
    patch(skipDetail(draft, detail.id));
  }, [detail, draft, editing, patch]);

  const passAllDetails = useCallback(() => {
    patch(skipRemainingDetails(draft));
  }, [draft, patch]);

  // What is in the composer, and what pressing send does with it — one answer
  // for the three steps that take typing, so the bar itself stays simple.
  const composerText = step === "story"
    ? draft.narrative
    : step === "details" || step === "name"
      ? detailValue
      : draft.district ?? "";
  const composerHasText = composerText.trim().length > 0;
  const composerCanSend = step === "story"
    ? !busy && composerHasText
    : detail
      ? isDetailAnswer(detail, detailValue)
      : composerHasText;
  const sendComposer = useCallback(() => {
    if (step === "story") analyse();
    else if (step === "details" || step === "name") saveDetail();
    else patch({ routingAnswered: true });
  }, [analyse, patch, saveDetail, step]);
  // A date is chosen in a calendar, not spoken into one.
  const dictatable = detail?.kind !== "datetime";
  const recording = micMode === "listening" || micMode === "processing";
  useEffect(() => {
    if (micMode !== "listening") return;
    const timer = globalThis.setInterval(
      () => setRecordedFor(Math.floor((Date.now() - recordStartRef.current) / 1000)),
      500,
    );
    return () => globalThis.clearInterval(timer);
  }, [micMode]);

  /**
   * Hanging up is the end of the interview, not the middle of one.
   *
   * The transcript is collected, the provider's own extraction is used as it
   * stands, the model is asked only for what Vaani could not supply, and the
   * case page opens. Every step here can fail without costing the caller the
   * call: whatever was said is handed back for the manual review below instead.
   */
  const finishCallToCase = useCallback(async (
    token: string,
    signal: AbortSignal,
  ): Promise<CallHandoff> => {
    try {
      const transcript = await pollTranscript(token, signal);
      if (!transcript) return { ok: false, reason: "no-transcript" };

      const full = cleanCallTranscript(transcript);
      const victimTurns = victimTurnsFromTranscript(transcript);
      const review: CallHandoff = { ok: false, reason: "needs-review", transcript: full, victimTurns };

      // A call the caller never spoke on has nothing to open a case from, and
      // the agent's own questions must never become a victim's statement.
      const turns = callTurns(full);
      if (turns.length > 0 && !turns.some((turn) => !turn.agent)) return review;

      const facts = mapVaaniCall(await fetchCallExtraction(token, signal));
      let analysis = facts.needsModel ? null : callAnalysis(facts);
      if (!analysis) {
        const model = victimTurns.trim().length >= 25
          ? await triageNarrative(victimTurns, lang.code, signal)
          : null;
        analysis = callAnalysis(facts, model);
      }
      if (!analysis) return review;

      const next = draftFromCall(draftRef.current, { facts, narrative: victimTurns, analysis });
      const id = commitCase(next, {
        transcriptToken: token,
        event: "Opened from a voice call \u00b7 nothing confirmed yet",
      });
      if (!id) return review;
      router.push(`/case/${id}`);
      return { ok: true };
    } catch {
      // Includes the abort that fires when this panel unmounts mid-poll.
      return { ok: false, reason: "no-transcript" };
    }
  }, [commitCase, lang.code, router]);

  const reset = useCallback(() => {
    try { localStorage.removeItem(INTAKE_STORAGE_KEY); } catch { /* ignore */ }
    clearStoredVaaniSession();
    setDraft(emptyIntake(draft.channel));
    setShowReset(false);
    // Starting again means going back to "what happened?", not sitting on an
    // emptied interview showing question one of nineteen.
    onReset?.();
  }, [draft.channel, onReset]);

  // A phone screen keeps the newest message in view; a web page would just grow.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, step, whatsapp]);

  if (!hydrated) return <main id="main" className="min-h-dvh" aria-busy />;

  const persistenceLabel = persistence === "error"
    ? t("rep.save.error")
    : persistence === "saved"
      ? t("intake.saved")
      : `${t("build.saving")}…`;
  const controls = (
    <StepControls
      step={step}
      draft={draft}
      patch={patch}
      answer={answer}
      t={t}
      busy={busy}
      error={error}
      analyse={analyse}
      evidenceChoice={evidenceChoice}
      openCase={openCase}
      detail={detail}
      detailValue={detailValue}
      setDetailValue={setDetailValue}
      saveDetail={saveDetail}
      passDetail={passDetail}
      passAllDetails={passAllDetails}
      openStatePicker={() => setStatePicker(true)}
      editing={editing}
    />
  );

  return (
    <div className={lockChannel ? "" : "min-h-dvh"}>
      {!lockChannel && (
      <SiteHeader
        width="6xl"
        status={
          <span
            role="status"
            aria-live="polite"
            className={cn("text-xs", persistence === "error" ? "text-urgent-ink" : "text-ink-3")}
          >
            {persistenceLabel}
          </span>
        }
      />
      )}

      <Frame lockChannel={lockChannel}>
        {persistence === "error" && (
          <p role="alert" className="mb-5 rounded-ctl border border-urgent/35 bg-urgent-soft px-4 py-3 text-sm leading-[1.55] text-urgent-ink">
            {t("rep.save.error")}
          </p>
        )}
        {!lockChannel && (
          <div className="max-w-3xl">
            <p className="label">{t("intake.agentName")} · {t("intake.agentRole")}</p>
            <h1 className="h1-long mt-3">{t("intake.title")}</h1>
            <p className="mt-5 max-w-2xl text-[1.0625rem] leading-[1.65] text-ink-2">{t("intake.sub")}</p>
          </div>
        )}

        {/* Two ways to talk, not three. WhatsApp is a real prototype and it has
            its own page to make that argument; offering it as a third tab here
            asked somebody mid-report to re-pick a channel they had already
            picked, which is the opposite of getting out of their way. */}
        {!lockChannel && (
        <section className="mt-8 sheet px-3 py-3 sm:px-4" aria-label={t("intake.switch")}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <p className="label shrink-0 lg:me-3">{t("intake.switch")}</p>
            <div className="grid sm:grid-cols-2 gap-2 flex-1">
              <ChannelButton
                active={draft.channel === "web"}
                title={t("intake.channel.web")}
                note={t("intake.channel.webNote")}
                icon={<ChatIcon />}
                onClick={() => patch({ channel: "web" })}
              />
              <ChannelButton
                active={draft.channel === "voice"}
                title={t("intake.channel.voice")}
                note={t("intake.channel.voiceNote")}
                icon={<VaaniMark />}
                onClick={() => patch({ channel: "voice" })}
              />
            </div>
          </div>
        </section>
        )}

        {needsFastFinancialAction(draft) && (flashcards ? (
          // Still the first thing on the page, and no longer a wall: a person
          // mid-question needs the number, not four lines about the number.
          <aside
            className="mb-5 flex flex-wrap items-center gap-3 rounded-card border border-urgent/40 bg-urgent-soft px-4 py-3"
            role="alert"
          >
            <p className="flex-1 min-w-0 text-[0.9375rem] font-semibold leading-snug text-urgent-ink">
              {t("intake.urgentH")}
            </p>
            <Button href="tel:1930" external variant="urgent" size="sm">{t("begin.call1930short")}</Button>
          </aside>
        ) : (
          <aside className="mt-5 rounded-card border border-urgent/40 bg-urgent-soft px-5 py-5" role="alert">
            <p className="label !text-urgent-ink/75">{t("triage.firstAction")}</p>
            <h2 className="mt-2 !font-sans !text-xl !font-semibold !tracking-normal !leading-snug text-urgent-ink">
              {t("intake.urgentH")}
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-[1.6] text-urgent-ink/85 max-w-2xl">{t("intake.urgentBody")}</p>
            <Button href="tel:1930" external variant="urgent" size="md" className="mt-4">{t("sos.call")}</Button>
          </aside>
        ))}

        {/* Two columns of equal weight for the chat, because the case file
            beside it is the other half of the conversation. The voice channel
            keeps the wide column it had: it is a microphone, and a form of
            twenty boxes next to "just talk" argues against the whole idea. */}
        <div className={cn(
          "grid gap-6 lg:items-start",
          lockChannel ? "mt-0" : "mt-7",
          lockChannel === "web" ? "max-w-xl mx-auto"
            : lockChannel ? "max-w-xl mx-auto"
              : voiceOnly ? "lg:grid-cols-[minmax(0,1fr)_19rem]"
                : "lg:grid-cols-2",
        )}>
          {voiceOnly ? (
            <VaaniPanel
              bare={Boolean(lockChannel)}
              language={lang.code}
              safetyAnswer={draft.safety}
              childContext={draft.childContext}
              callerName={draft.callerName}
              // Ending the call opens the case. Everything below is the fallback
              // for a call the provider could not write up in time.
              onCallFinished={finishCallToCase}
              // The voice channel has no interview under it, so approving the
              // transcript by hand used to end on a sentence pointing at facts
              // that were not on screen. Hand back to the chat, where the story
              // then sits ready to be read and confirmed.
              onAccepted={(token) => {
                patch({ channel: "web" });
                // The provider's own extraction first. If it cannot supply a
                // category or an English account, the interview simply asks the
                // model on the next step, as it always did.
                if (token) void applyCallFacts(token);
              }}
              onTranscript={appendNarrative}
              t={t}
            />
          ) : (
          <Shell whatsapp={whatsapp} statusTime={chatClock} label={t("intake.agentName")} bare={flashcards}>
            {/* A contact header belongs on a conversation. On the page that asks
                one question at a time there is no visible conversation to head,
                and the save state already lives in the site header. */}
            {flashcards ? null : whatsapp ? (
              <WhatsAppHeader name={t("intake.agentName")} status={t("intake.waStatus")} />
            ) : (
            <div className="px-4 sm:px-5 py-3.5 border-b border-rule bg-sunk flex items-center gap-3"> 
              <span className="w-9 h-9 rounded-full grid place-items-center font-semibold bg-deep text-[#ffffeb]" aria-hidden>K</span>
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-semibold leading-tight">{t("intake.agentName")}</p>
                <p className="text-xs mt-0.5 text-ink-3"> 
                  {t("intake.agentRole")}
                </p>
              </div>
              <span
                role="status"
                className={cn("ms-auto flex items-center gap-1.5 text-xs", persistence === "error" ? "text-urgent-ink" : "text-ink-3")}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", persistence === "error" ? "bg-urgent" : persistence === "saved" ? "bg-done" : "bg-wait")} aria-hidden />
                {persistenceLabel}
              </span>
            </div>
            )}

            <div
              ref={scrollRef}
              style={whatsapp ? whatsappWallpaperStyle : undefined}
              className={cn(
                whatsapp ? "px-2.5 sm:px-3 py-3 space-y-1.5"
                  : flashcards ? "space-y-3"
                    : "px-3 sm:px-5 py-5 space-y-3",
                whatsapp && `${WHATSAPP_WALLPAPER} no-scrollbar flex-1 min-h-0 overflow-y-auto`,
              )}
            >
              {whatsapp && (
                <>
                  <WhatsAppSystemNote>{t("intake.waNotReal")}</WhatsAppSystemNote>
                  <WhatsAppDateChip>{t("intake.waToday")}</WhatsAppDateChip>
                </>
              )}
              {!flashcards && (
              <div
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                className={whatsapp ? "space-y-1.5" : "space-y-3"}
              >
                {messages.map((message, index) => (
                  whatsapp ? (
                    <WhatsAppBubble
                      key={`${message.role}-${index}`}
                      outgoing={message.role === "user"}
                      urgent={message.urgent}
                      time={chatClock}
                    >
                      {message.text}
                    </WhatsAppBubble>
                  ) : (
                    <MessageBubble key={`${message.role}-${index}`} message={message} />
                  )
                ))}
                {whatsapp && busy && <WhatsAppTyping />}
              </div>
              )}

              {/* A bot's reply buttons arrive attached to its message, so on
                  WhatsApp every answer that is a tap belongs here rather than on
                  a strip above the keyboard. Only the two steps that take typing
                  hand their control to the composer instead. */}
              {!composerOwnsControls && (
                <div
                  ref={currentRef}
                  tabIndex={-1}
                  aria-live={flashcards ? "polite" : undefined}
                  className={cn(
                    !flashcards && "pt-2",
                    "focus:outline-none",
                    whatsapp && "[&_.intake-action-card]:bg-white",
                  )}
                >
                  {flashcards && stepPrompt(step) && (
                    <div className="mb-4">
                      {step === "ready" && draft.callerName && (
                        <p className="mb-1 text-[0.9375rem] font-medium text-done">
                          {firstName(draft.callerName)},
                        </p>
                      )}
                      <h2 className="!font-sans !text-[1.375rem] !font-semibold !tracking-[-0.01em] !leading-[1.3]">
                        {t(stepPrompt(step)!.q)}
                      </h2>
                      {stepPrompt(step)!.sub && (
                        <p className="mt-2 text-[0.9375rem] leading-[1.55] text-ink-2">{t(stepPrompt(step)!.sub!)}</p>
                      )}
                    </div>
                  )}
                  {controls}
                </div>
              )}
              {whatsapp && (step === "details" || step === "name") && detail && (
                <div ref={currentRef} tabIndex={-1} className="pt-1 focus:outline-none">
                  <DetailSkips
                    onSkip={passDetail}
                    onSkipAll={passAllDetails}
                    remaining={detailProgress(draft).remaining}
                    wa
                    t={t}
                  />
                </div>
              )}
            </div>

            {whatsapp && statePicker && (
              <WhatsAppListSheet
                title={t("intake.state")}
                items={OFFICERS.map((item) => item.state)}
                onPick={(state) => { patch({ state }); setStatePicker(false); }}
                onClose={() => setStatePicker(false)}
              />
            )}

            {/* The bar at the foot of the screen, doing what that bar does:
                taking what is typed or spoken, and nothing else. Every answer
                that is a tap is a reply button up in the conversation. */}
            {whatsapp && (
              <WhatsAppComposer
                attachmentNote={t("intake.waAttachLater")}
                hideCamera={composerHasText || recording}
                hint={typing && !recording ? t("detail.typeOrSay") : undefined}
                recording={recording ? (
                  <WhatsAppRecordingBar
                    seconds={recordedFor}
                    onCancel={() => micRef.current?.cancel()}
                    cancelLabel={t("intake.waCancelRecording")}
                  />
                ) : undefined}
                input={
                  composerOwnsControls ? controls
                    : typing ? (
                      <WhatsAppInput
                        value={draft.district ?? ""}
                        onChange={(district) => patch({ district })}
                        onSend={sendComposer}
                        placeholder={t("intake.district")}
                        ariaLabel={t("intake.district")}
                      />
                    ) : (
                      <p className="text-[0.9375rem] leading-[1.4] text-[#8696a0] truncate">
                        {t("intake.waTapAbove")}
                      </p>
                    )
                }
                // One circle, as on the real thing: a microphone until there is
                // something to send, a send arrow after that, and — while a
                // voice note is being recorded — the button that ends it. The
                // line above the bar names both, which is what a one-button
                // composer costs somebody who has never used one.
                trailing={typing ? (
                  composerHasText && !recording ? (
                    <WhatsAppSendButton
                      onClick={sendComposer}
                      disabled={!composerCanSend}
                      label={t("intake.waSend")}
                    />
                  ) : dictatable ? (
                    <VoiceInput
                      variant="compact"
                      disabled={busy}
                      controller={micRef}
                      onModeChange={onMicMode}
                      onResult={(chunk) => {
                        if (step === "story") {
                          patch({
                            narrative: [draft.narrative.trim(), chunk].filter(Boolean).join(" "),
                            analysis: undefined,
                            analysisConfirmed: false,
                          });
                        } else {
                          setDetailValue([detailValue.trim(), chunk].filter(Boolean).join(" "));
                        }
                      }}
                    />
                  ) : (
                    <WhatsAppSendButton onClick={sendComposer} disabled label={t("intake.waSend")} />
                  )
                ) : undefined}
              />
            )}
          </Shell>
          )}

          {(!lockChannel || lockChannel === "web") && (
          <aside className={cn(
            "no-scrollbar space-y-4",
            lockChannel
              ? ""
              : "lg:sticky lg:top-28 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pb-4",
          )}>
            {/* Beside the conversation on the wide layout; behind a fold on the
                one-question-at-a-time page, where nineteen fields under the
                question being asked is the pile this was meant to replace. It
                is still one tap away, because watching it fill is the reason
                anybody answers the nineteenth. */}
            {!voiceOnly && (flashcards ? (
              <AnsweredSoFar draft={draft} onEdit={startEditing} t={t} />
            ) : (
              <CaseForm
                draft={draft}
                patch={patch}
                updateTriage={updateTriage}
                updateEntity={updateEntity}
                asking={detail?.id}
                t={t}
              />
            ))}
            <div className="px-1 text-sm text-ink-3 space-y-2">
              {voiceGateComplete && (
                <button
                  type="button"
                  onClick={() => {
                    if (!saveBrowserIntakeDraft(draft)) {
                      setPersistence("error");
                      setError(t("rep.save.error"));
                      return;
                    }
                    router.push("/report");
                  }}
                  className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-ink"
                >
                  {t("intake.formInstead")} →
                </button>
              )}
              <button onClick={() => setShowReset(true)} className="flex min-h-11 items-center underline underline-offset-4 hover:text-ink">{t("intake.reset")}</button>
            </div>
            {showReset && (
              <div className="sheet px-4 py-4 text-sm">
                <p className="text-ink-2 leading-snug">{t("intake.resetConfirm")}</p>
                <div className="mt-3 flex gap-2">
                  <Button onClick={reset} size="sm" variant="secondary">{t("g.confirm")}</Button>
                  <Button onClick={() => setShowReset(false)} size="sm" variant="ghost">{t("g.cancel")}</Button>
                </div>
              </div>
            )}
          </aside>
          )}
        </div>
      </Frame>
    </div>
  );
}

/**
 * The page body, or a plain block when this interview is embedded in a page
 * that already has one. Two <main> elements on a document give the skip link
 * two targets and a screen reader two landmarks named the same thing.
 */
function Frame({ lockChannel, children }: { lockChannel?: IntakeChannel; children: React.ReactNode }) {
  if (lockChannel) return <div className="min-w-0">{children}</div>;
  return <main id="main" className="mx-auto max-w-6xl px-4 sm:px-8 py-8 sm:py-12">{children}</main>;
}

function StepControls({
  step, draft, patch, answer, t, busy, error, analyse, evidenceChoice, openCase,
  detail, detailValue, setDetailValue, saveDetail, passDetail, passAllDetails, openStatePicker, editing,
}: {
  step: ReturnType<typeof nextIntakeStep>;
  draft: IntakeDraft;
  patch: (p: Partial<IntakeDraft>) => void;
  answer: (p: Partial<IntakeDraft>, label: string) => void;
  t: T;
  busy: boolean;
  error: string | null;
  analyse: () => void;
  evidenceChoice: EvidenceKind[];
  openCase: () => void;
  detail?: DetailQuestion;
  detailValue: string;
  setDetailValue: (value: string) => void;
  saveDetail: () => void;
  passDetail: () => void;
  passAllDetails: () => void;
  openStatePicker: () => void;
  editing?: string | null;
}) {
  // WhatsApp draws every one of these as the bot's own reply buttons; the
  // browser chat draws chips and cards. The wording and the effect are shared.
  const wa = draft.channel === "whatsapp";

  if (step === "boundaries") {
    if (wa) {
      return (
        <Replies wa>
          <Reply wa primary onClick={() => answer({ acceptedBoundaries: true }, t("intake.boundaryCta"))}>
            {t("intake.boundaryCta")}
          </Reply>
        </Replies>
      );
    }
    return (
      <ActionCard>
        <p className="text-[0.9375rem] leading-[1.6] text-ink-2">{t("intake.boundaryBody")}</p>
        <details className="mt-3 text-sm text-ink-3">
          <summary className="cursor-pointer underline underline-offset-4">{t("g.aiNote")}</summary>
          <p className="mt-2 leading-[1.6]">{t("intake.boundaryDetails")}</p>
        </details>
        <Button onClick={() => answer({ acceptedBoundaries: true }, t("intake.boundaryCta"))} size="md" className="mt-5">{t("intake.boundaryCta")}</Button>
      </ActionCard>
    );
  }

  if (step === "safety") {
    const at = () => new Date().toISOString();
    return (
      <Replies wa={wa}>
        <Reply wa={wa} onClick={() => answer({ safety: "safe" satisfies SafetyAnswer, safetyCheckedAt: at(), emergencyAcknowledged: false }, t("intake.safetySafe"))}>{t("intake.safetySafe")}</Reply>
        <Reply wa={wa} urgent onClick={() => answer({ safety: "danger" satisfies SafetyAnswer, safetyCheckedAt: at(), emergencyAcknowledged: false }, t("intake.safetyDanger"))}>{t("intake.safetyDanger")}</Reply>
        <Reply wa={wa} onClick={() => answer({ safety: "prefer-not" satisfies SafetyAnswer, safetyCheckedAt: at(), emergencyAcknowledged: false }, t("intake.preferNot"))}>{t("intake.preferNot")}</Reply>
      </Replies>
    );
  }

  if (step === "emergency") {
    if (wa) {
      return (
        <Replies wa>
          <Reply wa href="tel:112">{t("intake.emergencyCall")}</Reply>
          <Reply wa onClick={() => answer({ emergencyAcknowledged: true }, t("intake.emergencyContinue"))}>{t("intake.emergencyContinue")}</Reply>
        </Replies>
      );
    }
    return (
      <ActionCard urgent>
        <h2 className="!font-sans !text-lg !font-semibold !tracking-normal !leading-snug text-urgent-ink">{t("intake.emergencyH")}</h2>
        <p className="mt-2 text-[0.9375rem] leading-[1.6] text-urgent-ink/85">{t("intake.emergencyBody")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="tel:112" external variant="urgent" size="md">{t("intake.emergencyCall")}</Button>
          <Button onClick={() => answer({ emergencyAcknowledged: true }, t("intake.emergencyContinue"))} variant="secondary" size="md">{t("intake.emergencyContinue")}</Button>
        </div>
      </ActionCard>
    );
  }

  if (step === "age") {
    return (
      <Replies wa={wa}>
        <Reply wa={wa} onClick={() => answer({ childContext: "adult-or-no-child" satisfies ChildContext }, t("intake.ageAdult"))}>{t("intake.ageAdult")}</Reply>
        <Reply wa={wa} onClick={() => answer({ childContext: "self-minor" satisfies ChildContext }, t("intake.ageSelfMinor"))}>{t("intake.ageSelfMinor")}</Reply>
        <Reply wa={wa} onClick={() => answer({ childContext: "child-other" satisfies ChildContext }, t("intake.ageChildOther"))}>{t("intake.ageChildOther")}</Reply>
        <Reply wa={wa} onClick={() => answer({ childContext: "unknown" satisfies ChildContext }, t("intake.preferNot"))}>{t("intake.preferNot")}</Reply>
      </Replies>
    );
  }

  if (step === "child-safety") {
    if (wa) {
      return (
        <Replies wa>
          <Reply wa href="tel:1098">{t("intake.childCall")}</Reply>
          <Reply wa onClick={() => answer({ childSafetyAcknowledged: true }, t("intake.childContinue"))}>{t("intake.childContinue")}</Reply>
        </Replies>
      );
    }
    return (
      <ActionCard urgent>
        <h2 className="!font-sans !text-lg !font-semibold !tracking-normal !leading-snug text-urgent-ink">{t("intake.childH")}</h2>
        <p className="mt-2 text-[0.9375rem] leading-[1.6] text-urgent-ink/85">{t("intake.childBody")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="tel:1098" external variant="urgent" size="md">{t("intake.childCall")}</Button>
          <Button onClick={() => answer({ childSafetyAcknowledged: true }, t("intake.childContinue"))} variant="secondary" size="md">{t("intake.childContinue")}</Button>
        </div>
      </ActionCard>
    );
  }

  if (step === "money") {
    return (
      <Replies wa={wa}>
        <Reply wa={wa} onClick={() => answer({ moneyMoved: "yes" satisfies MoneyAnswer }, t("intake.moneyYes"))}>{t("intake.moneyYes")}</Reply>
        <Reply wa={wa} onClick={() => answer({ moneyMoved: "no" satisfies MoneyAnswer }, t("intake.moneyNo"))}>{t("intake.moneyNo")}</Reply>
        <Reply wa={wa} onClick={() => answer({ moneyMoved: "unsure" satisfies MoneyAnswer }, t("intake.notSure"))}>{t("intake.notSure")}</Reply>
      </Replies>
    );
  }

  if (step === "timing") {
    return (
      <Replies wa={wa}>
        <Reply wa={wa} urgent onClick={() => answer({ incidentTiming: "last-hour" satisfies IncidentTiming }, t("intake.timingHour"))}>{t("intake.timingHour")}</Reply>
        <Reply wa={wa} onClick={() => answer({ incidentTiming: "today" satisfies IncidentTiming }, t("intake.timingToday"))}>{t("intake.timingToday")}</Reply>
        <Reply wa={wa} onClick={() => answer({ incidentTiming: "older" satisfies IncidentTiming }, t("intake.timingOlder"))}>{t("intake.timingOlder")}</Reply>
        <Reply wa={wa} onClick={() => answer({ incidentTiming: "unsure" satisfies IncidentTiming }, t("intake.notSure"))}>{t("intake.notSure")}</Reply>
      </Replies>
    );
  }

  if (step === "story") {
    if (draft.channel === "whatsapp") {
      return (
        <>
          <WhatsAppInput
            value={draft.narrative}
            onChange={(narrative) => patch({ narrative, analysis: undefined, analysisConfirmed: false })}
            onSend={analyse}
            placeholder={t("intake.waTypeHint")}
            ariaLabel={t("intake.storyQ")}
          />
          {error && <p role="alert" className="mt-1 text-xs text-urgent-ink">{error}</p>}
        </>
      );
    }
    // The same surface as the front door: one microphone that stays put, one
    // panel that fills up beside it. Somebody who arrives here having already
    // spoken should not meet a different way of speaking.
    return (
      <>
        <VoiceComposer
          value={draft.narrative}
          onChange={(narrative) => patch({ narrative, analysis: undefined, analysisConfirmed: false })}
          onSubmit={analyse}
          submitLabel={t("intake.storyCta")}
          busy={busy}
        />
        {error && <p role="alert" className="mt-3 text-sm text-urgent-ink">{error}</p>}
      </>
    );
  }

  if (step === "verify" && draft.analysis) {
    const triage = draft.analysis.triage;
    const category = findCategory(triage.categoryId);
    if (wa) {
      return (
        <Replies wa>
          <Reply wa primary onClick={() => answer({ analysisConfirmed: true }, t("intake.verifyConfirm"))}>
            {t("intake.verifyConfirm")}
          </Reply>
        </Replies>
      );
    }
    // The form itself lives in the case brief beside the chat, where it stays
    // on screen and keeps updating as the interview goes on. Reading it back
    // inside a bubble and then asking to confirm in the same bubble made the
    // conversation stop dead on a page-tall form.
    return (
      <ActionCard>
        <div className="flex items-center justify-between gap-3">
          <p className="label">{t("intake.verifySub")}</p>
          <span className="text-xs text-ink-3 rounded-full border border-rule px-2 py-1">
            {draft.analysis.source === "vaani"
              ? t("intake.sourceCall")
              : draft.analysis.source === "openai"
                ? t("intake.sourceModel")
                : t("intake.sourceRules")}
          </span>
        </div>
        <p className="mt-3 text-[0.9375rem] leading-[1.55]">
          {category?.label ?? t("intake.verifyCategory")}
          {triage.amount ? <> · <span className="num">{inr(triage.amount)}</span></> : null}
        </p>
        <p className="mt-2 text-sm leading-[1.55] text-ink-3">{t("intake.verifyWhere")}</p>
        <Button onClick={() => answer({ analysisConfirmed: true }, t("intake.verifyConfirm"))} size="md" className="mt-5" full>{t("intake.verifyConfirm")}</Button>
      </ActionCard>
    );
  }

  if (step === "rbi-initiation") {
    return (
      <Replies wa={wa}>
        <Reply wa={wa} onClick={() => answer({ transactionInitiation: "victim" satisfies RbiInitiation }, t("intake.rbiInitiatedMe"))}>{t("intake.rbiInitiatedMe")}</Reply>
        <Reply wa={wa} onClick={() => answer({ transactionInitiation: "not-victim" satisfies RbiInitiation }, t("intake.rbiInitiatedNotMe"))}>{t("intake.rbiInitiatedNotMe")}</Reply>
        <Reply wa={wa} onClick={() => answer({ transactionInitiation: "unknown" satisfies RbiInitiation }, t("intake.notSure"))}>{t("intake.notSure")}</Reply>
      </Replies>
    );
  }

  if (step === "rbi-credentials") {
    return (
      <Replies wa={wa}>
        <Reply wa={wa} onClick={() => answer({ credentialsShared: "yes" satisfies RbiYesNoUnknown }, t("intake.rbiCredentialYes"))}>{t("intake.rbiCredentialYes")}</Reply>
        <Reply wa={wa} onClick={() => answer({ credentialsShared: "no" satisfies RbiYesNoUnknown }, t("intake.rbiCredentialNo"))}>{t("intake.rbiCredentialNo")}</Reply>
        <Reply wa={wa} onClick={() => answer({ credentialsShared: "unknown" satisfies RbiYesNoUnknown }, t("intake.notSure"))}>{t("intake.notSure")}</Reply>
      </Replies>
    );
  }

  if (step === "rbi-bank-fault") {
    return (
      <Replies wa={wa}>
        <Reply wa={wa} onClick={() => answer({ suspectedBankFault: "yes" satisfies RbiYesNoUnknown }, t("intake.rbiBankFaultYes"))}>{t("intake.rbiBankFaultYes")}</Reply>
        <Reply wa={wa} onClick={() => answer({ suspectedBankFault: "no" satisfies RbiYesNoUnknown }, t("intake.rbiBankFaultNo"))}>{t("intake.rbiBankFaultNo")}</Reply>
        <Reply wa={wa} onClick={() => answer({ suspectedBankFault: "unknown" satisfies RbiYesNoUnknown }, t("intake.notSure"))}>{t("intake.notSure")}</Reply>
      </Replies>
    );
  }

  if (step === "rbi-report-timing") {
    return (
      <Replies wa={wa}>
        <Reply wa={wa} onClick={() => answer({ bankReportTiming: "within_3_working_days" satisfies RbiReportTiming }, t("intake.rbiReportThree"))}>{t("intake.rbiReportThree")}</Reply>
        <Reply wa={wa} onClick={() => answer({ bankReportTiming: "four_to_seven_working_days" satisfies RbiReportTiming }, t("intake.rbiReportSeven"))}>{t("intake.rbiReportSeven")}</Reply>
        <Reply wa={wa} onClick={() => answer({ bankReportTiming: "after_7_working_days" satisfies RbiReportTiming }, t("intake.rbiReportAfter"))}>{t("intake.rbiReportAfter")}</Reply>
        <Reply wa={wa} urgent onClick={() => answer({ bankReportTiming: "not_reported" satisfies RbiReportTiming }, t("intake.rbiReportNo"))}>{t("intake.rbiReportNo")}</Reply>
        <Reply wa={wa} onClick={() => answer({ bankReportTiming: "unknown" satisfies RbiReportTiming }, t("intake.notSure"))}>{t("intake.notSure")}</Reply>
      </Replies>
    );
  }

  if (step === "rbi-review") {
    const input = rbiInputFromDraft(draft);
    if (!input) return null;
    if (wa) {
      // The screening itself is read in the conversation, as a message from the
      // assistant; only the acknowledgement is a button.
      return (
        <Replies wa>
          <Reply wa href={assessRbiEligibility(input).source.readableUrl}>{t("intake.rbiSource")}</Reply>
          <Reply wa primary onClick={() => answer({ rbiAssessmentReviewed: true }, t("intake.rbiContinue"))}>
            {t("intake.rbiContinue")}
          </Reply>
        </Replies>
      );
    }
    return (
      <RbiReviewCard assessment={assessRbiEligibility(input)} t={t}>
        <Button onClick={() => answer({ rbiAssessmentReviewed: true }, t("intake.rbiContinue"))} size="md" className="mt-5" full>
          {t("intake.rbiContinue")}
        </Button>
      </RbiReviewCard>
    );
  }

  if (step === "evidence") {
    const toggle = (kind: EvidenceKind) => {
      const next = kind === "none"
        ? (evidenceChoice.includes("none") ? [] : ["none"] satisfies EvidenceKind[])
        : evidenceChoice
          .filter((item) => item !== "none")
          .filter((item) => item !== kind)
          .concat(evidenceChoice.includes(kind) ? [] : [kind]);
      patch({ pendingEvidence: next });
    };
    const saveLabel = evidenceChoice.length && !evidenceChoice.includes("none")
      ? `${evidenceChoice.length} ${t("intake.summaryEvidence").toLowerCase()}`
      : t("intake.evNone");
    if (wa) {
      // A multiple-choice question on WhatsApp is a stack of reply buttons that
      // stay lit once tapped, with the confirmation at the bottom — the same
      // shape a poll takes there.
      return (
        <Replies wa>
          {EVIDENCE_OPTIONS.map((item) => (
            <Reply key={item.id} wa selected={evidenceChoice.includes(item.id)} onClick={() => toggle(item.id)}>
              {t(item.key)}
            </Reply>
          ))}
          <Reply wa selected={evidenceChoice.includes("none")} onClick={() => toggle("none")}>{t("intake.evNone")}</Reply>
          <Reply
            wa
            primary
            onClick={() => answer(
              { evidence: evidenceChoice.length ? evidenceChoice : ["none"], pendingEvidence: undefined },
              saveLabel,
            )}
          >
            {t("intake.evidenceCta")}
          </Reply>
        </Replies>
      );
    }
    return (
      <ActionCard>
        <div className="grid sm:grid-cols-2 gap-2">
          {EVIDENCE_OPTIONS.map((item) => (
            <Choice key={item.id} active={evidenceChoice.includes(item.id)} onClick={() => toggle(item.id)}>{t(item.key)}</Choice>
          ))}
          <Choice active={evidenceChoice.includes("none")} onClick={() => toggle("none")}>{t("intake.evNone")}</Choice>
        </div>
        <Button
          onClick={() => answer(
            { evidence: evidenceChoice.length ? evidenceChoice : ["none"], pendingEvidence: undefined },
            evidenceChoice.length && !evidenceChoice.includes("none")
              ? `${evidenceChoice.length} ${t("intake.summaryEvidence").toLowerCase()}`
              : t("intake.evNone"),
          )}
          size="md"
          className="mt-5"
          full
        >{t("intake.evidenceCta")}</Button>
      </ActionCard>
    );
  }

  if (step === "routing") {
    if (wa) {
      // Thirty-six states are not reply buttons. WhatsApp's own answer to a
      // long list is a sheet over the conversation, so that is what this opens;
      // the district is then simply typed, in the box that is already there.
      return (
        <Replies wa>
          <Reply wa onClick={openStatePicker}>
            {draft.state ? `${draft.state} ✓` : t("intake.state")}
          </Reply>
          {draft.state && (
            <Reply
              wa
              primary
              onClick={() => answer({ routingAnswered: true }, [draft.district, draft.state].filter(Boolean).join(", "))}
            >
              {t("intake.routingCta")}
            </Reply>
          )}
          <Reply wa onClick={() => answer({ routingAnswered: true }, t("intake.routingSkip"))}>
            {t("intake.routingSkip")}
          </Reply>
        </Replies>
      );
    }
    return (
      <ActionCard>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm text-ink-2">{t("intake.state")}</span>
            <select
              value={draft.state || ""}
              onChange={(e) => patch({ state: e.target.value || undefined })}
              className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl focus:outline-none focus:border-ink"
            >
              <option value="">—</option>
              {OFFICERS.map((item) => <option key={item.state} value={item.state}>{item.state}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm text-ink-2">{t("intake.district")}</span>
            <input
              value={draft.district || ""}
              onChange={(e) => patch({ district: e.target.value })}
              className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl focus:outline-none focus:border-ink"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <Button onClick={() => answer({ routingAnswered: true }, [draft.district, draft.state].filter(Boolean).join(", "))} disabled={!draft.state} size="md" className="flex-1">{t("intake.routingCta")}</Button>
          <Button onClick={() => answer({ routingAnswered: true }, t("intake.routingSkip"))} variant="secondary" size="md">{t("intake.routingSkip")}</Button>
        </div>
      </ActionCard>
    );
  }

  if (detail && (step === "details" || step === "name" || editing)) {
    const progress = detailProgress(draft);
    const ready = isDetailAnswer(detail, detailValue);
    const dictatable = detail.kind !== "datetime";

    if (draft.channel === "whatsapp") {
      // On the phone the field belongs on the composer strip, where that app
      // puts everything you can do. The question itself is already a bubble.
      return (
        <DetailField
          question={detail}
          value={detailValue}
          onChange={setDetailValue}
          onSubmit={saveDetail}
          chrome="whatsapp"
          t={t}
        />
      );
    }

    const asked = progress.total - progress.known;
    const done = Math.max(0, progress.position - 1);
    // The name was the last thing put to them, so this is the first card they
    // see after giving it.
    const askedIds = draft.detailsAsked ?? [];
    const justNamed = Boolean(draft.callerName) && askedIds[askedIds.length - 1] === "name";

    return (
      <ActionCard>
        {/* A meter and a count, so a question does not feel like the first of
            an unknown number of them. */}
        {!editing && step !== "name" && asked > 0 && (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="label">
                {t("detail.counter")} <span className="num">{progress.position}</span> {t("detail.of")} <span className="num">{asked}</span>
              </p>
              {progress.known > 0 && (
                <p className="text-xs text-ink-3">
                  <span className="num">{progress.known}</span> {t("detail.knownAlready")}
                </p>
              )}
            </div>
            <div
              className="mt-2.5 h-1 rounded-full bg-sunk overflow-hidden"
              role="progressbar"
              aria-valuenow={done}
              aria-valuemin={0}
              aria-valuemax={asked}
            >
              <div
                className="h-full rounded-full bg-done transition-[width] duration-300"
                style={{ width: `${Math.round((done / asked) * 100)}%` }}
              />
            </div>
          </>
        )}

        {editing && (
          <p className="label !text-info">{t("detail.correcting")}</p>
        )}
        {justNamed && !editing && (
          <p className="mt-4 text-[0.9375rem] font-medium text-done">
            {t("intake.thankYou")}, {firstName(draft.callerName ?? "")}.
          </p>
        )}
        <h2 className={cn(
          "!font-sans !text-[1.375rem] !font-semibold !tracking-[-0.01em] !leading-[1.3]",
          justNamed ? "mt-1" : "mt-4",
        )}>
          {t(detail.question)}
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-[1.55] text-ink-2">{t(detail.why)}</p>

        {/* Where the thing actually lives. Somebody who does not know that the
            UTR is the long number in the bank's SMS does not abandon the form
            because they are unwilling — they abandon it because they have been
            asked for something they cannot find. */}
        {detail.where && (
          <p className="mt-3.5 flex gap-2.5 rounded-ctl bg-sunk px-3 py-2.5 text-sm leading-[1.5] text-ink-2">
            <span className="shrink-0 text-ink-3" aria-hidden><FindIcon /></span>
            <span>{t(detail.where)}</span>
          </p>
        )}

        <div className="mt-4 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <DetailField
              question={detail}
              value={detailValue}
              onChange={setDetailValue}
              onSubmit={saveDetail}
              chrome="page"
              t={t}
            />
          </div>
          {dictatable && (
            <VoiceInput
              variant="compact"
              onResult={(chunk) => setDetailValue([detailValue.trim(), chunk].filter(Boolean).join(" "))}
            />
          )}
        </div>

        <Button onClick={saveDetail} disabled={!ready} size="lg" className="mt-4" full>
          {editing ? t("detail.saveChange") : t("detail.next")}
        </Button>

        {/* Passing is a choice, not an equal option: it stays available and
            stops competing with the answer for attention. */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5">
          <button
            type="button"
            onClick={passDetail}
            className="inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 hover:text-ink"
          >
            {editing ? t("g.cancel") : t("detail.skip")}
          </button>
          {!editing && progress.remaining > 1 && (
            <button
              type="button"
              onClick={passAllDetails}
              className="inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 hover:text-ink"
            >
              {t("detail.skipAll")}
            </button>
          )}
        </div>
      </ActionCard>
    );
  }

  if (step === "ready") {
    if (wa) {
      return (
        <>
          <Replies wa>
            <Reply wa primary onClick={openCase}>{t("intake.readyCta")}</Reply>
          </Replies>
          {error && <p role="alert" className="mt-2 text-xs text-urgent-ink">{error}</p>}
        </>
      );
    }
    return (
      <ActionCard>
        <p className="text-[0.9375rem] leading-[1.6] text-ink-2">{t("intake.readyBody")}</p>
        {error && <p role="alert" className="mt-3 text-sm text-urgent-ink">{error}</p>}
        <Button onClick={openCase} size="lg" className="mt-5" full>{t("intake.readyCta")}</Button>
      </ActionCard>
    );
  }

  return null;
}

/**
 * One run of follow-up questions, written into the conversation.
 *
 * Returns true when the run is still going, which means the caller has nothing
 * further to say yet. Only what was actually put to the person is quoted back:
 * a fact the call or the model supplied was never a question, and showing it as
 * one would put words in their mouth.
 */
function askDetails(
  draft: IntakeDraft,
  t: T,
  messages: Message[],
  phase: DetailPhase,
  intro: string,
): boolean {
  if (!detailsForCase(draft, phase).length) return false;
  messages.push({ role: "agent", text: intro });
  for (const { question, answer } of askedDetails(draft, phase)) {
    messages.push({ role: "agent", text: t(question.question), promptId: `detail:${question.id}` });
    messages.push({
      role: "user",
      text: answer ? detailAnswerText(question, answer) : t("detail.skipped"),
    });
  }
  const pending = nextDetail(draft, phase);
  if (!pending) return false;
  messages.push({
    role: "agent",
    text: `${t(pending.question)}\n${t(pending.why)}`,
    promptId: `detail:${pending.id}`,
  });
  return true;
}

/**
 * The conversation, rebuilt from the answers rather than accumulated.
 *
 * `wa` is not cosmetic. On the web a step can put its explanation on a card
 * under the chat; WhatsApp has no cards, only messages, so anything a person
 * needs in order to answer has to be said in the conversation itself. Passing
 * the channel here is what stops the WhatsApp view from quietly dropping the
 * boundary text, the RBI screening, or what the assistant understood.
 */
function buildMessages(draft: IntakeDraft, t: T, now = new Date(), wa = false): Message[] {
  const say = (...parts: (string | undefined)[]) => parts.filter(Boolean).join("\n\n");
  const messages: Message[] = [{
    role: "agent",
    text: wa ? say(t("intake.boundaryQ"), t("intake.boundaryBody")) : t("intake.boundaryQ"),
    promptId: "boundaries",
  }];
  if (!draft.acceptedBoundaries) return messages;
  messages.push({ role: "user", text: t("intake.boundaryCta") });
  messages.push({ role: "agent", text: t("intake.safetyQ"), promptId: "safety" });
  if (!hasCurrentSafetyAnswer(draft, now) || !draft.safety) return messages;
  messages.push({ role: "user", text: safetyLabel(draft.safety, t) });
  if (draft.safety === "danger") {
    messages.push({ role: "agent", text: `${t("intake.emergencyH")} ${t("intake.emergencyBody")}`, urgent: true, promptId: "emergency" });
    if (!draft.emergencyAcknowledged) return messages;
    messages.push({ role: "user", text: t("intake.emergencyContinue") });
  }
  messages.push({ role: "agent", text: t("intake.ageQ"), promptId: "age" });
  if (!draft.childContext) return messages;
  messages.push({ role: "user", text: childContextLabel(draft.childContext, t) });
  if (draft.childContext === "self-minor" || draft.childContext === "child-other") {
    messages.push({ role: "agent", text: `${t("intake.childH")} ${t("intake.childBody")}`, urgent: true, promptId: "child-safety" });
    if (!draft.childSafetyAcknowledged) return messages;
    messages.push({ role: "user", text: t("intake.childContinue") });
  }
  messages.push({ role: "agent", text: t("intake.moneyQ"), promptId: "money" });
  if (!draft.moneyMoved) return messages;
  messages.push({ role: "user", text: moneyLabel(draft.moneyMoved, t) });
  if (draft.moneyMoved === "yes") {
    messages.push({ role: "agent", text: t("intake.timingQ"), promptId: "timing" });
    if (!draft.incidentTiming) return messages;
    messages.push({ role: "user", text: timingChoiceLabel(draft.incidentTiming, t) });
  }
  // Who we are talking to, before what happened to them.
  messages.push({
    role: "agent",
    text: `${t(NAME_QUESTION.question)}\n${t(NAME_QUESTION.why)}`,
    promptId: "name",
  });
  if (!nameAnswered(draft)) return messages;
  const called = draft.callerName?.trim();
  messages.push({ role: "user", text: called || t("detail.skipped") });
  if (called) messages.push({ role: "agent", text: `${t("intake.thankYou")}, ${firstName(called)}.` });

  // The rest of the contact details, one at a time, filling the form as they go.
  if (askDetails(draft, t, messages, "intro", t("detail.introYou"))) return messages;

  messages.push({ role: "agent", text: t("intake.storyQ"), promptId: "story" });
  if (draft.narrative.trim().length < 25 || !draft.analysis) return messages;
  messages.push({ role: "user", text: draft.narrative.trim() });
  messages.push({
    role: "agent",
    text: wa
      ? say(
        t("intake.verifyQ"),
        [
          findCategory(draft.analysis.triage.categoryId)?.label,
          draft.analysis.triage.amount ? inr(draft.analysis.triage.amount) : undefined,
        ].filter(Boolean).join(" · "),
        t("intake.verifyWhere"),
      )
      : t("intake.verifyQ"),
    promptId: "verify",
  });
  if (!draft.analysisConfirmed) return messages;
  messages.push({ role: "user", text: t("intake.verifyConfirm") });

  // And the rest of the follow-ups, now that the story has been read.
  if (askDetails(draft, t, messages, "case", `${t("detail.intro")} ${t("detail.introOptional")}`)) {
    return messages;
  }
  if (draft.moneyMoved === "yes") {
    messages.push({ role: "agent", text: t("intake.rbiInitiationQ"), promptId: "rbi-initiation" });
    if (!draft.transactionInitiation) return messages;
    messages.push({ role: "user", text: rbiInitiationLabel(draft.transactionInitiation, t) });
    if (draft.transactionInitiation === "not-victim") {
      messages.push({ role: "agent", text: t("intake.rbiCredentialQ"), promptId: "rbi-credentials" });
      if (!draft.credentialsShared) return messages;
      messages.push({ role: "user", text: yesNoUnknownLabel(draft.credentialsShared, t, "intake.rbiCredentialYes", "intake.rbiCredentialNo") });
      messages.push({ role: "agent", text: t("intake.rbiBankFaultQ"), promptId: "rbi-bank-fault" });
      if (!draft.suspectedBankFault) return messages;
      messages.push({ role: "user", text: yesNoUnknownLabel(draft.suspectedBankFault, t, "intake.rbiBankFaultYes", "intake.rbiBankFaultNo") });
      messages.push({ role: "agent", text: t("intake.rbiReportQ"), promptId: "rbi-report" });
      if (!draft.bankReportTiming) return messages;
      messages.push({ role: "user", text: rbiReportTimingLabel(draft.bankReportTiming, t) });
    }
    const rbiInput = wa ? rbiInputFromDraft(draft) : undefined;
    const screening = rbiInput ? assessRbiEligibility(rbiInput) : undefined;
    messages.push({
      role: "agent",
      text: screening
        ? say(
          t("intake.rbiReviewQ"),
          rbiProtectionLabel(screening, t),
          screening.reasons.slice(0, 3).map((reason) => `• ${reason}`).join("\n"),
          t("intake.rbiDisclaimer"),
        )
        : t("intake.rbiReviewQ"),
      promptId: "rbi-review",
    });
    if (!draft.rbiAssessmentReviewed) return messages;
    messages.push({ role: "user", text: t("intake.rbiContinue") });
  }
  messages.push({ role: "agent", text: `${t("intake.evidenceQ")} ${t("intake.evidenceSub")}`, promptId: "evidence" });
  if (draft.evidence === undefined) return messages;
  messages.push({ role: "user", text: draft.evidence.includes("none") ? t("intake.evNone") : `${draft.evidence.length} ${t("intake.summaryEvidence").toLowerCase()}` });
  messages.push({ role: "agent", text: `${t("intake.routingQ")} ${t("intake.routingSub")}`, promptId: "routing" });
  if (!draft.routingAnswered) return messages;
  messages.push({ role: "user", text: [draft.district, draft.state].filter(Boolean).join(", ") || t("intake.routingSkip") });


  messages.push({
    role: "agent",
    text: wa ? say(t("intake.readyQ"), t("intake.readyBody")) : t("intake.readyQ"),
    promptId: "ready",
  });
  return messages;
}

/**
 * A text box on the form that only writes when you leave it.
 *
 * Committing on every keystroke would be correct and unusable: the chat's next
 * question is chosen from what the case is missing, so the first letter typed
 * here would answer the question being asked and move the conversation on
 * mid-word. Blur — or Enter — is the moment somebody means it.
 */
function FormCell({ value, onCommit, label, kind, placeholder }: {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  kind: DetailKind;
  placeholder?: string;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const shown = typed ?? value;
  const commit = () => {
    setTyped(null);
    if (typed !== null && typed.trim() !== value.trim()) onCommit(typed);
  };
  const box = "w-full bg-raised border rounded-ctl text-sm focus:outline-none focus:border-ink";
  const filled = value.trim().length > 0;
  const border = filled ? "border-done/40" : "border-rule-strong";

  if (kind === "textarea") {
    return (
      <textarea
        value={shown}
        rows={2}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => setTyped(event.target.value)}
        onBlur={commit}
        className={cn(box, border, "px-3 py-2 leading-[1.5] resize-y")}
      />
    );
  }
  return (
    <input
      type={kind === "datetime" ? "datetime-local" : kind === "email" ? "email" : kind === "tel" ? "tel" : "text"}
      value={kind === "datetime" ? localDateTimeValue(shown) || shown : shown}
      aria-label={label}
      placeholder={placeholder}
      onChange={(event) => setTyped(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        (event.target as HTMLInputElement).blur();
      }}
      className={cn(box, border, "h-11 px-3", kind === "datetime" || kind === "amount" ? "num" : "")}
    />
  );
}

/**
 * The case file, filling in beside the conversation.
 *
 * Everything the interview collects is here, in one place, editable, from the
 * first message onwards. Two things follow from that, and both are the point:
 * somebody can watch their case being built instead of trusting that it is, and
 * anybody who would rather fill a form than answer questions can simply do it —
 * a box filled here is a question the chat then does not ask, because the chat
 * asks for what the case is missing and nothing else.
 *
 * It is deliberately not a summary. A summary would be a second, slightly wrong
 * copy of the case; this is the case.
 */
/**
 * What we have so far.
 *
 * The questions page used to end in a disclosure holding nineteen input boxes,
 * most of them empty — the pile the interview exists to replace, folded up and
 * put at the bottom of the page that replaces it.
 *
 * This shows only what has actually been given, as plain text, growing by a
 * line each time somebody answers. It is the reason anybody answers the
 * nineteenth question: you can see the thing being built. Correcting a fact is
 * a job for the case file at the end, where there is room for it, rather than a
 * second editable copy of the interview competing with the question on screen.
 */
function AnsweredSoFar({ draft, onEdit, t }: {
  draft: IntakeDraft;
  /** Reopens a question with what is already in it. */
  onEdit: (id: string) => void;
  t: T;
}) {
  const questions = detailsForCase(draft);
  const answered = questions
    .map((question) => ({ question, value: question.read(draft) }))
    .filter((row) => row.value);
  const category = findCategory(draft.analysis?.triage.categoryId);
  const pct = questions.length ? Math.round((answered.length / questions.length) * 100) : 0;

  return (
    <section className="sheet px-4 py-4 sm:px-5" aria-label={t("detail.formH")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="label">{t("detail.formH")}</p>
        <span className="num text-sm text-ink-3">{answered.length}/{questions.length}</span>
      </div>
      <div
        className="mt-2.5 h-1.5 rounded-full bg-sunk overflow-hidden"
        role="progressbar"
        aria-label={t("detail.formH")}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-done transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      <dl className="mt-3 divide-y divide-rule">
        {category && (
          <Fact label={t("intake.verifyCategory")} value={category.label} />
        )}
        {answered.map(({ question, value }) => (
          <Fact
            key={question.id}
            label={t(question.label)}
            value={question.format ? question.format(value) : value}
            onEdit={() => onEdit(question.id)}
            editLabel={t("detail.change")}
          />
        ))}
      </dl>

      {!answered.length && !category && (
        <p className="mt-3 text-sm leading-[1.5] text-ink-3">{t("detail.formEmptyYet")}</p>
      )}
    </section>
  );
}

/**
 * One fact, and the way back to the question that produced it.
 *
 * The whole row is the target rather than a small pencil at the end of it: on a
 * phone the row is the only thing big enough to hit without aiming, and this is
 * the only route back to an answer — including the amount, which the model
 * filled in from the story and was therefore never asked at all.
 */
function Fact({ label, value, onEdit, editLabel }: {
  label: string;
  value: string;
  onEdit?: () => void;
  editLabel?: string;
}) {
  const body = (
    <>
      <dt className="text-sm text-ink-3 shrink-0">{label}</dt>
      <dd className="text-[0.9375rem] min-w-0 break-words sm:text-end">{value}</dd>
    </>
  );
  if (!onEdit) {
    return (
      <div className="py-2.5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        {body}
      </div>
    );
  }
  return (
    <div className="group">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${editLabel}: ${label}`}
        className="w-full min-h-11 py-2.5 flex flex-col gap-0.5 text-start sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
      >
        {body}
        <span className="shrink-0 text-xs text-ink-3 underline underline-offset-4 sm:ms-2">
          {editLabel}
        </span>
      </button>
    </div>
  );
}

function CaseForm({ draft, patch, updateTriage, updateEntity, asking, bare, t }: {
  /** Inside a disclosure that already names it and counts it. */
  bare?: boolean;
  draft: IntakeDraft;
  patch: (p: Partial<IntakeDraft>) => void;
  updateTriage: (p: Partial<Triage>) => void;
  updateEntity: (field: EntityArrayKey, index: number, value?: string) => void;
  /** The question the chat is on, so the form can point at the same box. */
  asking?: string;
  t: T;
}) {
  const analysis = draft.analysis;
  const category = findCategory(analysis?.triage.categoryId);
  const questions = detailsForCase(draft);
  const filled = questions.filter((question) => question.read(draft)).length;
  // Identifiers beyond the first of each kind: the first is a named box above,
  // and this is everything else the story turned up.
  const extras = analysis
    ? entityItems(analysis.entities).filter((item) => item.index > 0)
    : [];

  return (
    <section
      className={bare ? "" : "sheet px-4 py-4 sm:px-5 sm:py-5"}
      aria-label={t("detail.formH")}
    >
      {/* The disclosure around it already carries the name and the count; a
          second copy of both was the first thing inside it. */}
      {!bare && (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="label">{t("detail.formH")}</p>
            <span className="num text-sm text-ink-3">{filled}/{questions.length}</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-sunk overflow-hidden" role="progressbar" aria-label={t("detail.formH")} aria-valuenow={questions.length ? Math.round((filled / questions.length) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-done transition-[width] duration-300" style={{ width: `${questions.length ? (filled / questions.length) * 100 : 0}%` }} />
          </div>
        </>
      )}
      <p className={cn("text-xs leading-[1.5] text-ink-3", bare ? "" : "mt-2.5")}>{t("detail.formSub")}</p>

      {analysis && (
        <div className="mt-5 space-y-3.5 border-t border-rule pt-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">{t("intake.reviewH")}</p>
            <span className="shrink-0 text-[0.6875rem] text-ink-3 rounded-full border border-rule px-2 py-0.5">
              {analysis.source === "vaani"
                ? t("intake.sourceCall")
                : analysis.source === "openai"
                  ? t("intake.sourceModel")
                  : t("intake.sourceRules")}
            </span>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-2">{t("intake.verifyCategory")}</span>
            <select
              value={analysis.triage.categoryId}
              onChange={(e) => updateTriage({ categoryId: e.target.value, subcategoryId: undefined })}
              className="w-full h-11 px-3 bg-raised border border-done/40 rounded-ctl text-sm focus:outline-none focus:border-ink"
            >
              {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-2">{t("intake.verifySubcategory")}</span>
            <select
              value={analysis.triage.subcategoryId || ""}
              onChange={(e) => updateTriage({ subcategoryId: e.target.value || undefined })}
              className={cn(
                "w-full h-11 px-3 bg-raised border rounded-ctl text-sm focus:outline-none focus:border-ink",
                analysis.triage.subcategoryId ? "border-done/40" : "border-rule-strong",
              )}
            >
              <option value="">—</option>
              {category?.subcategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {DETAIL_GROUPS.map((group) => {
        const rows = questions.filter((question) => question.group === group.id);
        if (!rows.length) return null;
        return (
          <div key={group.id} className="mt-5 border-t border-rule pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">{t(group.label)}</p>
            <div className="mt-3 space-y-3">
              {rows.map((question) => (
                <label key={question.id} className="block space-y-1.5">
                  <span className="flex items-baseline gap-2 text-xs text-ink-2">
                    {t(question.label)}
                    {asking === question.id && (
                      <span className="rounded-full bg-wait-soft px-1.5 py-0.5 text-[0.625rem] font-semibold text-wait-ink">
                        {t("detail.asking")}
                      </span>
                    )}
                  </span>
                  <FormCell
                    value={question.read(draft)}
                    onCommit={(value) => patch(question.write(value, draft))}
                    label={t(question.label)}
                    kind={question.kind}
                    placeholder={t(question.placeholder)}
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <div className="mt-5 border-t border-rule pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">{t("intake.summaryRoute")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-2">{t("intake.state")}</span>
            <select
              value={draft.state || ""}
              onChange={(e) => patch({ state: e.target.value || undefined })}
              className={cn(
                "w-full h-11 px-2 bg-raised border rounded-ctl text-sm focus:outline-none focus:border-ink",
                draft.state ? "border-done/40" : "border-rule-strong",
              )}
            >
              <option value="">—</option>
              {OFFICERS.map((item) => <option key={item.state} value={item.state}>{item.state}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-2">{t("intake.district")}</span>
            <FormCell
              value={draft.district || ""}
              onCommit={(value) => patch({ district: value.trim() || undefined })}
              label={t("intake.district")}
              kind="text"
            />
          </label>
        </div>
      </div>

      {extras.length > 0 && (
        <div className="mt-5 border-t border-rule pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">{t("intake.verifyFound")}</p>
          <div className="mt-3 grid gap-1.5">
            {extras.map((item) => (
              <div key={`${item.field}-${item.index}`} className="flex items-center gap-2">
                <input
                  value={item.value}
                  onChange={(event) => updateEntity(item.field, item.index, event.target.value)}
                  aria-label={`${t("intake.verifyFound")}: ${item.value}`}
                  className="num min-w-0 flex-1 rounded-ctl border border-rule bg-sunk px-2.5 py-2 text-xs focus:outline-none focus:border-ink"
                />
                <button
                  type="button"
                  onClick={() => updateEntity(item.field, item.index)}
                  aria-label={`${t("rep.remove")}: ${item.value}`}
                  className="shrink-0 text-xs underline underline-offset-4 text-ink-3 hover:text-ink"
                >
                  {t("rep.remove")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function RbiReviewCard({ assessment, t, children }: { assessment: RbiEligibilityAssessment; t: T; children?: React.ReactNode }) {
  const isApplicable = assessment.protection !== "not_applicable";
  return (
    <ActionCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label">{t("intake.rbiCardEyebrow")}</p>
          <h2 className="mt-2 !font-sans !text-xl !font-semibold !tracking-normal !leading-snug">
            {rbiProtectionLabel(assessment, t)}
          </h2>
        </div>
        <span className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-semibold",
          isApplicable ? "border-info/25 bg-info-soft text-info" : "border-rule bg-sunk text-ink-3",
        )}>
          {t("intake.rbiScreenOnly")}
        </span>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-[1.55] text-ink-2">
        {assessment.reasons.slice(0, 3).map((reason) => (
          <li key={reason} className="flex gap-2"><span aria-hidden>•</span><span>{reason}</span></li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-[1.55] text-ink-3">{t("intake.rbiDisclaimer")}</p>
      <a
        href={assessment.source.readableUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
      >
        {t("intake.rbiSource")} ↗
      </a>
      {children}
    </ActionCard>
  );
}

/**
 * The explainer's shape without the explaining, for a page that already did it.
 *
 * The body is not dropped, only folded. It is the notice that this is an AI and
 * not the police, and that the call is recorded — which is exactly the thing a
 * product should not quietly stop saying because the page looked busy.
 */
function BarePanel({ body, summary, children }: { title?: string; body?: string; summary?: string; tone?: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      {body && (
        <details className="mt-3">
          <summary className="inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 cursor-pointer hover:text-ink">
            {summary}
          </summary>
          <p className="mt-1 text-sm leading-[1.6] text-ink-2">{body}</p>
        </details>
      )}
    </div>
  );
}

function VaaniPanel({
  language,
  safetyAnswer,
  childContext,
  callerName,
  onCallFinished,
  onTranscript,
  onAccepted,
  bare,
  t,
}: {
  /** On a page that already introduces the call, the explainer is a second copy. */
  bare?: boolean;
  language: string;
  safetyAnswer?: string;
  childContext?: string;
  callerName?: string;
  /** Runs the moment the call ends: it opens the case, or hands back the words. */
  onCallFinished: (transcriptToken: string, signal: AbortSignal) => Promise<CallHandoff>;
  onTranscript: (text: string) => void;
  /** Called once the caller has approved their own words, with the capability
   *  that can fetch what the provider already extracted. */
  onAccepted: (transcriptToken: string | null) => void;
  t: T;
}) {
  const [restoredSession] = useState<StoredVaaniSession | null>(() => readStoredVaaniSession());
  const [state, setState] = useState<
    "idle" | "calling" | "requested" | "finishing" | "not-ready" | "reviewing" | "accepted" | "unknown" | "error"
  >(() => restoredVaaniUiState(restoredSession));
  const [transcriptToken, setTranscriptToken] = useState<string | null>(
    () => restoredSession?.transcriptToken ?? null,
  );
  const [stagedTranscript, setStagedTranscript] = useState("");
  const [fullTranscript, setFullTranscript] = useState("");
  const [reviewSource, setReviewSource] = useState<"sample" | "live" | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [slowHandoff, setSlowHandoff] = useState(false);
  const requestIdRef = useRef<string | null>(restoredSession?.requestId ?? null);
  const [browserVoice, setBrowserVoice] = useState<{ available: boolean; recordingRequired: boolean } | null>(null);

  // The live call captures its callbacks once, when the room opens, so anything
  // the end-of-call hand-off reads has to be a ref rather than a prop or state
  // from that render — otherwise it hangs up holding a token it was given a
  // moment later.
  const tokenRef = useRef<string | null>(restoredSession?.transcriptToken ?? null);
  const finishRef = useRef(onCallFinished);
  useEffect(() => { finishRef.current = onCallFinished; }, [onCallFinished]);
  const handoffRef = useRef<AbortController | null>(null);
  useEffect(() => () => handoffRef.current?.abort(), []);

  /**
   * The call ended; carry on without the caller.
   *
   * Both an agent hang-up and the stop button land here, and the room reports
   * the first as a disconnect after the second, so a run already in flight is
   * left alone rather than started twice.
   */
  const handleCallEnded = useCallback(async () => {
    if (handoffRef.current) return;
    const token = tokenRef.current;
    if (!token) {
      setState("requested");
      return;
    }
    const controller = new AbortController();
    handoffRef.current = controller;
    setSlowHandoff(false);
    setState("finishing");
    const slowTimer = globalThis.setTimeout(() => setSlowHandoff(true), 20_000);
    try {
      const result = await finishRef.current(token, controller.signal);
      if (result.ok) return; // The case page is already opening over this one.
      if (result.reason === "needs-review") {
        setStagedTranscript(result.victimTurns);
        setFullTranscript(result.transcript);
        setReviewSource("live");
        setState("reviewing");
        return;
      }
      setState("requested");
    } finally {
      globalThis.clearTimeout(slowTimer);
      handoffRef.current = null;
    }
  }, []);


  useEffect(() => {
    let active = true;
    fetch("/api/vaani/status")
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setBrowserVoice({
          available: Boolean(data?.browserSession?.available),
          recordingRequired: data?.recording?.consentRequired !== false,
        });
      })
      .catch(() => {
        if (!active) return;
        setBrowserVoice({ available: false, recordingRequired: true });
      });
    return () => { active = false; };
  }, []);




  const importCall = async () => {
    if (!transcriptToken) return;
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 15_000);
    try {
      setRetryAfter(null);
      const response = await fetch("/api/vaani/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: transcriptToken }),
        signal: controller.signal,
      });
      const data = await response.json() as { error?: string; retryable?: boolean; transcript?: string };
      if (!response.ok) {
        if (data.retryable) {
          const seconds = Number(response.headers.get("Retry-After"));
          setRetryAfter(Number.isFinite(seconds) && seconds > 0 ? seconds : null);
          setState("not-ready");
        } else {
          if (requestIdRef.current) {
            writeStoredVaaniSession({
              version: 1,
              requestId: requestIdRef.current,
              state: "blocked",
              createdAt: new Date().toISOString(),
            });
          }
          setState("error");
        }
        return;
      }
      const victimTurns = victimTurnsFromTranscript(data.transcript || "");
      if (!victimTurns.trim()) {
        if (requestIdRef.current) {
          writeStoredVaaniSession({
            version: 1,
            requestId: requestIdRef.current,
            state: "blocked",
            createdAt: new Date().toISOString(),
          });
        }
        setState("error");
        return;
      }
      setStagedTranscript(victimTurns);
      setFullTranscript(cleanCallTranscript(data.transcript || ""));
      setReviewSource("live");
      setState("reviewing");
    } catch {
      setState("not-ready");
    } finally {
      globalThis.clearTimeout(timeout);
    }
  };

  const loadSample = () => {
    setStagedTranscript("Yesterday afternoon I joined an investment group on WhatsApp. They asked me to pay Rs 25,000 through UPI to investnow@ybl and then demanded another payment before withdrawal. The number used was 9876543210 and my UPI reference was 412345678901. I have the chat and transaction screenshot.");
    setReviewSource("sample");
    setState("reviewing");
  };

  const acceptTranscript = () => {
    const reviewed = stagedTranscript.replace(/\s+/g, " ").trim();
    if (!reviewed) return;
    onTranscript(reviewed);
    onAccepted(transcriptToken);
    if (requestIdRef.current) {
      writeStoredVaaniSession({
        version: 1,
        requestId: requestIdRef.current,
        state: "accepted",
        createdAt: new Date().toISOString(),
      });
    }
    setState("accepted");
  };

  // On /talk the page's own heading says what this is; repeating it inside the
  // card is the clutter, not the call.
  const Shell = bare ? BarePanel : ChannelExplainer;
  return (
    <Shell
      title={t("intake.vaaniTitle")}
      body={t("intake.vaaniBody")}
      summary={t("intake.vaaniWhat")}
      tone="voice"
    >
      {bare
        ? <VaaniBadge label={t("intake.vaaniPowered")} linkLabel={t("intake.vaaniCreditLink")} />
        : <VaaniCredit label={t("intake.vaaniCredit")} linkLabel={t("intake.vaaniCreditLink")} />}
      {browserVoice?.available === false && state === "idle" && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-ink-2 flex-1">{t("intake.vaaniDemo")}</p>
          <Button onClick={loadSample} size="sm" variant="secondary">{t("intake.vaaniSample")}</Button>
        </div>
      )}
      {/* Stays mounted once the call ends, so ending it does not tear down the
          room mid-conversation and the review prompt can appear beneath it. */}
      {browserVoice?.available && (state === "idle" || state === "requested") && (
        <LiveVoiceCall
          language={language}
          safetyAnswer={safetyAnswer}
          childContext={childContext}
          callerName={callerName}
          onTranscriptToken={(token) => {
            tokenRef.current = token;
            setTranscriptToken(token);
          }}
          onCallEnded={() => { void handleCallEnded(); }}
        />
      )}
      {state === "finishing" && (
        <div role="status" aria-live="polite" className="mt-3 rounded-ctl border border-rule bg-raised px-4 py-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-ink/20 border-t-ink animate-spin"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-semibold">{t("intake.vaaniBuilding")}</p>
              <p className="mt-1 text-sm leading-[1.55] text-ink-2">{t("intake.vaaniBuildingSub")}</p>
              {slowHandoff && (
                <p className="mt-2 text-sm leading-[1.55] text-ink-3">{t("intake.vaaniBuildingSlow")}</p>
              )}
            </div>
          </div>
        </div>
      )}
      {state === "requested" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-2 flex-1">{t("intake.vaaniStalled")}</p>
          <Button onClick={importCall} size="sm" variant="secondary">{t("intake.vaaniImport")}</Button>
        </div>
      )}
      {state === "not-ready" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-2 flex-1">
            {t("intake.vaaniNotReady")}{retryAfter ? ` ${retryAfter}s.` : ""}
          </p>
          <Button onClick={importCall} size="sm" variant="secondary">{t("intake.vaaniCheckAgain")}</Button>
        </div>
      )}
      {state === "reviewing" && (
        <div className="mt-4 max-w-2xl">
          {reviewSource === "sample" && <p className="mb-2 text-sm text-info">{t("intake.vaaniSampleLoaded")}</p>}
          {fullTranscript && (
            <div className="mb-4">
              <p className="text-sm font-semibold">{t("intake.vaaniFullTranscript")}</p>
              <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("intake.vaaniFullSub")}</p>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-ctl border border-rule bg-raised px-3 py-3 space-y-2">
                {callTurns(fullTranscript).map((turn, index) => (
                  <p key={index} className="text-sm leading-[1.55]">
                    <span className={cn("font-semibold", turn.agent ? "text-ink-3" : "text-ink")}>
                      {turn.agent ? t("intake.agentName") : t("intake.vaaniBrowserYou")}:{" "}
                    </span>
                    <span className={turn.agent ? "text-ink-3" : "text-ink-2"}>{turn.text}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
          <label htmlFor="vaani-reviewed-transcript" className="block text-sm font-semibold">{t("intake.vaaniReview")}</label>
          <p id="vaani-reviewed-transcript-help" className="mt-1 text-xs leading-[1.55] text-ink-3">{t("intake.vaaniReviewSub")}</p>
          <textarea
            id="vaani-reviewed-transcript"
            aria-describedby="vaani-reviewed-transcript-help"
            value={stagedTranscript}
            onChange={(event) => setStagedTranscript(event.target.value)}
            rows={6}
            className="mt-3 w-full rounded-ctl border border-rule-strong bg-raised px-3 py-3 text-sm leading-relaxed"
          />
          <Button onClick={acceptTranscript} disabled={!stagedTranscript.trim()} size="sm" className="mt-3">
            {t("intake.vaaniUse")}
          </Button>
        </div>
      )}
      {state === "accepted" && <p className="mt-3 text-sm text-done">{t("intake.vaaniAccepted")}</p>}
      {state === "unknown" && <p role="alert" className="mt-3 text-sm text-urgent-ink">{t("intake.vaaniUnknown")}</p>}
      {state === "error" && <p role="alert" className="mt-3 text-sm text-urgent-ink">{t("intake.vaaniError")}</p>}
    </Shell>
  );
}

/**
 * Credit to the voice provider, in their own mark.
 *
 * Their wordmark is black on transparent, so it sits on a white chip rather
 * than being recoloured or filtered: it stays the logo they actually publish and
 * reads identically in both themes. Served from our own origin, so opening this
 * page makes no request to a third party.
 */
/**
 * The Vaani badge.
 *
 * A roundel and one line of type, the way a manufacturer signs a car: enough to
 * say who made the voice, small enough that it is not competing with the
 * microphone for attention. It replaces a title and a four-line paragraph that
 * said the same thing at ten times the size.
 */
function VaaniBadge({ label, linkLabel }: { label: string; linkLabel: string }) {
  return (
    <a
      href="https://vaaniresearch.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={linkLabel}
      className="inline-flex items-center gap-2 no-underline text-ink-3 hover:text-ink transition-colors"
    >
      <span className="grid place-items-center w-7 h-7 shrink-0 rounded-full border border-rule bg-white overflow-hidden">
        <Image src="/vaani/vaani-mark.png" alt="" width={72} height={72} className="w-5 h-5" />
      </span>
      <span className="text-[0.6875rem] font-medium uppercase tracking-[0.08em]">{label}</span>
    </a>
  );
}

function VaaniCredit({ label, linkLabel }: { label: string; linkLabel: string }) {
  return (
    <a
      href="https://vaaniresearch.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={linkLabel}
      className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-rule bg-white pl-3 pr-3.5 py-1.5 no-underline"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-black/50">{label}</span>
      <Image src="/vaani/vaani-logo.png" alt="Vaani AI / Research" width={1000} height={183} className="h-5 w-auto" />
    </a>
  );
}

function ChannelExplainer({ title, body, tone, children }: { title: string; body: string; summary?: string; tone: "whatsapp" | "voice"; children?: React.ReactNode }) {
  return (
    <section className={cn("mt-5 rounded-card border px-5 py-4", tone === "whatsapp" ? "bg-[#e3f4e9] border-[#afd0b9]" : "bg-info-soft border-info/25")}>
      <div className="flex items-start gap-3">
        <span className={cn("w-8 h-8 rounded-full grid place-items-center shrink-0", tone === "whatsapp" ? "bg-[#0a6c55] text-white" : "bg-info text-paper")} aria-hidden>
          {tone === "whatsapp" ? <WhatsAppIcon /> : <PhoneIcon />}
        </span>
        <div>
          <p className="font-semibold text-[0.9375rem]">{title}</p>
          <p className="mt-1 text-sm leading-[1.55] text-ink-2 max-w-3xl">{body}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** The voice provider's own mark, in the channel that is actually theirs. */
function VaaniMark() {
  return <Image src="/vaani/vaani-mark.png" alt="" width={72} height={72} className="w-5 h-5" />;
}

function ChannelButton({ active, title, note, icon, onClick }: { active: boolean; title: string; note: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn("min-h-16 rounded-ctl border px-3 py-2.5 text-start flex items-center gap-3 transition-colors", active ? "border-ink bg-ink text-paper" : "border-rule bg-raised hover:border-ink")}>
      <span className="w-8 h-8 rounded-full border border-current/25 grid place-items-center shrink-0" aria-hidden>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight">{title}</span>
        <span className={cn("block mt-1 text-[0.6875rem] leading-tight", active ? "text-paper/65" : "text-ink-3")}>{note}</span>
      </span>
    </button>
  );
}

/** A card on the web, a handset for the WhatsApp preview. */
function Shell({ whatsapp, statusTime, label, bare, children }: {
  whatsapp: boolean;
  statusTime: string;
  label: string;
  /**
   * No conversation furniture.
   *
   * On the one-question-at-a-time page the card *is* the page, and wrapping it
   * in a second bordered panel with a contact header on top gave every question
   * three nested boxes and a name badge for a chat nobody could see.
   */
  bare?: boolean;
  children: React.ReactNode;
}) {
  if (bare) return <div className="min-w-0">{children}</div>;
  const card = (
    <section
      className={cn(
        "relative overflow-hidden",
        whatsapp
          ? "h-full min-h-0 flex flex-col rounded-none"
          : "rounded-card border border-rule-strong bg-raised shadow-[0_18px_55px_-38px_rgba(26,26,26,0.5)]",
      )}
      aria-label={label}
    >
      {children}
    </section>
  );
  return whatsapp ? <PhoneFrame statusTime={statusTime}>{card}</PhoneFrame> : card;
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[88%] sm:max-w-[78%] px-3.5 py-2.5 text-[0.9375rem] leading-[1.55] shadow-sm",
        message.role === "user"
          ? "bg-deep text-[#ffffeb] rounded-[14px_4px_14px_14px]"
          : message.urgent ? "bg-urgent-soft text-urgent-ink border border-urgent/25 rounded-[4px_14px_14px_14px]"
            : "bg-sunk border border-rule rounded-[4px_14px_14px_14px]",
      )}>
        <span>{message.text}</span>
      </div>
    </div>
  );
}

/**
 * One follow-up question's field.
 *
 * The same control appears inside the WhatsApp composer and on the web card, so
 * it lives in one place: what changes between them is the chrome around it, not
 * what a phone number or a date is. Every kind except a date accepts dictation,
 * because the microphone is the point for anyone who does not type comfortably
 * — and an amount said as "forty seven thousand" is understood.
 */
function DetailField({ question, value, onChange, onSubmit, chrome, disabled, t }: {
  question: DetailQuestion;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  chrome: "whatsapp" | "page";
  disabled?: boolean;
  t: T;
}) {
  const whatsapp = chrome === "whatsapp";
  const placeholder = t(question.placeholder);
  const label = t(question.question);

  if (question.kind === "textarea") {
    if (whatsapp) {
      return <WhatsAppInput value={value} onChange={onChange} onSend={onSubmit} placeholder={placeholder} ariaLabel={label} />;
    }
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        aria-label={label}
        className="w-full p-3.5 bg-raised border border-rule-strong rounded-ctl text-base leading-[1.6] resize-y focus:outline-none focus:border-ink"
      />
    );
  }

  const type = question.kind === "datetime"
    ? "datetime-local"
    : question.kind === "tel"
      ? "tel"
      : question.kind === "email"
        ? "email"
        : "text";

  return (
    <input
      type={type}
      inputMode={question.kind === "amount" ? "text" : undefined}
      value={question.kind === "datetime" ? localDateTimeValue(value) || value : value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        onSubmit();
      }}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={label}
      className={cn(
        whatsapp
          ? "block w-full bg-transparent focus:outline-none text-[0.9375rem] leading-[1.45] text-[#111b21] placeholder:text-[#8696a0]"
          : "w-full h-12 px-3.5 bg-raised border border-rule-strong rounded-ctl text-base focus:outline-none focus:border-ink",
      )}
    />
  );
}

/** Passing on a question, one at a time or all at once. */
function DetailSkips({ onSkip, onSkipAll, remaining, wa, t }: {
  onSkip: () => void;
  onSkipAll: () => void;
  remaining: number;
  wa?: boolean;
  t: T;
}) {
  return (
    <Replies wa={Boolean(wa)}>
      <Reply wa={Boolean(wa)} onClick={onSkip}>{t("detail.skip")}</Reply>
      {remaining > 1 && <Reply wa={Boolean(wa)} onClick={onSkipAll}>{t("detail.skipAll")}</Reply>}
    </Replies>
  );
}

function FindIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ActionCard({ children, urgent }: { children: React.ReactNode; urgent?: boolean }) {
  return <div className={cn("intake-action-card rounded-card border px-4 py-4 sm:px-5", urgent ? "border-urgent/35 bg-urgent-soft" : "border-rule-strong bg-paper/90")}>{children}</div>;
}

/**
 * A row of answers, drawn as the channel draws them.
 *
 * On the web they are chips at the end of the conversation. On WhatsApp they
 * are the interactive reply buttons a bot actually sends, attached under the
 * message. Every step below is written once and gets both.
 */
function Replies({ wa, children }: { wa: boolean; children: React.ReactNode }) {
  return wa ? <WhatsAppButtons>{children}</WhatsAppButtons> : <QuickReplies>{children}</QuickReplies>;
}

function Reply({ wa, onClick, href, urgent, selected, primary, children }: {
  wa: boolean;
  onClick?: () => void;
  href?: string;
  urgent?: boolean;
  selected?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  if (wa) {
    return (
      <WhatsAppButton onClick={onClick} href={href} selected={selected} primary={primary}>
        {children}
      </WhatsAppButton>
    );
  }
  if (href) return <Button href={href} external variant={urgent ? "urgent" : "secondary"} size="md">{children}</Button>;
  return <Quick onClick={onClick!} urgent={urgent}>{children}</Quick>;
}

function QuickReplies({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 justify-end" role="group">{children}</div>;
}

function Quick({ children, onClick, urgent }: { children: React.ReactNode; onClick: () => void; urgent?: boolean }) {
  return <button onClick={onClick} className={cn("intake-quick min-h-11 px-4 py-2 rounded-full border text-sm font-semibold transition-colors", urgent ? "border-urgent-ink/40 text-urgent-ink bg-urgent-soft hover:border-urgent-ink" : "border-rule-strong bg-raised hover:border-ink")}>{children}</button>;
}

function Choice({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn("intake-choice min-h-12 px-3 py-2.5 rounded-ctl border text-start text-sm leading-snug flex items-center gap-2", active ? "bg-done-soft border-done/40 text-done" : "bg-raised border-rule-strong hover:border-ink")}>
      <span className={cn("w-5 h-5 rounded grid place-items-center border shrink-0", active ? "bg-done text-paper border-done" : "border-rule-strong")} aria-hidden>{active ? "✓" : ""}</span>
      {children}
    </button>
  );
}

function safetyLabel(answer: SafetyAnswer, t: T): string {
  if (answer === "safe") return t("intake.safetySafe");
  if (answer === "danger") return t("intake.safetyDanger");
  return t("intake.preferNot");
}

function moneyLabel(answer: MoneyAnswer, t: T): string {
  if (answer === "yes") return t("intake.moneyYes");
  if (answer === "no") return t("intake.moneyNo");
  return t("intake.notSure");
}

function childContextLabel(answer: ChildContext, t: T): string {
  if (answer === "adult-or-no-child") return t("intake.ageAdult");
  if (answer === "self-minor") return t("intake.ageSelfMinor");
  if (answer === "child-other") return t("intake.ageChildOther");
  return t("intake.preferNot");
}

function timingChoiceLabel(answer: IncidentTiming, t: T): string {
  if (answer === "last-hour") return t("intake.timingHour");
  if (answer === "today") return t("intake.timingToday");
  if (answer === "older") return t("intake.timingOlder");
  return t("intake.notSure");
}

function rbiInitiationLabel(answer: RbiInitiation, t: T): string {
  if (answer === "victim") return t("intake.rbiInitiatedMe");
  if (answer === "not-victim") return t("intake.rbiInitiatedNotMe");
  return t("intake.notSure");
}

function yesNoUnknownLabel(
  answer: RbiYesNoUnknown,
  t: T,
  yesKey: Parameters<T>[0],
  noKey: Parameters<T>[0],
): string {
  if (answer === "yes") return t(yesKey);
  if (answer === "no") return t(noKey);
  return t("intake.notSure");
}

function rbiReportTimingLabel(answer: RbiReportTiming, t: T): string {
  if (answer === "within_3_working_days") return t("intake.rbiReportThree");
  if (answer === "four_to_seven_working_days") return t("intake.rbiReportSeven");
  if (answer === "after_7_working_days") return t("intake.rbiReportAfter");
  if (answer === "not_reported") return t("intake.rbiReportNo");
  return t("intake.notSure");
}

function rbiInputFromDraft(draft: IntakeDraft): RbiEligibilityInput | undefined {
  if (draft.moneyMoved !== "yes" || !draft.transactionInitiation) return undefined;
  return {
    initiation: draft.transactionInitiation,
    credentialsShared: draft.credentialsShared ?? "unknown",
    suspectedBankFault: draft.suspectedBankFault ?? "unknown",
    reportTiming: draft.bankReportTiming ?? "unknown",
  };
}

function rbiProtectionLabel(assessment: RbiEligibilityAssessment, t: T): string {
  switch (assessment.protection) {
    case "zero_liability": return t("intake.rbiProtectionZero");
    case "limited_liability": return t("intake.rbiProtectionLimited");
    case "bank_policy": return t("intake.rbiProtectionPolicy");
    case "post_report_loss_only": return t("intake.rbiProtectionPostReport");
    case "not_applicable": return t("intake.rbiProtectionNotApplicable");
    default: return t("intake.rbiProtectionUnknown");
  }
}

function entityItems(entities: Entities): { field: EntityArrayKey; index: number; value: string }[] {
  const fields: EntityArrayKey[] = ["upiIds", "phones", "accounts", "refs", "urls", "emails", "handles"];
  return fields.flatMap((field) =>
    entities[field].map((value, index) => ({ field, index, value })),
  ).slice(0, 12);
}




function restoredVaaniUiState(session: StoredVaaniSession | null):
  "idle" | "requested" | "accepted" | "unknown" | "error" {
  if (!session) return "idle";
  if (session.state === "requested" && session.transcriptToken) return "requested";
  if (session.state === "accepted") return "accepted";
  if (session.state === "blocked") return "error";
  // Reloading while a request was in flight is deliberately ambiguous: the
  // provider may have accepted it even though the browser never got a reply.
  return "unknown";
}




function ChatIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>;
}

/**
 * The official WhatsApp glyph, so the channel is labelled with the mark people
 * actually recognise. Filled with currentColor: brand green on the channel
 * button, white inside the green lockup on the explainer.
 */
function WhatsAppIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function PhoneIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z" /></svg>;
}
