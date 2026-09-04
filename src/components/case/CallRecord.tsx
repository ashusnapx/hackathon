"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { readStoredVaaniSession } from "@/lib/integrations/vaani-client";
import { useT } from "@/lib/i18n/context";

interface Outcome {
  disposition?: string;
  extracted?: Record<string, unknown>;
  summary?: string;
}

/**
 * The voice call as it actually happened: the provider's recording, the
 * transcript, and the fields the agent believed it heard.
 *
 * The extraction is shown as a draft on purpose. It is a model's reading of a
 * distressed conversation, and presenting it as settled fact is how a wrong
 * amount or a wrong account number ends up in a police complaint.
 */
export function CallRecord() {
  const t = useT();
  const [token, setToken] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "pending" | "ready" | "error">("idle");

  useEffect(() => {
    // Deferred: sessionStorage does not exist during the server render, and
    // setting state synchronously here would cascade a second render.
    queueMicrotask(() => setToken(readStoredVaaniSession()?.transcriptToken ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
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

      if (transcriptResponse.ok && transcriptData?.transcript) setTranscript(transcriptData.transcript);
      if (outcomeResponse.ok && outcomeData) setOutcome(outcomeData);

      // 425 is the provider saying "not finished", which is a wait, not a failure.
      if (transcriptResponse.status === 425 || outcomeResponse.status === 425) {
        setState(transcriptData?.transcript ? "ready" : "pending");
        return;
      }
      if (!transcriptResponse.ok && !outcomeResponse.ok) {
        setState(transcriptResponse.status === 401 ? "pending" : "error");
        return;
      }
      setState("ready");
    } catch {
      setState("error");
    }
  }, [token]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  if (!token) {
    return (
      <Panel title={t("call.title")} sub={t("call.sub")}>
        <p className="text-sm text-ink-2">{t("call.none")}</p>
      </Panel>
    );
  }

  const extracted = Object.entries(outcome?.extracted || {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <Panel title={t("call.title")} sub={t("call.sub")}>
      {state === "error" && <p role="alert" className="text-sm text-urgent-ink">{t("call.error")}</p>}
      {state === "pending" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-2 flex-1">{t("call.pending")}</p>
          <Button onClick={load} size="sm" variant="secondary">{t("call.refresh")}</Button>
        </div>
      )}

      <section className="mt-4">
        <h3 className="text-sm font-semibold">{t("call.recording")}</h3>
        <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("call.recordingConsent")}</p>
        <audio
          controls
          preload="none"
          src={`/api/vaani/recording?token=${encodeURIComponent(token)}`}
          className="mt-2 w-full"
        >
          {t("call.recordingNone")}
        </audio>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold">{t("call.transcript")}</h3>
        {transcript ? (
          <div className="mt-2 max-h-80 overflow-y-auto rounded-ctl border border-rule bg-raised px-3 py-3">
            {transcript.split("\n").filter((line) => line.trim()).map((line, index) => (
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

        {outcome?.disposition && (
          <p className="mt-3 text-sm">
            <span className="text-ink-3">{t("call.disposition")}: </span>
            <span className="num font-semibold">{outcome.disposition}</span>
          </p>
        )}
        {outcome?.summary && (
          <p className="mt-2 text-sm leading-[1.6] text-ink-2">
            <span className="text-ink-3">{t("call.summary")}: </span>{outcome.summary}
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
      </section>

      <Button onClick={load} size="sm" variant="secondary" className="mt-5" disabled={state === "loading"}>
        {t("call.refresh")}
      </Button>
    </Panel>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-rule bg-surface px-5 py-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-[1.55] text-ink-3">{sub}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}
