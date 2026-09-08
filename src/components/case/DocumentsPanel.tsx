"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadCasePack } from "@/lib/case/pack";
import { useDraftGeneration } from "@/components/case/useDraftGeneration";
import { downloadLetter } from "@/lib/case/letter";
import { DocumentFields } from "@/components/case/DocumentFields";
import { fillDocument } from "@/lib/case/placeholders";
import { applicableDocumentKeys, type DocumentKey } from "@/lib/case/documents";
import { completeness } from "@/lib/case/tracks";
import { useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";
import type { CaseFile } from "@/lib/case/types";
import { cn, writeToClipboard } from "@/lib/utils";
import { useIsClient } from "@/lib/useIsClient";

export type DocKey = DocumentKey;

/** A filename someone can find again, with nothing of ours in it. */
const fileDate = () => new Date().toISOString().slice(0, 10);

export const DOCS: { key: DocKey; title: Parameters<ReturnType<typeof useI18n>["t"]>[0]; blurb: Parameters<ReturnType<typeof useI18n>["t"]>[0] }[] = [
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
  const [active, setActive] = useState<DocKey>("ncrp");
  const applicableKeys = applicableDocumentKeys(caseFile);
  const visibleDocs = DOCS.filter((doc) => applicableKeys.includes(doc.key));

  const has = Boolean(
    caseFile.docs.generatedAt
    && visibleDocs.some((doc) => Boolean(caseFile.docs[doc.key])),
  );
  const { score } = completeness(caseFile);

  // Shared with the letter modal, which opens over a step. See the note in
  // `useDraftGeneration` for why this is not two copies.
  const { generate, busy, error: generateError } = useDraftGeneration(caseFile, update);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">{t("case.docsTitle")}</h2>
          <p className="mt-1.5 text-[0.9375rem] text-ink-2 max-w-xl">{t("case.docsSub")}</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Button onClick={() => void generate()} disabled={busy} size="sm">
            {busy ? `${t("doc.generating")}…` : has ? t("doc.regenerate") : t("doc.generate")}
          </Button>
          {has && (
            <Button onClick={() => downloadCasePack(caseFile)} size="sm" variant="secondary">
              {t("case.download")}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm leading-snug text-ink-3 max-w-2xl">{t("doc.applicableOnly")}</p>

      {generateError && (
        <p role="alert" className="mt-4 rounded-ctl border border-urgent/30 bg-urgent-soft px-4 py-3 text-sm leading-[1.55] text-urgent-ink">
          {t(generateError)}
        </p>
      )}

      {score < 55 && (
        <p className="mt-5 sheet px-4 py-3 text-sm text-ink-2 bg-wait-soft border-wait/30">
          {t("doc.needsLabel")} — {t("case.completenessSub")}
        </p>
      )}

      {!has ? (
        <div className="mt-8 sheet px-6 py-14 text-center">
          <p className="text-ink-2 max-w-md mx-auto leading-relaxed">{t("case.docsSub")}</p>
          <Button onClick={() => void generate()} disabled={busy} size="lg" className="mt-6">
            {busy ? `${t("doc.generating")}…` : t("doc.generate")}
          </Button>
          {busy && (
            <div className="relative mt-6 h-0.5 max-w-xs mx-auto bg-sunk overflow-hidden sweep" aria-hidden />
          )}
        </div>
      ) : (
        <>
          <nav className="mt-6 flex gap-1 border-b border-rule swipe-x no-bar no-print" aria-label={t("case.docsTitle")}>
            {visibleDocs.map((d) => (
              <button
                key={d.key}
                aria-current={active === d.key ? "page" : undefined}
                onClick={() => setActive(d.key)}
                className={cn(
                  "px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors -mb-px border-b-2",
                  active === d.key ? "border-ink text-ink font-medium" : "border-transparent text-ink-3 hover:text-ink",
                )}
              >
                {t(d.title)}
              </button>
            ))}
          </nav>

          {/* The letter and the gaps it still has, side by side. Filling one
              rewrites the other as the person types, which is the only way a
              draft full of brackets becomes something they can hand over. */}
          {visibleDocs.filter((d) => d.key === active).map((d) => {
            const draft = caseFile.docs[d.key] ?? "";
            return (
              <div key={d.key} className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-5 lg:items-start">
                <Document
                  docKey={d.key}
                  title={t(d.title)}
                  blurb={t(d.blurb)}
                  body={fillDocument(draft, caseFile)}
                  translated={caseFile.docs.translatedLanguage === lang.code
                    ? caseFile.docs.translated?.[d.key]
                    : undefined}
                  targetLang={lang.code}
                  onTranslated={(text) =>
                    update((c) => ({
                      docs: {
                        ...c.docs,
                        translated: { ...(c.docs.translatedLanguage === lang.code ? c.docs.translated : {}), [d.key]: text },
                        translatedLanguage: lang.code,
                      },
                    }))
                  }
                />
                <div className="lg:sticky lg:top-28 no-print order-first lg:order-none">
                  <DocumentFields caseFile={caseFile} body={draft} update={update} />
                </div>
              </div>
            );
          })}

          <p className="mt-5 text-sm text-ink-3">
            {t("g.aiNote")}
            {caseFile.docs.generatedBy === "rules" && ` · ${t("g.demoMode")}`}
          </p>
        </>
      )}
    </section>
  );
}

/**
 * One document with its controls, wired to the case.
 *
 * Extracted so `DocModal` can show a single letter over the steps that ask for
 * it, using this component rather than a second implementation of it. A copy
 * would be the one that loses the clipboard fallback below, which exists
 * because `navigator.clipboard` rejects outright inside the WhatsApp browser.
 */
export function OneDocument({ caseFile, doc, body, update, titled }: {
  caseFile: CaseFile;
  doc: (typeof DOCS)[number];
  body: string;
  update: Props["update"];
  /** False where the surrounding chrome already names the document. */
  titled?: boolean;
}) {
  const { t, lang } = useI18n();
  return (
    <Document
      docKey={doc.key}
      titled={titled}
      title={t(doc.title)}
      blurb={t(doc.blurb)}
      body={body}
      translated={caseFile.docs.translatedLanguage === lang.code
        ? caseFile.docs.translated?.[doc.key]
        : undefined}
      targetLang={lang.code}
      onTranslated={(text) =>
        update((c) => ({
          docs: {
            ...c.docs,
            translated: { ...(c.docs.translatedLanguage === lang.code ? c.docs.translated : {}), [doc.key]: text },
            translatedLanguage: lang.code,
          },
        }))
      }
      onSave={(text) =>
        update((c) => ({
          docs: {
            ...c.docs,
            [doc.key]: text,
            // A hand-edited draft must not keep a translation of the text it
            // replaced sitting beside it, silently out of date.
            translated: { ...c.docs.translated, [doc.key]: undefined },
          },
          events: [
            ...c.events,
            { at: new Date().toISOString(), kind: "docs" as const, label: `Edited ${doc.key}` },
          ],
        }))
      }
    />
  );
}

function Document({
  docKey, title, blurb, body, translated, targetLang, onTranslated, onSave, titled = true,
}: {
  docKey: DocKey;
  title: string;
  blurb: string;
  body: string;
  translated?: string;
  targetLang: string;
  onTranslated: (text: string) => void;
  /** Persists an edit back into the case. */
  onSave?: (text: string) => void;
  /**
   * False inside the letter sheet, whose own bar already carries the title.
   *
   * It printed twice there — "Letter to your bank / Close / Letter to your
   * bank" — which reads as a rendering fault rather than a heading. The blurb
   * stays either way: it is the sentence that says what to do with the letter,
   * and it is not a repeat of anything.
   */
  titled?: boolean;
}) {
  const { t } = useI18n();
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
  /**
   * The person's own edit, if they have made one.
   *
   * A generated complaint is a draft, and it is theirs to correct: a model
   * reading a transcript gets a name, a branch or a sequence of events wrong
   * often enough that being unable to fix it would mean retyping the whole
   * thing into the portal by hand. Copy, share and the PDF all take whatever
   * is in the box, so an edit that is not saved still leaves with them.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const text = draft ?? body;
  // navigator.share only exists on the client, and only over HTTPS.
  const canShare = useIsClient() && !!navigator.share;
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<DictKey | null>(null);
  const translationSequence = useRef(0);
  const latestTranslationInput = useRef({ body, targetLang });
  useEffect(() => {
    latestTranslationInput.current = { body, targetLang };
  }, [body, targetLang]);

  /**
   * Copying the complaint out is the single most important action on this
   * screen — it is how the text reaches the NCRP portal. `navigator.clipboard`
   * is not available in every Android WebView, and it rejects outright in the
   * in-app browsers inside WhatsApp and Instagram, which is exactly how a link
   * like this gets opened. So there is a fallback, and a visible failure.
   */
  const copy = async () => {
    const ok = await writeToClipboard(text);
    setCopyState(ok ? "done" : "failed");
    setTimeout(() => setCopyState("idle"), ok ? 1800 : 4000);
  };

  /**
   * Typeset, not dumped. A station clerk who is handed a printed .txt file reads
   * it as somebody's notes; the same words with margins, a subject line and a
   * signature block read as an application. Copy and share still carry the plain
   * text, which is what a portal box and WhatsApp actually want.
   */
  const download = () => downloadLetter(text, { title, filename: `${docKey}-${fileDate()}.pdf` });

  /** On a phone the useful destination is usually WhatsApp, not the filesystem. */
  const share = async () => {
    try {
      await navigator.share({ title, text });
    } catch {
      /* dismissed, or the share sheet is unavailable — copy is still there */
    }
  };

  const translate = async () => {
    if (translated) {
      setShowTranslation((s) => !s);
      return;
    }
    const sequence = ++translationSequence.current;
    const requested = { body, targetLang };
    setTranslating(true);
    setTranslationError(null);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, target: targetLang }),
      });
      if (!res.ok) throw new Error(`translate-${res.status}`);
      const data = await res.json();
      if (!data || typeof data.translated !== "string" || !data.translated.trim()) {
        throw new Error("invalid-translation-response");
      }
      if (
        sequence !== translationSequence.current
        || latestTranslationInput.current.body !== requested.body
        || latestTranslationInput.current.targetLang !== requested.targetLang
      ) {
        setTranslationError("doc.err.translateStale");
        return;
      }
      if (data.translated) {
        onTranslated(data.translated);
        setShowTranslation(true);
      }
    } catch {
      if (sequence === translationSequence.current) {
        setTranslationError("doc.err.translateDown");
      }
    } finally {
      if (sequence === translationSequence.current) setTranslating(false);
    }
  };

  return (
    <article className="sheet overflow-hidden rise">
      <div className="px-5 py-4 border-b border-rule bg-sunk">
        {titled && <h3 className="text-lg">{title}</h3>}
        <p className={cn("text-sm leading-snug text-ink-2 max-w-2xl", titled && "mt-1.5")}>{blurb}</p>
      </div>

      <div className="px-5 py-3 border-b border-rule flex flex-wrap items-center gap-2 no-print">
        <Button onClick={copy} size="sm" variant={copyState === "failed" ? "urgent" : "secondary"}>
          {copyState === "done"
            ? t("doc.copied")
            : copyState === "failed"
              ? t("doc.copyFallback")
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

      {translationError && (
        <p role="alert" className="mx-5 mt-4 rounded-ctl border border-urgent/30 bg-urgent-soft px-3 py-2 text-sm text-urgent-ink">
          {t(translationError)}
        </p>
      )}

      {showTranslation && translated ? (
        <>
          <p className="px-5 pt-4 text-sm text-ink-3">{t("doc.whyEnglish")}</p>
          <pre className="px-5 py-4 whitespace-pre-wrap text-[0.9375rem] leading-[1.75] font-sans">{translated}</pre>
        </>
      ) : editing ? (
        <div className="px-5 py-5">
          <label htmlFor={`doc-edit-${docKey}`} className="sr-only">{title}</label>
          <textarea
            id={`doc-edit-${docKey}`}
            value={text}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            /* 16px minimum or iOS zooms the page the moment it is focused. */
            className="block h-80 w-full resize-y rounded-ctl border border-rule-strong bg-paper px-3.5 py-3 font-mono text-[1rem] leading-[1.7] focus:border-ink focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (draft !== null) onSave?.(draft);
                setEditing(false);
              }}
            >
              {t("doc.saveEdit")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setDraft(null); setEditing(false); }}>
              {t("doc.revert")}
            </Button>
          </div>
        </div>
      ) : (
        <pre className="px-5 py-5 whitespace-pre-wrap break-words text-[0.875rem] leading-[1.7] font-mono swipe-x no-bar">
          {text}
        </pre>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-2.5">
        <p className="num text-xs text-ink-3">
          {text.length} {t("doc.characters")}
          {draft !== null && <span className="ms-2">· {t("doc.edited")}</span>}
        </p>
        {!editing && !showTranslation && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 hover:text-ink"
          >
            {t("doc.edit")}
          </button>
        )}
      </div>
    </article>
  );
}
