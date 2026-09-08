"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { readStoredVaaniSession } from "@/lib/integrations/vaani-client";
import { caseUpdatesFromCall } from "@/lib/case/from-call";
import demoCall from "@/lib/demo/call.json";
import { mapVaaniCall } from "@/lib/intake/from-vaani";
import type { CaseFile } from "@/lib/case/types";
import { useT } from "@/lib/i18n/context";

interface Outcome {
  disposition?: string;
  extracted?: Record<string, unknown>;
  summary?: string;
  callEvalTag?: string;
  conversationEval?: Record<string, unknown>;
}

/**
 * The voice call as it actually happened: the recording, the transcript, and
 * the fields the agent believed it heard.
 *
 * The extraction is shown as a draft on purpose. It is a model's reading of a
 * distressed conversation, and presenting it as settled fact is how a wrong
 * amount or a wrong account number ends up in a police complaint.
 *
 * The capability that fetches a real call from the provider expires an hour
 * after it is issued and is bound to the browser session that made the call.
 * That is right for a key to somebody's recording and wrong as the only place
 * the conversation exists — an hour later, or on the phone they opened their
 * emailed link on, the tab had nothing to show and told them to make a new
 * call, as though the one they had made was gone.
 *
 * So the first successful read is written into the case. After that this panel
 * has three grades of answer and says which one it is giving:
 *
 *   · the live provider record, when the capability still works;
 *   · the copy saved with the case, when it does not — transcript and fields
 *     intact, and the recording named as no longer retrievable rather than
 *     rendered as a player that will fail silently;
 *   · nothing, when this case was never opened from a call.
 *
 * Losing the audio is disclosed rather than hidden, because a person who agreed
 * to be recorded is entitled to know what became of the recording.
 */
export function CallRecord({ caseFile, transcriptToken, onApply, onCapture }: {
  caseFile: CaseFile;
  transcriptToken?: string;
  /** Fold the agent's late-arriving fields into the case. */
  onApply: (patch: Partial<CaseFile>) => void;
  /** Keep the conversation with the case, so it outlives the capability. */
  onCapture?: (patch: Partial<CaseFile>) => void;
}) {
  const t = useT();
  const [applied, setApplied] = useState(false);
  const [token, setToken] = useState<string | null>(transcriptToken ?? null);
  // The sample case carries the call itself rather than a capability to fetch
  // one, so it renders with no key, no network and no provider dependency.
  const demo = caseFile.voiceCall?.demoCallId ? demoCall : null;
  // Seeded from the case, so a transcript that was captured once survives the
  // one-hour provider capability and opens on a device that never had one.
  const saved = caseFile.voiceCall;
  const [transcript, setTranscript] = useState<string | null>(saved?.transcript ?? null);
  const [outcome, setOutcome] = useState<Outcome | null>(saved?.outcome ?? null);
  const [state, setState] = useState<"idle" | "loading" | "pending" | "ready" | "stale" | "error">("idle");
  // A player handed an error page instead of audio fails silently, so a failed
  // load is surfaced with the reason and a retry rather than a dead control.
  const [audioError, setAudioError] = useState<null | "not-ready" | "expired" | "generic">(null);
  const [audioAttempt, setAudioAttempt] = useState(0);

  useEffect(() => {
    // The case carries its own capability, so an older case never borrows the
    // token of a call made afterwards. Only a case saved before that field
    // existed falls back to the session.
    if (transcriptToken) return;
    // Deferred: sessionStorage does not exist during the server render, and
    // setting state synchronously here would cascade a second render.
    queueMicrotask(() => setToken(readStoredVaaniSession()?.transcriptToken ?? null));
  }, [transcriptToken]);

  // Everything `load` reads that its own success then changes is held in a ref.
  // A dependency on the saved record would make the capture invalidate the
  // callback that wrote it, and the effect below would fetch the call forever.
  const capture = useRef(onCapture);
  const savedRef = useRef(saved);
  useEffect(() => {
    capture.current = onCapture;
    savedRef.current = saved;
  }, [onCapture, saved]);

  const load = useCallback(async () => {
    if (!token || demo) return;
    setState("loading");
    const post = (path: string) => fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    try {
      const [transcriptResponse, outcomeResponse] = await Promise.all([
        post("/api/vaani/transcript"),
        post("/api/vaani/outcome"),
      ]);

      const transcriptData = await transcriptResponse.json().catch(() => null) as { transcript?: string } | null;
      const outcomeData = await outcomeResponse.json().catch(() => null) as (Outcome & { error?: string }) | null;

      const freshTranscript = transcriptResponse.ok && transcriptData?.transcript
        ? transcriptData.transcript
        : null;
      const freshOutcome = outcomeResponse.ok && outcomeData ? outcomeData : null;
      if (freshTranscript) setTranscript(freshTranscript);
      if (freshOutcome) setOutcome(freshOutcome);

      // Written to the case as soon as there is anything worth keeping, so the
      // hour the capability lasts is enough for the record to become permanent.
      // Only when it differs from what is already stored: this runs on every
      // mount of the tab, and an identical rewrite would queue a save and a
      // network sync for nothing each time somebody looks at their own call.
      const kept = savedRef.current;
      const changed = (freshTranscript && freshTranscript !== kept?.transcript)
        || (freshOutcome && JSON.stringify({
          disposition: freshOutcome.disposition,
          summary: freshOutcome.summary,
          extracted: freshOutcome.extracted,
          callEvalTag: freshOutcome.callEvalTag,
          conversationEval: freshOutcome.conversationEval,
        }) !== JSON.stringify(kept?.outcome ?? null));
      if (changed) {
        capture.current?.({
          voiceCall: {
            ...(kept ?? { endedAt: new Date().toISOString() }),
            ...(freshTranscript ? { transcript: freshTranscript } : {}),
            ...(freshOutcome
              ? {
                outcome: {
                  disposition: freshOutcome.disposition,
                  summary: freshOutcome.summary,
                  extracted: freshOutcome.extracted,
                  callEvalTag: freshOutcome.callEvalTag,
                  conversationEval: freshOutcome.conversationEval,
                },
              }
              : {}),
            capturedAt: new Date().toISOString(),
          },
        });
      }

      // 425 is the provider saying "not finished", which is a wait, not a failure.
      if (transcriptResponse.status === 425 || outcomeResponse.status === 425) {
        setState(freshTranscript ? "ready" : "pending");
        return;
      }
      if (!transcriptResponse.ok && !outcomeResponse.ok) {
        // 401 is the capability having expired or belonging to another browser.
        // With a saved copy in hand that is not an error — it is the reason the
        // copy exists — so the panel says which record it is showing instead.
        if (transcriptResponse.status === 401) {
          setState(kept?.transcript || kept?.outcome ? "stale" : "pending");
          return;
        }
        setState("error");
        return;
      }
      setState("ready");
    } catch {
      const kept = savedRef.current;
      setState(kept?.transcript || kept?.outcome ? "stale" : "error");
    }
  }, [demo, token]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  /**
   * The player reports failure without the reason, so ask for the first byte
   * and read the status: an expired capability, a recording still processing,
   * and a genuine outage each get their own words below the player.
   */
  const diagnoseAudio = useCallback(async (src: string) => {
    try {
      const probe = await fetch(src, { headers: { Range: "bytes=0-0" } });
      await probe.body?.cancel().catch(() => undefined);
      if (probe.status === 401) setAudioError("expired");
      else if (probe.status === 425) setAudioError("not-ready");
      else setAudioError("generic");
    } catch {
      setAudioError("generic");
    }
  }, []);

  const retryAudio = useCallback(() => {
    setAudioError(null);
    setAudioAttempt((attempt) => attempt + 1);
  }, []);

  // What the agent captured, measured against the case as it stands now.
  const backfill = useMemo(
    () => (outcome?.extracted && Object.keys(outcome.extracted).length
      ? caseUpdatesFromCall(caseFile, mapVaaniCall(outcome.extracted))
      : null),
    [caseFile, outcome],
  );

  const hasSaved = Boolean(saved?.transcript || saved?.outcome);
  // True whenever what is on screen came out of the case rather than off the
  // provider — including on a device that never had a capability to expire.
  const showingSaved = !demo && hasSaved && (state === "stale" || !token);

  // No capability, no saved copy and not the sample: this case was never opened
  // from a call, which is a different sentence from "your call is gone".
  if (!token && !demo && !hasSaved) {
    return (
      <Panel title={t("call.title")} sub={t("call.sub")}>
        <p className="text-sm text-ink-2">{t("call.none")}</p>
      </Panel>
    );
  }

  // The recording is the only part that cannot be kept locally, so it is the
  // only part that can go missing. It is offered while the capability lasts.
  const liveAudio = demo
    ? demo.audio
    : token && state !== "stale"
      ? `/api/vaani/recording?token=${encodeURIComponent(token)}`
      : null;

  const shown = demo
    ? {
      transcript: demo.turns
        .map((turn) => `${turn.at ? `[${turn.at}] ` : ""}${turn.agent ? "AGENT" : "USER"}: ${turn.text}`)
        .join("\n"),
      outcome: { disposition: demo.disposition, extracted: demo.extracted, summary: demo.summary } as Outcome,
    }
    : { transcript, outcome };

  const extracted = Object.entries(shown.outcome?.extracted || {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <Panel title={t("call.title")} sub={t("call.sub")}>
      {!demo && state === "error" && <p role="alert" className="text-sm text-urgent-ink">{t("call.error")}</p>}
      {!demo && state === "pending" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-2 flex-1">{t("call.pending")}</p>
          <Button onClick={load} size="sm" variant="secondary">{t("call.refresh")}</Button>
        </div>
      )}
      {showingSaved && (
        <p className="rounded-ctl border border-info/30 bg-info-soft px-4 py-3 text-sm leading-[1.55] text-ink-2">
          {t("call.saved")}
        </p>
      )}

      <section className="mt-4">
        <h3 className="text-sm font-semibold">{t("call.recording")}</h3>
        <p className="mt-1 text-xs leading-[1.55] text-ink-3">
          {t(demo ? "call.recordingDemo" : liveAudio ? "call.recordingConsent" : "call.recordingGone")}
        </p>
        {liveAudio ? (
          <>
            <audio
              key={`${audioAttempt}:${liveAudio}`}
              controls
              preload="none"
              src={liveAudio}
              className="mt-2 w-full"
              onError={() => {
                setAudioError("generic");
                if (!demo) void diagnoseAudio(liveAudio);
              }}
            >
              {t("call.recordingNone")}
            </audio>
            {audioError && (
              <div className="mt-2 rounded-ctl border border-rule bg-raised px-3 py-3">
                <p role="alert" className="text-sm leading-[1.55] text-ink-2">
                  {t(audioError === "not-ready"
                    ? "call.audioNotReady"
                    : audioError === "expired" ? "call.audioExpired" : "call.audioFailed")}
                </p>
                <Button onClick={retryAudio} size="sm" variant="secondary" className="mt-2">
                  {t("call.audioRetry")}
                </Button>
              </div>
            )}
          </>
        ) : null}
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold">{t("call.transcript")}</h3>
        {shown.transcript ? (
          <div className="mt-2 max-h-80 overflow-y-auto rounded-ctl border border-rule bg-raised px-3 py-3">
            {shown.transcript.split("\n").filter((line) => line.trim()).map((line, index) => (
              <p key={index} className="text-sm leading-[1.6] text-ink-2 [&+p]:mt-2">{line}</p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-3">{t("call.transcriptNone")}</p>
        )}
      </section>

      <section className="mt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{t("call.extracted")}</h3>
          <span className="rounded-full border border-info/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-info">
            {t("call.draft")}
          </span>
        </div>
        <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("call.draftNote")}</p>

        {shown.outcome?.disposition && (
          <p className="mt-3 text-sm">
            <span className="text-ink-3">{t("call.disposition")}: </span>
            <span className="num font-semibold">{shown.outcome.disposition}</span>
          </p>
        )}
        {shown.outcome?.callEvalTag && (
          <p className="mt-2 text-sm">
            <span className="text-ink-3">{t("call.evalTag")}: </span>
            <span className="num font-semibold">{shown.outcome.callEvalTag}</span>
          </p>
        )}
        {shown.outcome?.summary && (
          <p className="mt-2 text-sm leading-[1.6] text-ink-2">
            <span className="text-ink-3">{t("call.summary")}: </span>{shown.outcome.summary}
          </p>
        )}

        {extracted.length ? (
          <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,14rem)_1fr]">
            {extracted.map(([field, value]) => (
              <div key={field} className="contents">
                <dt className="text-sm text-ink-3">{field.replace(/_/g, " ")}</dt>
                <dd className="text-sm text-ink-2 break-words">
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-ink-3">{t("call.extractedNone")}</p>
        )}

        {shown.outcome?.conversationEval && Object.keys(shown.outcome.conversationEval).length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-ink-3">{t("call.conversationEval")}</p>
            <dl className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,14rem)_1fr]">
              {Object.entries(shown.outcome.conversationEval).map(([field, value]) => (
                <div key={field} className="contents">
                  <dt className="text-sm text-ink-3">{field.replace(/_/g, " ")}</dt>
                  <dd className="text-sm text-ink-2 break-words">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      {!demo && backfill && backfill.added.length > 0 && !applied && (
        <div className="mt-5 rounded-ctl border border-info/30 bg-info-soft px-4 py-3">
          <p className="text-sm leading-[1.55] text-ink-2">
            {t("call.applyLead")} {backfill.added.join(" · ")}
          </p>
          <Button
            onClick={() => { onApply(backfill.patch); setApplied(true); }}
            size="sm"
            className="mt-3"
          >
            {t("call.apply")}
          </Button>
        </div>
      )}
      {applied && <p className="mt-5 text-sm text-done">{t("call.applied")}</p>}

      {!demo && state !== "stale" && (
        <Button onClick={load} size="sm" variant="secondary" className="mt-5" disabled={state === "loading"}>
          {t("call.refresh")}
        </Button>
      )}
    </Panel>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-rule bg-raised px-5 py-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-[1.55] text-ink-3">{sub}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}
