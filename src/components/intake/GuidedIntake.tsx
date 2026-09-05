"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VoiceInput } from "@/components/start/VoiceInput";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/Wordmark";
import { CATEGORIES, findCategory } from "@/lib/case/categories";
import { createDefaultEvidence } from "@/lib/case/evidence";
import { OFFICERS } from "@/lib/case/officers";
import { newCase, saveCase } from "@/lib/case/store";
import type { Entities, Triage } from "@/lib/case/types";
import { useI18n } from "@/lib/i18n/context";
import {
  emptyIntake,
  evidenceIdsFor,
  hasCompletedSafetyGate,
  hasCurrentSafetyAnswer,
  SAFETY_GATE_TTL_MS,
  intakeProgress,
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
import {
  WhatsAppBubble,
  WhatsAppComposer,
  WhatsAppHeader,
  WhatsAppSystemNote,
  WhatsAppSendButton,
  WhatsAppInput,
  PhoneFrame,
  WHATSAPP_WALLPAPER,
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

export function GuidedIntake() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [draft, setDraft] = useState<IntakeDraft>(() => emptyIntake());
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<"checking" | "saving" | "saved" | "error">("checking");
  const [showReset, setShowReset] = useState(false);
  const [safetyClock, setSafetyClock] = useState(() => Date.now());
  const currentRef = useRef<HTMLDivElement>(null);
  const evidenceChoice = draft.pendingEvidence ?? [];
  const step = nextIntakeStep(draft);
  const progress = intakeProgress(draft);
  const voiceGateComplete = hasCompletedSafetyGate(draft);
  const whatsapp = draft.channel === "whatsapp";
  // The voice channel is a microphone, not a chat with a microphone above it.
  const voiceOnly = draft.channel === "voice";
  // A tap-to-answer step belongs on the suggestion row; everything else is a
  // card and belongs in the conversation, where there is room to read it.
  const CHIP_STEPS = new Set<string>([
    "safety", "age", "money", "timing",
    "rbi-initiation", "rbi-credentials", "rbi-bank-fault", "rbi-report-timing",
  ]);
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

  const openCase = useCallback(() => {
    const analysis = draft.analysis;
    if (!analysis) return;
    const incidentAt = analysis.triage.incidentAt;
    const now = new Date().toISOString();
    const available = new Set(evidenceIdsFor(draft.evidence));
    const evidence = createDefaultEvidence(now).map((item) =>
      available.has(item.id) ? { ...item, status: "added" as const, updatedAt: now } : item,
    );
    const rbiInput = rbiInputFromDraft(draft);

    const c = newCase({
      language: lang.code,
      rawStatement: draft.narrative.trim(),
      triage: analysis.triage,
      entities: analysis.entities,
      amount: analysis.triage.amount,
      incidentAt,
      incidentTimingRange: draft.incidentTiming,
      bankAlertAt: draft.bankAlertAt,
      txns: analysis.triage.amount || analysis.entities.refs[0]
        ? [{ amount: analysis.triage.amount, ref: analysis.entities.refs[0], at: incidentAt }]
        : [],
      victim: { state: draft.state, district: draft.district, ageContext: draft.childContext },
      ...(draft.bankName ? { bank: { name: draft.bankName } } : {}),
      suspect: {
        phones: analysis.entities.phones,
        upiIds: analysis.entities.upiIds,
        accounts: analysis.entities.accounts,
        urls: analysis.entities.urls,
        handles: analysis.entities.handles,
      },
      files: draft.files,
      evidence,
      legal: rbiInput ? {
        rbi: {
          input: rbiInput,
          assessment: assessRbiEligibility(rbiInput),
          assessedAt: now,
        },
      } : undefined,
    });
    c.events.push({
      at: now,
      kind: "triaged",
      label: `Guided interview confirmed · ${draft.channel} channel`,
    });
    if (!saveCase(c)) {
      setPersistence("error");
      setError(t("rep.save.error"));
      return;
    }
    try { localStorage.removeItem(INTAKE_STORAGE_KEY); } catch { /* ignore */ }
    clearStoredVaaniSession();
    router.push(`/case/${c.id}`);
  }, [draft, lang.code, router, t]);

  const reset = useCallback(() => {
    try { localStorage.removeItem(INTAKE_STORAGE_KEY); } catch { /* ignore */ }
    clearStoredVaaniSession();
    setDraft(emptyIntake(draft.channel));
    setShowReset(false);
  }, [draft.channel]);

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
      updateTriage={updateTriage}
      updateEntity={updateEntity}
      evidenceChoice={evidenceChoice}
      openCase={openCase}
    />
  );

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3 sm:pt-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-6xl rounded-card border border-ink/15 bg-paper/90 backdrop-blur-xl shadow-[0_6px_24px_-18px_rgba(26,26,26,0.55)] px-3 sm:px-4 h-[60px] sm:h-[64px] flex items-center gap-4">
          <Wordmark />
          <span
            role="status"
            aria-live="polite"
            className={cn("hidden sm:inline ms-auto text-xs", persistence === "error" ? "text-urgent-ink" : "text-ink-3")}
          >
            {persistenceLabel}
          </span>
          <LanguageSwitcher compact />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 sm:px-8 py-8 sm:py-12">
        {persistence === "error" && (
          <p role="alert" className="mb-5 rounded-ctl border border-urgent/35 bg-urgent-soft px-4 py-3 text-sm leading-[1.55] text-urgent-ink">
            {t("rep.save.error")}
          </p>
        )}
        <div className="max-w-3xl">
          <p className="label">{t("intake.agentName")} · {t("intake.agentRole")}</p>
          <h1 className="h1-long mt-3">{t("intake.title")}</h1>
          <p className="mt-5 max-w-2xl text-[1.0625rem] leading-[1.65] text-ink-2">{t("intake.sub")}</p>
        </div>

        <section className="mt-8 sheet px-3 py-3 sm:px-4" aria-label={t("intake.switch")}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <p className="label shrink-0 lg:me-3">{t("intake.switch")}</p>
            <div className="grid sm:grid-cols-3 gap-2 flex-1">
              <ChannelButton
                active={draft.channel === "web"}
                title={t("intake.channel.web")}
                note={t("intake.channel.webNote")}
                icon={<ChatIcon />}
                onClick={() => patch({ channel: "web" })}
              />
              <ChannelButton
                active={draft.channel === "whatsapp"}
                title={t("intake.channel.whatsapp")}
                note={t("intake.channel.whatsappNote")}
                icon={<span className="text-[#25D366]"><WhatsAppIcon /></span>}
                onClick={() => patch({ channel: "whatsapp" })}
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

        {needsFastFinancialAction(draft) && (
          <aside className="mt-5 rounded-card border border-urgent/40 bg-urgent-soft px-5 py-5" role="alert">
            <p className="label !text-urgent-ink/75">{t("triage.firstAction")}</p>
            <h2 className="mt-2 !font-sans !text-xl !font-semibold !tracking-normal !leading-snug text-urgent-ink">
              {t("intake.urgentH")}
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-[1.6] text-urgent-ink/85 max-w-2xl">{t("intake.urgentBody")}</p>
            <Button href="tel:1930" external variant="urgent" size="md" className="mt-4">{t("sos.call")}</Button>
          </aside>
        )}

        <div className="mt-7 grid lg:grid-cols-[minmax(0,1fr)_19rem] gap-6 lg:items-start">
          {voiceOnly ? (
            <VaaniPanel
              language={lang.code}
              safetyAnswer={draft.safety}
              childContext={draft.childContext}
              // The voice channel has no interview under it, so approving the
              // transcript used to end on a sentence pointing at facts that were
              // not on screen. Hand back to the chat, where the story now sits
              // ready to be read and confirmed.
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
          <Shell whatsapp={whatsapp} statusTime={chatClock} label={t("intake.agentName")}>
            {whatsapp ? (
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
              className={cn(
                "px-3 sm:px-5 py-5 space-y-3",
                whatsapp && `${WHATSAPP_WALLPAPER} sm:flex-1 sm:min-h-0 sm:overflow-y-auto`,
              )}
            > 
              {whatsapp && <WhatsAppSystemNote>{t("intake.waNotReal")}</WhatsAppSystemNote>}
              <div role="log" aria-live="polite" aria-relevant="additions" className="space-y-3">
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
              </div>

              {(!whatsapp || (!CHIP_STEPS.has(step) && step !== "story")) && (
                <div
                  ref={currentRef}
                  tabIndex={-1}
                  className={cn("pt-2 focus:outline-none", whatsapp && "[&_.intake-action-card]:bg-white")}
                >
                  {controls}
                </div>
              )}
            </div>

            {/* On the WhatsApp screen the answers belong on the composer strip,
                where that app puts everything you can do. */}
            {whatsapp && (
              <WhatsAppComposer
                attachmentNote={t("intake.waAttachLater")}
                hideCamera={step === "story" && Boolean(draft.narrative.trim())}
                suggestions={CHIP_STEPS.has(step) ? controls : undefined}
                input={step === "story" ? controls : (
                  <p className="text-[0.9375rem] leading-[1.4] text-[#8696a0] truncate">
                    {CHIP_STEPS.has(step) ? t("intake.waTapAbove") : t("intake.waReadAbove")}
                  </p>
                )}
                trailing={step === "story" ? (
                  // WhatsApp's own rule: a microphone until there is something
                  // to send, then a send button in the same place.
                  draft.narrative.trim() ? (
                    <WhatsAppSendButton onClick={analyse} disabled={busy} label={t("intake.waSend")} />
                  ) : (
                    <VoiceInput
                      variant="compact"
                      disabled={busy}
                      onResult={(chunk) => patch({
                        narrative: [draft.narrative.trim(), chunk].filter(Boolean).join(" "),
                        analysis: undefined,
                        analysisConfirmed: false,
                      })}
                    />
                  )
                ) : undefined}
              />
            )}
          </Shell>
          )}

          <aside className="lg:sticky lg:top-28 space-y-4">
            <CaseBrief draft={draft} progress={progress} t={t} />
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
                  className="underline underline-offset-4 hover:text-ink"
                >
                  {t("intake.formInstead")} →
                </button>
              )}
              <button onClick={() => setShowReset(true)} className="block underline underline-offset-4 hover:text-ink">{t("intake.reset")}</button>
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
        </div>
      </main>
    </div>
  );
}

function StepControls({
  step, draft, patch, answer, t, busy, error, analyse, updateTriage, updateEntity, evidenceChoice, openCase,
}: {
  step: ReturnType<typeof nextIntakeStep>;
  draft: IntakeDraft;
  patch: (p: Partial<IntakeDraft>) => void;
  answer: (p: Partial<IntakeDraft>, label: string) => void;
  t: T;
  busy: boolean;
  error: string | null;
  analyse: () => void;
  updateTriage: (p: Partial<Triage>) => void;
  updateEntity: (field: EntityArrayKey, index: number, value?: string) => void;
  evidenceChoice: EvidenceKind[];
  openCase: () => void;
}) {
  if (step === "boundaries") {
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
    return (
      <QuickReplies>
        <Quick onClick={() => answer({ safety: "safe" satisfies SafetyAnswer, safetyCheckedAt: new Date().toISOString(), emergencyAcknowledged: false }, t("intake.safetySafe"))}>{t("intake.safetySafe")}</Quick>
        <Quick onClick={() => answer({ safety: "danger" satisfies SafetyAnswer, safetyCheckedAt: new Date().toISOString(), emergencyAcknowledged: false }, t("intake.safetyDanger"))} urgent>{t("intake.safetyDanger")}</Quick>
        <Quick onClick={() => answer({ safety: "prefer-not" satisfies SafetyAnswer, safetyCheckedAt: new Date().toISOString(), emergencyAcknowledged: false }, t("intake.preferNot"))}>{t("intake.preferNot")}</Quick>
      </QuickReplies>
    );
  }

  if (step === "emergency") {
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
      <QuickReplies>
        <Quick onClick={() => answer({ childContext: "adult-or-no-child" satisfies ChildContext }, t("intake.ageAdult"))}>{t("intake.ageAdult")}</Quick>
        <Quick onClick={() => answer({ childContext: "self-minor" satisfies ChildContext }, t("intake.ageSelfMinor"))}>{t("intake.ageSelfMinor")}</Quick>
        <Quick onClick={() => answer({ childContext: "child-other" satisfies ChildContext }, t("intake.ageChildOther"))}>{t("intake.ageChildOther")}</Quick>
        <Quick onClick={() => answer({ childContext: "unknown" satisfies ChildContext }, t("intake.preferNot"))}>{t("intake.preferNot")}</Quick>
      </QuickReplies>
    );
  }

  if (step === "child-safety") {
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
      <QuickReplies>
        <Quick onClick={() => answer({ moneyMoved: "yes" satisfies MoneyAnswer }, t("intake.moneyYes"))}>{t("intake.moneyYes")}</Quick>
        <Quick onClick={() => answer({ moneyMoved: "no" satisfies MoneyAnswer }, t("intake.moneyNo"))}>{t("intake.moneyNo")}</Quick>
        <Quick onClick={() => answer({ moneyMoved: "unsure" satisfies MoneyAnswer }, t("intake.notSure"))}>{t("intake.notSure")}</Quick>
      </QuickReplies>
    );
  }

  if (step === "timing") {
    return (
      <QuickReplies>
        <Quick onClick={() => answer({ incidentTiming: "last-hour" satisfies IncidentTiming }, t("intake.timingHour"))} urgent>{t("intake.timingHour")}</Quick>
        <Quick onClick={() => answer({ incidentTiming: "today" satisfies IncidentTiming }, t("intake.timingToday"))}>{t("intake.timingToday")}</Quick>
        <Quick onClick={() => answer({ incidentTiming: "older" satisfies IncidentTiming }, t("intake.timingOlder"))}>{t("intake.timingOlder")}</Quick>
        <Quick onClick={() => answer({ incidentTiming: "unsure" satisfies IncidentTiming }, t("intake.notSure"))}>{t("intake.notSure")}</Quick>
      </QuickReplies>
    );
  }

  if (step === "story") {
    if (draft.channel === "whatsapp") {
      return (
        <>
          <WhatsAppInput
            value={draft.narrative}
            onChange={(narrative) => patch({ narrative, analysis: undefined, analysisConfirmed: false })}
            placeholder={t("intake.waTypeHint")}
            ariaLabel={t("intake.storyQ")}
          />
          {error && <p role="alert" className="mt-1 text-xs text-urgent-ink">{error}</p>}
        </>
      );
    }
    return (
      <ActionCard>
        <div className="flex justify-center py-2">
          <VoiceInput onResult={(chunk) => patch({
            narrative: [draft.narrative.trim(), chunk].filter(Boolean).join(" "),
            analysis: undefined,
            analysisConfirmed: false,
          })} disabled={busy} />
        </div>
        <textarea
          value={draft.narrative}
          onChange={(e) => patch({ narrative: e.target.value, analysis: undefined, analysisConfirmed: false })}
          rows={7}
          placeholder={t("start.placeholder")}
          aria-label={t("intake.storyQ")}
          className="mt-3 w-full p-4 bg-raised border border-rule-strong rounded-ctl text-base leading-[1.6] resize-y focus:outline-none focus:border-ink"
        />
        <p className="mt-2 text-sm leading-[1.55] text-ink-3">{t("intake.storyHint")}</p>
        {error && <p role="alert" className="mt-3 text-sm text-urgent-ink">{error}</p>}
        <Button onClick={analyse} disabled={busy} size="md" className="mt-5" full>
          {busy ? `${t("intake.analysing")}…` : t("intake.storyCta")}
        </Button>
      </ActionCard>
    );
  }

  if (step === "verify" && draft.analysis) {
    const triage = draft.analysis.triage;
    const category = findCategory(triage.categoryId);
    const found = entityItems(draft.analysis.entities);
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
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm text-ink-2">{t("intake.verifyCategory")}</span>
            <select
              value={triage.categoryId}
              onChange={(e) => updateTriage({ categoryId: e.target.value, subcategoryId: undefined })}
              className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl focus:outline-none focus:border-ink"
            >
              {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm text-ink-2">{t("intake.verifySubcategory")}</span>
            <select
              value={triage.subcategoryId || ""}
              onChange={(e) => updateTriage({ subcategoryId: e.target.value || undefined })}
              className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl focus:outline-none focus:border-ink"
            >
              <option value="">—</option>
              {category?.subcategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm text-ink-2">{t("intake.verifyAmount")}</span>
            <input
              type="number"
              inputMode="decimal"
              value={triage.amount ?? ""}
              onChange={(e) => updateTriage({ amount: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl num focus:outline-none focus:border-ink"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm text-ink-2">{t("intake.verifyWhen")}</span>
            <input
              type="datetime-local"
              value={toLocalInput(triage.incidentAt)}
              onChange={(e) => updateTriage({ incidentAt: fromLocalInput(e.target.value) })}
              className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl num focus:outline-none focus:border-ink"
            />
          </label>
          {draft.moneyMoved === "yes" && (
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm text-ink-2">{t("intake.verifyBankAlert")}</span>
              <input
                type="datetime-local"
                value={toLocalInput(draft.bankAlertAt)}
                onChange={(e) => patch({ bankAlertAt: fromLocalInput(e.target.value) })}
                className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl num focus:outline-none focus:border-ink"
              />
              <span className="block text-xs leading-snug text-ink-3">{t("intake.verifyBankAlertHint")}</span>
            </label>
          )}
        </div>
        <div className="mt-4 border-t border-rule pt-4">
          <p className="text-sm text-ink-3">{t("intake.verifyFound")}</p>
          {found.length ? (
            <div className="mt-2 grid gap-2">
              {found.map((item) => (
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
          ) : <p className="mt-1 text-sm text-ink-3">{t("intake.verifyNone")}</p>}
        </div>
        <Button onClick={() => answer({ analysisConfirmed: true }, t("intake.verifyConfirm"))} size="md" className="mt-5" full>{t("intake.verifyConfirm")}</Button>
      </ActionCard>
    );
  }

  if (step === "rbi-initiation") {
    return (
      <QuickReplies>
        <Quick onClick={() => answer({ transactionInitiation: "victim" satisfies RbiInitiation }, t("intake.rbiInitiatedMe"))}>{t("intake.rbiInitiatedMe")}</Quick>
        <Quick onClick={() => answer({ transactionInitiation: "not-victim" satisfies RbiInitiation }, t("intake.rbiInitiatedNotMe"))}>{t("intake.rbiInitiatedNotMe")}</Quick>
        <Quick onClick={() => answer({ transactionInitiation: "unknown" satisfies RbiInitiation }, t("intake.notSure"))}>{t("intake.notSure")}</Quick>
      </QuickReplies>
    );
  }

  if (step === "rbi-credentials") {
    return (
      <QuickReplies>
        <Quick onClick={() => answer({ credentialsShared: "yes" satisfies RbiYesNoUnknown }, t("intake.rbiCredentialYes"))}>{t("intake.rbiCredentialYes")}</Quick>
        <Quick onClick={() => answer({ credentialsShared: "no" satisfies RbiYesNoUnknown }, t("intake.rbiCredentialNo"))}>{t("intake.rbiCredentialNo")}</Quick>
        <Quick onClick={() => answer({ credentialsShared: "unknown" satisfies RbiYesNoUnknown }, t("intake.notSure"))}>{t("intake.notSure")}</Quick>
      </QuickReplies>
    );
  }

  if (step === "rbi-bank-fault") {
    return (
      <QuickReplies>
        <Quick onClick={() => answer({ suspectedBankFault: "yes" satisfies RbiYesNoUnknown }, t("intake.rbiBankFaultYes"))}>{t("intake.rbiBankFaultYes")}</Quick>
        <Quick onClick={() => answer({ suspectedBankFault: "no" satisfies RbiYesNoUnknown }, t("intake.rbiBankFaultNo"))}>{t("intake.rbiBankFaultNo")}</Quick>
        <Quick onClick={() => answer({ suspectedBankFault: "unknown" satisfies RbiYesNoUnknown }, t("intake.notSure"))}>{t("intake.notSure")}</Quick>
      </QuickReplies>
    );
  }

  if (step === "rbi-report-timing") {
    return (
      <QuickReplies>
        <Quick onClick={() => answer({ bankReportTiming: "within_3_working_days" satisfies RbiReportTiming }, t("intake.rbiReportThree"))}>{t("intake.rbiReportThree")}</Quick>
        <Quick onClick={() => answer({ bankReportTiming: "four_to_seven_working_days" satisfies RbiReportTiming }, t("intake.rbiReportSeven"))}>{t("intake.rbiReportSeven")}</Quick>
        <Quick onClick={() => answer({ bankReportTiming: "after_7_working_days" satisfies RbiReportTiming }, t("intake.rbiReportAfter"))}>{t("intake.rbiReportAfter")}</Quick>
        <Quick onClick={() => answer({ bankReportTiming: "not_reported" satisfies RbiReportTiming }, t("intake.rbiReportNo"))} urgent>{t("intake.rbiReportNo")}</Quick>
        <Quick onClick={() => answer({ bankReportTiming: "unknown" satisfies RbiReportTiming }, t("intake.notSure"))}>{t("intake.notSure")}</Quick>
      </QuickReplies>
    );
  }

  if (step === "rbi-review") {
    const input = rbiInputFromDraft(draft);
    if (!input) return null;
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

  if (step === "ready") {
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

function buildMessages(draft: IntakeDraft, t: T, now = new Date()): Message[] {
  const messages: Message[] = [{ role: "agent", text: t("intake.boundaryQ"), promptId: "boundaries" }];
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
  messages.push({ role: "agent", text: t("intake.storyQ"), promptId: "story" });
  if (draft.narrative.trim().length < 25 || !draft.analysis) return messages;
  messages.push({ role: "user", text: draft.narrative.trim() });
  messages.push({ role: "agent", text: t("intake.verifyQ"), promptId: "verify" });
  if (!draft.analysisConfirmed) return messages;
  messages.push({ role: "user", text: t("intake.verifyConfirm") });
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
    messages.push({ role: "agent", text: t("intake.rbiReviewQ"), promptId: "rbi-review" });
    if (!draft.rbiAssessmentReviewed) return messages;
    messages.push({ role: "user", text: t("intake.rbiContinue") });
  }
  messages.push({ role: "agent", text: `${t("intake.evidenceQ")} ${t("intake.evidenceSub")}`, promptId: "evidence" });
  if (draft.evidence === undefined) return messages;
  messages.push({ role: "user", text: draft.evidence.includes("none") ? t("intake.evNone") : `${draft.evidence.length} ${t("intake.summaryEvidence").toLowerCase()}` });
  messages.push({ role: "agent", text: `${t("intake.routingQ")} ${t("intake.routingSub")}`, promptId: "routing" });
  if (!draft.routingAnswered) return messages;
  messages.push({ role: "user", text: [draft.district, draft.state].filter(Boolean).join(", ") || t("intake.routingSkip") });
  messages.push({ role: "agent", text: t("intake.readyQ"), promptId: "ready" });
  return messages;
}

function CaseBrief({ draft, progress, t }: { draft: IntakeDraft; progress: ReturnType<typeof intakeProgress>; t: T }) {
  const rbiInput = rbiInputFromDraft(draft);
  const rbi = rbiInput && draft.rbiAssessmentReviewed ? assessRbiEligibility(rbiInput) : undefined;
  const rows: { label: string; value?: string; confirmed?: boolean }[] = [
    { label: t("intake.summarySafety"), value: draft.safety ? safetyLabel(draft.safety, t) : undefined, confirmed: Boolean(draft.safety) },
    { label: t("intake.summaryAge"), value: draft.childContext ? childContextLabel(draft.childContext, t) : undefined, confirmed: Boolean(draft.childContext) },
    { label: t("intake.summaryMoney"), value: draft.moneyMoved ? moneyLabel(draft.moneyMoved, t) : undefined, confirmed: Boolean(draft.moneyMoved) },
    { label: t("intake.summaryTiming"), value: draft.moneyMoved === "yes" && draft.incidentTiming ? timingChoiceLabel(draft.incidentTiming, t) : undefined, confirmed: Boolean(draft.incidentTiming) },
    { label: t("intake.summaryBankAlert"), value: draft.bankAlertAt ? new Date(draft.bankAlertAt).toLocaleString("en-IN") : undefined, confirmed: Boolean(draft.bankAlertAt) },
    { label: t("intake.summaryType"), value: findCategory(draft.analysis?.triage.categoryId)?.label, confirmed: draft.analysisConfirmed },
    { label: t("intake.summaryRbi"), value: rbi ? rbiProtectionLabel(rbi, t) : undefined, confirmed: Boolean(rbi) },
    { label: t("intake.summaryEvidence"), value: draft.evidence ? (draft.evidence.includes("none") ? t("intake.evNone") : String(draft.evidence.length)) : undefined, confirmed: draft.evidence !== undefined },
    { label: t("intake.summaryRoute"), value: [draft.district, draft.state].filter(Boolean).join(", ") || undefined, confirmed: draft.routingAnswered },
  ];
  return (
    <section className="sheet px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label">{t("intake.summaryH")}</p>
        <span className="num text-sm text-ink-3">{progress.answered}/{progress.total}</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-sunk overflow-hidden" role="progressbar" aria-label={t("intake.summaryH")} aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-deep transition-[width] duration-300" style={{ width: `${progress.percent}%` }} />
      </div>
      <dl className="mt-4 divide-y divide-rule">
        {rows.filter((row) => row.value).map((row) => (
          <div key={row.label} className="py-2.5">
            <dt className="text-xs text-ink-3">{row.label}</dt>
            <dd className="mt-0.5 text-sm leading-snug flex items-start gap-2">
              <span className="flex-1">{row.value}</span>
              <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", row.confirmed ? "bg-done" : "bg-wait")} aria-label={row.confirmed ? t("intake.summaryConfirmed") : t("intake.summaryUnconfirmed")} />
            </dd>
          </div>
        ))}
      </dl>
      {!rows.some((row) => row.value) && <p className="mt-3 text-sm leading-snug text-ink-3">{t("intake.summaryEmpty")}</p>}
      {draft.analysis?.triage.amount ? <p className="mt-4 num text-xl">{inr(draft.analysis.triage.amount)}</p> : null}
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
        href={assessment.source.url}
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

function VaaniPanel({
  language,
  safetyAnswer,
  childContext,
  onTranscript,
  onAccepted,
  t,
}: {
  language: string;
  safetyAnswer?: string;
  childContext?: string;
  onTranscript: (text: string) => void;
  /** Called once the caller has approved their own words, with the capability
   *  that can fetch what the provider already extracted. */
  onAccepted: (transcriptToken: string | null) => void;
  t: T;
}) {
  const [restoredSession] = useState<StoredVaaniSession | null>(() => readStoredVaaniSession());
  const [state, setState] = useState<
    "idle" | "calling" | "requested" | "not-ready" | "reviewing" | "accepted" | "unknown" | "error"
  >(() => restoredVaaniUiState(restoredSession));
  const [transcriptToken, setTranscriptToken] = useState<string | null>(
    () => restoredSession?.transcriptToken ?? null,
  );
  const [stagedTranscript, setStagedTranscript] = useState("");
  const [fullTranscript, setFullTranscript] = useState("");
  const [reviewSource, setReviewSource] = useState<"sample" | "live" | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const requestIdRef = useRef<string | null>(restoredSession?.requestId ?? null);
  const [browserVoice, setBrowserVoice] = useState<{ available: boolean; recordingRequired: boolean } | null>(null);


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

  return (
    <ChannelExplainer title={t("intake.vaaniTitle")} body={t("intake.vaaniBody")} tone="voice">
      <VaaniCredit label={t("intake.vaaniCredit")} linkLabel={t("intake.vaaniCreditLink")} />
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
          onTranscriptToken={setTranscriptToken}
          onCallEnded={() => setState("requested")}
        />
      )}
      {state === "requested" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-done flex-1">{t("intake.vaaniActive")}</p>
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
    </ChannelExplainer>
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

function ChannelExplainer({ title, body, tone, children }: { title: string; body: string; tone: "whatsapp" | "voice"; children?: React.ReactNode }) {
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
function Shell({ whatsapp, statusTime, label, children }: {
  whatsapp: boolean;
  statusTime: string;
  label: string;
  children: React.ReactNode;
}) {
  const card = (
    <section
      className={cn(
        "overflow-hidden",
        whatsapp
          ? "sm:h-full sm:min-h-0 sm:flex sm:flex-col sm:rounded-none"
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

function ActionCard({ children, urgent }: { children: React.ReactNode; urgent?: boolean }) {
  return <div className={cn("intake-action-card rounded-card border px-4 py-4 sm:px-5", urgent ? "border-urgent/35 bg-urgent-soft" : "border-rule-strong bg-paper/90")}>{children}</div>;
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

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
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
