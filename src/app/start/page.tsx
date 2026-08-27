"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { VoiceInput } from "@/components/start/VoiceInput";
import { TriageResult } from "@/components/start/TriageResult";
import { useI18n } from "@/lib/i18n/context";
import { activeCaseId, newCase, saveCase } from "@/lib/case/store";
import type { Entities, Triage } from "@/lib/case/types";
import { cn } from "@/lib/utils";

const EXAMPLES = ["start.ex1", "start.ex2", "start.ex3", "start.ex4", "start.ex5"] as const;
const STAGES = ["start.analysing", "start.analysing2", "start.analysing3"] as const;

export default function StartPage() {
  const { t, lang } = useI18n();
  const router = useRouter();

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "working" | "result">("input");
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ triage: Triage; entities: Entities; source: string } | null>(null);
  const [existing, setExisting] = useState<string | null>(null);
  const [aiLive, setAiLive] = useState<boolean | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setExisting(activeCaseId());
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => setAiLive(Boolean(d.configured)))
      .catch(() => setAiLive(false));
  }, []);

  // Rotate the progress copy so a five-second wait reads as work, not a hang.
  useEffect(() => {
    if (phase !== "working") return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1600);
    return () => clearInterval(id);
  }, [phase]);

  const appendSpeech = useCallback((chunk: string) => {
    setText((prev) => (prev ? `${prev.trim()} ${chunk}` : chunk));
  }, []);

  const submit = useCallback(async () => {
    if (text.trim().length < 25) {
      setError(t("start.tooShort"));
      taRef.current?.focus();
      return;
    }
    setError(null);
    setStage(0);
    setPhase("working");
    try {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: lang.code }),
      });
      if (!res.ok) throw new Error("triage failed");
      setResult(await res.json());
      setPhase("result");
    } catch {
      setError(t("start.error"));
      setPhase("input");
    }
  }, [lang.code, t, text]);

  const createCase = useCallback(
    (triage: Triage, entities: Entities, amount?: number, incidentAt?: string) => {
      const c = newCase({
        language: lang.code,
        rawStatement: text.trim(),
        triage,
        entities,
        amount,
        incidentAt: incidentAt || triage.incidentAt,
        // Everything the extractor found is provisionally attributed to the
        // suspect; the builder screen asks the citizen to confirm.
        suspect: {
          phones: entities.phones,
          upiIds: entities.upiIds,
          accounts: entities.accounts,
          urls: entities.urls,
          handles: entities.handles,
        },
      });
      c.events.push({ at: new Date().toISOString(), kind: "triaged", label: "Classified and deadlines started" });
      saveCase(c);
      router.push(`/case/${c.id}`);
    },
    [lang.code, router, text],
  );

  return (
    <>
      <header className="border-b border-rule sticky top-0 z-40 bg-paper/92 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 h-[68px] flex items-center gap-4">
          <Wordmark />
          <div className="ms-auto">
            <LanguageSwitcher compact />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-16">
        {aiLive === false && (
          <p className="mb-8 sheet px-4 py-3 text-sm text-ink-2 bg-wait-soft border-wait/30">
            {t("g.demoMode")}
          </p>
        )}

        {existing && phase === "input" && (
          <div className="mb-8 sheet px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <p className="text-[0.9375rem] flex-1 min-w-[12rem]">{t("start.resume")}</p>
            <Button href={`/case/${existing}`} size="sm" variant="secondary">{t("start.resumeCta")}</Button>
            <button onClick={() => setExisting(null)} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
              {t("start.resumeNew")}
            </button>
          </div>
        )}

        {phase === "result" && result ? (
          <TriageResult
            triage={result.triage}
            entities={result.entities}
            source={result.source}
            statement={text}
            onBack={() => setPhase("input")}
            onConfirm={createCase}
          />
        ) : (
          <>
            <h1 className="text-4xl sm:text-5xl">{t("start.h1")}</h1>
            <p className="mt-5 text-[1.0625rem] leading-[1.65] text-ink-2 max-w-xl">{t("start.sub")}</p>

            <div className={cn("mt-10 transition-opacity", phase === "working" && "opacity-40 pointer-events-none")}>
              <div className="flex justify-center py-6">
                <VoiceInput onResult={appendSpeech} disabled={phase === "working"} />
              </div>

              <div className="flex items-center gap-4 my-6">
                <div className="h-px flex-1 bg-rule" />
                <span className="label">{t("start.or")}</span>
                <div className="h-px flex-1 bg-rule" />
              </div>

              <div className="relative">
                <textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError(null);
                  }}
                  rows={7}
                  placeholder={t("start.placeholder")}
                  aria-label={t("start.h1")}
                  className={cn(
                    "w-full p-4 bg-raised border rounded-[3px] text-[1.0625rem] leading-[1.6] resize-y",
                    "placeholder:text-ink-3/60 focus:outline-none focus:ring-1",
                    error ? "border-urgent focus:border-urgent focus:ring-urgent" : "border-rule-strong focus:border-ink focus:ring-ink",
                  )}
                />
                <span className="absolute bottom-3 end-3 num text-xs text-ink-3 pointer-events-none">
                  {text.trim().length}
                </span>
              </div>

              {error && <p className="mt-2 text-sm text-urgent">{error}</p>}

              <p className="mt-4 text-sm leading-snug text-ink-3 border-s-2 border-rule-strong ps-3">
                {t("start.privacy")}
              </p>

              <div className="mt-8">
                <p className="label">{t("start.examples")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXAMPLES.map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setText(t(k));
                        setError(null);
                        taRef.current?.focus();
                      }}
                      className="text-start text-sm px-3 py-2 border border-rule rounded-[3px] bg-raised hover:border-ink hover:bg-sunk transition-colors max-w-full"
                    >
                      {t(k)}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={submit} size="lg" full className="mt-10">
                {t("start.submit")}
              </Button>
            </div>

            {phase === "working" && (
              <div className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-raised">
                <div className="mx-auto max-w-3xl px-5 sm:px-8 py-4 flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full bg-urgent opacity-70 pulse-ring" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-urgent" />
                  </span>
                  <p aria-live="polite" className="text-[0.9375rem]">{t(STAGES[stage])}…</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
