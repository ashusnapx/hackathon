"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadCasePack } from "@/lib/case/pack";
import { downloadLetter } from "@/lib/case/letter";
import { completeness } from "@/lib/case/tracks";
import { useI18n } from "@/lib/i18n/context";
import type { CaseDocs, CaseFile } from "@/lib/case/types";
import { cn, writeToClipboard } from "@/lib/utils";
import { useIsClient } from "@/lib/useIsClient";

type DocKey = "ncrp" | "script" | "bank" | "fir" | "chakshu" | "mrm" | "ombudsman";

const DOCS: { key: DocKey; title: Parameters<ReturnType<typeof useI18n>["t"]>[0]; blurb: Parameters<ReturnType<typeof useI18n>["t"]>[0] }[] = [
  { key: "ncrp", title: "doc.ncrp.t", blurb: "doc.ncrp.b" },
  { key: "script", title: "doc.script.t", blurb: "doc.script.b" },
  { key: "bank", title: "doc.bank.t", blurb: "doc.bank.b" },
  { key: "fir", title: "doc.fir.t", blurb: "doc.fir.b" },
  { key: "chakshu", title: "doc.chakshu.t", blurb: "doc.chakshu.b" },
  { key: "mrm", title: "doc.mrm.t", blurb: "doc.mrm.b" },
  { key: "ombudsman", title: "doc.ombudsman.t", blurb: "doc.ombudsman.b" },
];

interface Props {
  caseFile: CaseFile;
  update: (patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => void;
}

export function DocumentsPanel({ caseFile, update }: Props) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<DocKey>("ncrp");

  const has = Boolean(caseFile.docs.generatedAt);
  const { score } = completeness(caseFile);

  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseFile }),
      });
      const data = await res.json();
      update((c) => ({
        docs: {
          ...(data.docs as CaseDocs),
          generatedAt: new Date().toISOString(),
          generatedBy: data.source,
          // A regenerate invalidates the old translations rather than leaving a
          // stale vernacular copy next to fresh English.
          translated: {},
        },
        events: [...c.events, { at: new Date().toISOString(), kind: "docs" as const, label: "Documents generated" }],
      }));
    } finally {
      setBusy(false);
    }
  }, [caseFile, update]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">{t("case.docsTitle")}</h2>
          <p className="mt-1.5 text-[0.9375rem] text-ink-2 max-w-xl">{t("case.docsSub")}</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Button onClick={generate} disabled={busy} size="sm">
            {busy ? `${t("doc.generating")}…` : has ? t("doc.regenerate") : t("doc.generate")}
          </Button>
          {has && (
            <Button onClick={() => downloadCasePack(caseFile)} size="sm" variant="secondary">
              {t("case.download")}
            </Button>
          )}
        </div>
      </div>

      {score < 55 && (
        <p className="mt-5 sheet px-4 py-3 text-sm text-ink-2 bg-wait-soft border-wait/30">
          {t("doc.needsLabel")} — {t("case.completenessSub")}
        </p>
      )}

      {!has ? (
        <div className="mt-8 sheet px-6 py-14 text-center">
          <p className="text-ink-2 max-w-md mx-auto leading-relaxed">{t("case.docsSub")}</p>
          <Button onClick={generate} disabled={busy} size="lg" className="mt-6">
            {busy ? `${t("doc.generating")}…` : t("doc.generate")}
          </Button>
          {busy && (
            <div className="relative mt-6 h-0.5 max-w-xs mx-auto bg-sunk overflow-hidden sweep" aria-hidden />
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-1 border-b border-rule swipe-x no-bar no-print" role="tablist">
            {DOCS.map((d) => (
              <button
                key={d.key}
                role="tab"
                aria-selected={active === d.key}
                onClick={() => setActive(d.key)}
                className={cn(
                  "px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors -mb-px border-b-2",
                  active === d.key ? "border-ink text-ink font-medium" : "border-transparent text-ink-3 hover:text-ink",
                )}
              >
                {t(d.title)}
              </button>
            ))}
          </div>

          {DOCS.filter((d) => d.key === active).map((d) => (
            <Document
              key={d.key}
              docKey={d.key}
              caseRef={caseFile.ref}
              title={t(d.title)}
              blurb={t(d.blurb)}
              body={caseFile.docs[d.key] ?? ""}
              translated={caseFile.docs.translated?.[d.key]}
              targetLang={lang.code}
              onTranslated={(text) =>
                update((c) => ({
                  docs: { ...c.docs, translated: { ...(c.docs.translated ?? {}), [d.key]: text } },
                }))
              }
            />
          ))}

          <p className="mt-5 text-sm text-ink-3">
            {t("g.aiNote")}
            {caseFile.docs.generatedBy === "rules" && ` · ${t("g.demoMode")}`}
          </p>
        </>
      )}
    </section>
  );
}

function Document({
  docKey, caseRef, title, blurb, body, translated, targetLang, onTranslated,
}: {
  docKey: DocKey;
  caseRef: string;
  title: string;
  blurb: string;
  body: string;
  translated?: string;
  targetLang: string;
  onTranslated: (text: string) => void;
}) {
  const { t } = useI18n();
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
  // navigator.share only exists on the client, and only over HTTPS.
  const canShare = useIsClient() && !!navigator.share;
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);

  /**
   * Copying the complaint out is the single most important action on this
   * screen — it is how the text reaches the NCRP portal. `navigator.clipboard`
   * is not available in every Android WebView, and it rejects outright in the
   * in-app browsers inside WhatsApp and Instagram, which is exactly how a link
   * like this gets opened. So there is a fallback, and a visible failure.
   */
  const copy = async () => {
    const ok = await writeToClipboard(body);
    setCopyState(ok ? "done" : "failed");
    setTimeout(() => setCopyState("idle"), ok ? 1800 : 4000);
  };

  /**
   * Typeset, not dumped. A station clerk who is handed a printed .txt file reads
   * it as somebody's notes; the same words with margins, a subject line and a
   * signature block read as an application. Copy and share still carry the plain
   * text, which is what a portal box and WhatsApp actually want.
   */
  const download = () =>
    downloadLetter(body, { title, caseRef, filename: `kavach-${docKey}-${caseRef}.pdf` });

  /** On a phone the useful destination is usually WhatsApp, not the filesystem. */
  const share = async () => {
    try {
      await navigator.share({ title, text: body });
    } catch {
      /* dismissed, or the share sheet is unavailable — copy is still there */
    }
  };

  const translate = async () => {
    if (translated) {
      setShowTranslation((s) => !s);
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, target: targetLang }),
      });
      const data = await res.json();
      if (data.translated) {
        onTranslated(data.translated);
        setShowTranslation(true);
      }
    } finally {
      setTranslating(false);
    }
  };

  return (
    <article className="mt-6 sheet overflow-hidden rise">
      <div className="px-5 py-4 border-b border-rule bg-sunk">
        <h3 className="text-lg">{title}</h3>
        <p className="mt-1.5 text-sm leading-snug text-ink-2 max-w-2xl">{blurb}</p>
      </div>

      <div className="px-5 py-3 border-b border-rule flex flex-wrap items-center gap-2 no-print">
        <Button onClick={copy} size="sm" variant={copyState === "failed" ? "urgent" : "secondary"}>
          {copyState === "done"
            ? t("doc.copied")
            : copyState === "failed"
              ? "Select the text below and copy"
              : t("doc.copy")}
        </Button>
        {canShare && (
          <Button onClick={share} size="sm" variant="ghost">{t("doc.share")}</Button>
        )}
        <Button onClick={download} size="sm" variant="secondary">{t("doc.downloadPdf")}</Button>
        <Button onClick={() => window.print()} size="sm" variant="ghost">{t("doc.print")}</Button>

        {targetLang !== "en" && (
          <Button onClick={translate} size="sm" variant="ghost" disabled={translating} className="ms-auto">
            {translating ? `${t("doc.generating")}…` : showTranslation ? t("doc.inEnglish") : t("doc.inYourLang")}
          </Button>
        )}
      </div>

      {showTranslation && translated ? (
        <>
          <p className="px-5 pt-4 text-sm text-ink-3">{t("doc.whyEnglish")}</p>
          <pre className="px-5 py-4 whitespace-pre-wrap text-[0.9375rem] leading-[1.75] font-sans">{translated}</pre>
        </>
      ) : (
        <pre className="px-5 py-5 whitespace-pre-wrap break-words text-[0.875rem] leading-[1.7] font-mono swipe-x no-bar">
          {body}
        </pre>
      )}

      <p className="px-5 py-2.5 border-t border-rule num text-xs text-ink-3">
        {body.length} characters
      </p>
    </article>
  );
}
