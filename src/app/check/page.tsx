"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import type { CheckResult } from "@/lib/check/signals";
import {
  SUSPECT_REPO_BOOKMARKLET,
  SUSPECT_REPO_URL,
  SUSPECT_WEBSITE_URL,
  repoCopyAll,
  repoLabel,
  repoValue,
} from "@/lib/check/suspect-repo";
import { AdvisoryBoard } from "./AdvisoryBoard";
import { WarningBoard } from "./WarningBoard";
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

interface CheckResponse {
  rules: CheckResult;
  model: ModelVerdict | null;
  source: string;
  verdict?: CheckResult["verdict"];
  riskScore?: number;
}

const SCAM_LABEL: Record<string, string> = {
  "digital-arrest": "Digital arrest / authority scam",
  "kyc-block": "KYC / account-block scam",
  "utility-block": "Utility or SIM-block threat",
  "parcel-customs": "Fake parcel / customs",
  "job-task": "Job / task fraud",
  investment: "Investment fraud",
  "lottery-prize": "Lottery / prize / refund fee",
  "upi-inversion": "UPI / QR-to-receive trick",
  "advance-fee": "Advance-fee fraud",
  "remote-apk": "Remote-access / APK takeover",
  "customer-care": "Fake customer care",
  "romance-sextortion": "Blackmail / sextortion",
  "mule-rent": "Money-mule recruitment",
  "govt-scheme": "Fake government scheme",
  "loan-app": "Fake loan app",
  "phishing-link": "Fake link / phishing",
  unknown: "",
};

const EXAMPLES = ["check.ex1", "check.ex2", "check.ex3", "check.ex4"] as const;

export default function CheckPage() {
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CheckResponse | null>(null);
  const [aiLive, setAiLive] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [portalHint, setPortalHint] = useState<string | null>(null);
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

  // Radar "test this" loads the sample into the checker, ready to run.
  const trySample = useCallback((sample: string) => {
    setRes(null);
    setText(sample);
    taRef.current?.focus();
    document.getElementById("check-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const verdict = res?.verdict ?? res?.rules.verdict;
  // The fused verdict already merges rules + model server-side; the page must
  // never downgrade it back to rules alone (that was the false-green bug).
  const riskScore = res?.riskScore ?? res?.rules.riskScore ?? 0;
  const scamFamily = res?.rules.scamType ? (SCAM_LABEL[res.rules.scamType] ?? "") : "";
  const disagree = Boolean(res?.model && res.rules.verdict !== (res.verdict ?? res.rules.verdict));
  const tone =
    verdict === "danger"
      ? { border: "border-urgent", bg: "bg-urgent-soft", ink: "text-urgent" }
      : verdict === "caution"
        ? { border: "border-wait/40", bg: "bg-wait-soft", ink: "text-wait" }
        : { border: "border-rule-strong", bg: "bg-sunk", ink: "text-ink-2" };

  return (
    <>
      <SiteHeader width="6xl" />

      <main id="main" className="mx-auto max-w-6xl px-5 sm:px-8 py-10 sm:py-16">
        <div id="check-top" className="max-w-3xl">
          <p className="label">{t("check.kicker")}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">{t("check.h1")}</h1>
          <p className="mt-5 text-[1.0625rem] leading-[1.65] text-ink-2 max-w-xl">{t("check.sub")}</p>
        </div>

        <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px] items-start">
          <div className="min-w-0 max-w-3xl">
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
                {res.model?.scamName ? (
                  <p className="mt-2 num text-sm text-ink-2">{res.model.scamName}</p>
                ) : scamFamily ? (
                  <p className="mt-2 num text-sm text-ink-2">{scamFamily}</p>
                ) : null}
                <div className="mt-3" aria-label={`${t("check.riskLabel")} ${riskScore} ${t("check.riskOf")}`}>
                  <div className="flex items-baseline justify-between text-xs text-ink-3">
                    <span>{t("check.riskLabel")}</span>
                    <span className="num">{riskScore} {t("check.riskOf")}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-rule overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        verdict === "danger" ? "bg-urgent" : verdict === "caution" ? "bg-wait" : "bg-ink-3/50",
                      )}
                      style={{ width: `${Math.max(4, Math.min(100, riskScore))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-3">{t("check.riskHow")}</p>
                </div>
                {disagree && (
                  <p className="mt-3 text-[0.9375rem] leading-[1.6] text-ink-2 border-l-2 border-wait pl-3">{t("check.disagree")}</p>
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

                {res.model?.tells?.length ? (
                  <div>
                    <p className="label">{t("check.tellsTitle")}</p>
                    <ul className="mt-3 space-y-2">
                      {res.model.tells.map((tell, i) => (
                        <li key={i} className="flex gap-3 text-[0.9375rem] leading-[1.6]">
                          <span className="text-urgent shrink-0" aria-hidden>▸</span>
                          <span>{tell}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

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
                <ul className="mt-4 flex flex-col gap-2">
                  {res.rules.identifiers.slice(0, 8).map((id) => {
                    const key = `${id.kind}-${id.value}`;
                    return (
                      <li key={key} className="flex items-center gap-2 min-w-0">
                        <span className="num text-[0.6875rem] uppercase tracking-wider px-1.5 py-0.5 rounded-ctl border border-rule text-ink-3 shrink-0">{repoLabel(id.kind)}</span>
                        <span className="num text-xs text-ink-2 break-all flex-1 min-w-0">{repoValue(id)}</span>
                        <button
                          onClick={() => {
                            void navigator.clipboard?.writeText(repoValue(id)).then(() => {
                              setCopied(key);
                              setPortalHint(null);
                              setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
                            });
                          }}
                          className="text-xs text-ink-3 hover:text-ink underline underline-offset-4 shrink-0"
                        >
                          {copied === key ? "✓" : t("check.copyId")}
                        </button>
                        {id.kind !== "url" && (
                          <button
                            onClick={() => {
                              const v = repoValue(id);
                              void navigator.clipboard?.writeText(v).then(() => {
                                window.open(SUSPECT_REPO_URL, "_blank", "noopener");
                                setPortalHint(`${t("check.repoGoHint1")} ${v} ${t("check.repoGoHint2")} ${repoLabel(id.kind)}, ${t("check.repoGoHint3")}.`);
                              });
                            }}
                            className="text-xs font-medium text-ink-2 hover:text-ink underline underline-offset-4 shrink-0"
                          >
                            {t("check.repoPortalGo")} ↗
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {res.rules.identifiers.some((id) => id.kind === "url") && (
                <p className="mt-3 text-sm leading-relaxed text-ink-3">
                  {t("check.repoWebNote")}{" "}
                  <a href={SUSPECT_WEBSITE_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-ink">
                    {t("check.repoWebOpen")}
                  </a>
                </p>
              )}

              <details className="mt-4">
                <summary className="text-sm text-ink-3 hover:text-ink underline underline-offset-4 cursor-pointer">{t("check.checkedTitle")}</summary>
                <p className="mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">{t("check.checkedBody")}</p>
              </details>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard?.writeText(repoCopyAll(res.rules.identifiers)).then(() => {
                      setCopied("all");
                      setPortalHint(null);
                      setTimeout(() => setCopied((c) => (c === "all" ? null : c)), 1500);
                    });
                  }}
                >
                  {copied === "all" ? "✓" : t("check.repoCopyAll")}
                </Button>
                <Button href={SUSPECT_REPO_URL} size="sm" variant="secondary" external>
                  {t("check.openRepo")}
                </Button>
                <Button href="https://sancharsaathi.gov.in/sfc/" size="sm" variant="ghost" external>
                  {t("check.reportChakshu")}
                </Button>
              </div>
              {portalHint && (
                <p className="mt-3 sheet px-4 py-3 text-sm text-ink-2 bg-wait-soft border-wait/30" role="status">{portalHint}</p>
              )}

              {/* The portal's search is an ASP.NET form behind a captcha: there
                  is no query string to hand it values in, and no cross-origin
                  script can reach it. A bookmarklet is the one mechanism that
                  can, and it runs on the citizen's own click, on the page in
                  front of them, sending nothing anywhere. Said in as many words
                  before anybody installs it — a "click this to auto-fill a
                  government site" button with no explanation is the exact shape
                  of the thing this page exists to warn people about. */}
              <details className="mt-5 border-t border-rule pt-4">
                <summary className="cursor-pointer text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
                  {t("check.fillTitle")}
                </summary>
                <p className="mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">{t("check.fillBody")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={SUSPECT_REPO_BOOKMARKLET}
                    draggable
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex h-11 cursor-grab items-center rounded-ctl border border-ink bg-ink px-4 text-[0.9375rem] font-semibold text-paper active:cursor-grabbing"
                  >
                    {t("check.fillButton")}
                  </a>
                  <span className="text-sm text-ink-3">{t("check.fillHow")}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">{t("check.fillSafety")}</p>
              </details>
            </section>

            <section className="sheet px-5 py-5 border-urgent/30">
              <p className="text-[0.9375rem] leading-[1.65] text-ink-2">{t("check.alreadyPaid")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="tel:1930" size="sm" variant="urgent" external>{t("sos.call")}</Button>
                <Button href="/assist" size="sm">{t("check.startCase")}</Button>
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
          </div>

          <div className="space-y-6 lg:sticky lg:top-20 self-start">
            <AdvisoryBoard onTry={trySample} />
            <WarningBoard rules={res?.rules ?? null} model={res?.model ?? null} onTry={trySample} />
          </div>
        </div>
      </main>
    </>
  );
}
