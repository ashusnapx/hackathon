"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import type { CheckResult } from "@/lib/check/signals";
import { cn } from "@/lib/utils";

/**
 * The only screen in Kavach that runs before the money is gone.
 *
 * Everything else here is repair. This is the one place a person arrives while
 * they still have a choice, which makes the writing rule different: no long
 * explanations, no forms, one sentence they can act on while somebody is still
 * on the phone with them.
 */

interface ModelVerdict {
  isLikelyFraud: boolean;
  scamName: string;
  confidence: number;
  plainVerdict: string;
  tells: string[];
  doNow: string[];
}

const EXAMPLES = ["check.ex1", "check.ex2", "check.ex3"] as const;

const SUSPECT_REPO = "https://cybercrime.gov.in/Webform/suspect_search_repository.aspx";

export default function CheckPage() {
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ rules: CheckResult; model: ModelVerdict | null; source: string } | null>(null);
  const [aiLive, setAiLive] = useState<boolean | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/ai/status").then((r) => r.json()).then((d) => setAiLive(Boolean(d.configured))).catch(() => setAiLive(false));
  }, []);

  const run = useCallback(async () => {
    if (!text.trim()) return taRef.current?.focus();
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch("/api/ai/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: lang.code }),
      });
      setRes(await r.json());
    } finally {
      setBusy(false);
    }
  }, [lang.code, text]);

  const verdict = res?.rules.verdict;
  const tone =
    verdict === "danger"
      ? { border: "border-urgent", bg: "bg-urgent-soft", ink: "text-urgent" }
      : verdict === "caution"
        ? { border: "border-wait/40", bg: "bg-wait-soft", ink: "text-wait" }
        : { border: "border-rule-strong", bg: "bg-sunk", ink: "text-ink-2" };

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3 sm:pt-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-3xl rounded-card border border-ink/15 bg-paper/85 backdrop-blur-xl shadow-[0_6px_24px_-18px_rgba(26,26,26,0.55)] px-3 sm:px-4 h-[60px] sm:h-[64px] flex items-center gap-4">
          <Wordmark />
          <div className="ms-auto">
            <LanguageSwitcher compact />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-16">
        <p className="label">{t("check.kicker")}</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{t("check.h1")}</h1>
        <p className="mt-5 text-[1.0625rem] leading-[1.65] text-ink-2 max-w-xl">{t("check.sub")}</p>

        <div className="mt-9">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={t("check.placeholder")}
            aria-label={t("check.h1")}
            className="w-full p-4 bg-raised border border-rule-strong rounded-ctl text-[1.0625rem] leading-[1.6] resize-y placeholder:text-ink-3/60 focus:outline-none focus:ring-1 focus:border-ink focus:ring-ink"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={busy} size="lg">
              {busy ? `${t("check.checking")}…` : t("check.cta")}
            </Button>
            {res && (
              <button
                onClick={() => { setRes(null); setText(""); taRef.current?.focus(); }}
                className="text-sm text-ink-3 hover:text-ink underline underline-offset-4"
              >
                {t("check.again")}
              </button>
            )}
          </div>

          {!res && !busy && (
            <div className="mt-8">
              <p className="label">{t("check.tryTitle")}</p>
              <div className="mt-3 flex flex-col gap-2">
                {EXAMPLES.map((k) => (
                  <button
                    key={k}
                    onClick={() => { setText(t(k)); taRef.current?.focus(); }}
                    className="text-start text-[0.9375rem] leading-snug text-ink-2 hover:text-ink border border-rule rounded-ctl px-4 py-3 hover:border-rule-strong transition-colors"
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {busy && <div className="mt-8 h-0.5 bg-sunk overflow-hidden sweep" aria-hidden />}

        {res && (
          <div className="mt-10 space-y-6 rise">
            <section className={cn("sheet overflow-hidden", tone.border)}>
              <div className={cn("px-5 py-4 border-b border-rule", tone.bg)}>
                <p className="label">{t("check.verdictLabel")}</p>
                <h2 className={cn("mt-1.5 text-2xl sm:text-3xl leading-tight", tone.ink)}>
                  {verdict === "danger"
                    ? t("check.v.danger")
                    : verdict === "caution"
                      ? t("check.v.caution")
                      : t("check.v.none")}
                </h2>
                {res.model?.scamName && (
                  <p className="mt-2 num text-sm text-ink-2">{res.model.scamName}</p>
                )}
              </div>

              <div className="px-5 py-5 space-y-5">
                {res.model?.plainVerdict && (
                  <p className="text-[1.0625rem] leading-[1.65]">{res.model.plainVerdict}</p>
                )}

                {verdict === "nothing-found" && (
                  <p className="text-[0.9375rem] leading-[1.65] text-ink-2">{t("check.noneBody")}</p>
                )}

                {res.rules.signals.length > 0 && (
                  <div>
                    <p className="label">{t("check.signals")}</p>
                    <ul className="mt-3 divide-y divide-rule border-t border-rule">
                      {res.rules.signals.map((s) => (
                        <li key={s.id} className="py-3.5 flex items-start gap-3">
                          <span
                            className={cn(
                              "num text-[0.6875rem] uppercase tracking-wider px-1.5 py-0.5 rounded-ctl border shrink-0 mt-0.5",
                              s.severity === "high"
                                ? "bg-urgent-soft text-urgent-ink border-urgent/30"
                                : "bg-wait-soft text-wait border-wait/30",
                            )}
                          >
                            {t(s.severity === "high" ? "check.high" : "check.medium")}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[0.9375rem] font-medium leading-snug">{s.title}</span>
                            <span className="mt-1 block text-[0.9375rem] leading-[1.6] text-ink-2">{s.detail}</span>
                            {s.evidence && (
                              <span className="mt-1.5 block num text-xs text-ink-3 break-all">{s.evidence}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {res.model?.doNow?.length ? (
                  <div>
                    <p className="label">{t("check.doNow")}</p>
                    <ol className="mt-3 space-y-2">
                      {res.model.doNow.map((d, i) => (
                        <li key={i} className="flex gap-3 text-[0.9375rem] leading-[1.6]">
                          <span className="num text-ink-3 shrink-0">{i + 1}</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            </section>

            {/* The authoritative list is I4C's, not ours, and we say so rather
                than shipping a stale copy of it. */}
            <section className="sheet px-5 py-5">
              <p className="label">{t("check.officialTitle")}</p>
              <p className="mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">{t("check.officialBody")}</p>

              {res.rules.identifiers.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {res.rules.identifiers.slice(0, 8).map((id) => (
                    <li key={`${id.kind}-${id.value}`} className="num text-xs px-2 py-1 border border-rule rounded-ctl text-ink-2 break-all">
                      {id.value}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button href={SUSPECT_REPO} size="sm" variant="secondary" external>
                  {t("check.openRepo")}
                </Button>
                <Button href="https://sancharsaathi.gov.in/sfc/" size="sm" variant="ghost" external>
                  {t("check.reportChakshu")}
                </Button>
              </div>
            </section>

            <section className="sheet px-5 py-5 border-urgent/30">
              <p className="text-[0.9375rem] leading-[1.65] text-ink-2">{t("check.alreadyPaid")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="tel:1930" size="sm" variant="urgent" external>{t("sos.call")}</Button>
                <Button href="/report" size="sm">{t("check.startCase")}</Button>
              </div>
            </section>

            <p className="text-sm text-ink-3">
              {t("check.honesty")}
              {res.source === "rules" && ` · ${t("g.demoMode")}`}
            </p>
          </div>
        )}

        {aiLive === false && !res && (
          <p className="mt-8 sheet px-4 py-3 text-sm text-ink-2 bg-wait-soft border-wait/30">{t("g.demoMode")}</p>
        )}
      </main>
    </>
  );
}
