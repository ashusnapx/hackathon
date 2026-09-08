"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import { DOCS, OneDocument, type DocKey } from "@/components/case/DocumentsPanel";
import { useDraftGeneration } from "@/components/case/useDraftGeneration";
import { fillDocument } from "@/lib/case/placeholders";
import { documentBlockedReason } from "@/lib/case/documents";
import type { CaseFile } from "@/lib/case/types";
import { useI18n } from "@/lib/i18n/context";

/**
 * One drafted document, opened where it is needed.
 *
 * The step said "copy the letter we wrote for your bank", and the letter was
 * two screens away in a different door. Somebody following the steps had to
 * leave them, find the right document among five, copy it, and find their way
 * back — at which point they have lost their place in a list they were part
 * way through.
 *
 * So the letter opens here, over the steps, with exactly the controls it has
 * in the documents screen: the same copy button with the same clipboard
 * fallback, the same typeset PDF, the same share sheet, the same translation.
 * It is the same component, not a second copy of it — a reimplementation would
 * be the version that quietly loses the clipboard fallback that exists because
 * `navigator.clipboard` rejects outright inside the WhatsApp browser.
 *
 * Rendered through a portal to `document.body`, and that is not incidental. A
 * `position: fixed` element is positioned against the viewport only while no
 * ancestor has a transform; the panel this opens from sits inside `.rise`,
 * which animates `translateY`. Left in place the sheet was positioned against
 * that panel instead — it covered the page, its own height was measured
 * against the wrong box, and the scroll container never scrolled. A portal
 * takes it out of reach of every transform, `overflow: hidden` and stacking
 * context on the way up.
 */
export function DocModal({ caseFile, docKey, update, onClose, onSeeAll }: {
  caseFile: CaseFile;
  docKey: DocKey;
  update: (patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => void;
  onClose: () => void;
  /** Optional way out to the full documents screen, from inside the sheet. */
  onSeeAll?: () => void;
}) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Escape closes, and focus starts on the close button rather than wherever
  // the page happened to leave it.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while a sheet is over it: on a phone the
    // two scrolls fight and the letter jumps under the thumb.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  // The portal target only exists in the browser; on the server there is
  // nothing to render into and nothing to render. Read rather than set from an
  // effect, which would render the sheet once and then mount it again.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { generate, busy, error } = useDraftGeneration(caseFile, update);

  /*
   * Kick it off as the sheet opens, if there is nothing to show.
   *
   * Guarded by a ref rather than by `busy`, because `generate` is recreated
   * whenever the case changes and this must fire exactly once per open — a
   * second request would race the first and be discarded by the sequence guard
   * inside the hook, having spent a model call to get there.
   */
  /*
   * The missing number, typed here.
   *
   * A Chakshu report is a report about a phone number, so a case without one
   * cannot have the letter. Saying that and then sending somebody to another
   * screen to find the field — and back again to find the letter — is three
   * navigations to enter ten digits we are already standing in front of them
   * asking for.
   */
  const [phone, setPhone] = useState("");
  const [phoneBad, setPhoneBad] = useState(false);

  const asked = useRef(false);
  const existing = caseFile.docs[docKey];
  /*
   * Whether this case can have this letter at all.
   *
   * Both the model and the rules are filtered through
   * `applicableDocumentKeys`, so asking for one that is excluded produces
   * nothing, forever, with no error — which is exactly how a Chakshu report
   * came to sit on "writing this from the facts in your case" indefinitely.
   */
  const blocked = documentBlockedReason(caseFile, docKey);
  useEffect(() => {
    if (asked.current || blocked) return;
    if (typeof existing === "string" && existing) return;
    asked.current = true;
    // Plain letter now, better one behind it.
    void generate(true);
  }, [existing, generate, blocked]);

  const doc = DOCS.find((entry) => entry.key === docKey);
  const draft = caseFile.docs[docKey];
  // Only two reasons not to render: there is no such document, or there is no
  // browser to render into. A *missing draft* is emphatically not one of them —
  // see the note at the top.
  if (!doc || !mounted) return null;
  const written = typeof draft === "string" && draft.length > 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(doc.title)}
      className="fixed inset-0 z-[100] flex items-end justify-center overscroll-contain p-0 sm:items-center sm:p-6"
    >
      {/* A click outside closes it, the way every sheet on a phone does. */}
      <button
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
      />

      <div className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-card border border-rule bg-paper shadow-2xl sm:max-h-[86dvh] sm:rounded-card">
        <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
          <p className="text-[0.9375rem] font-semibold">{t(doc.title)}</p>
          <button
            ref={closeRef}
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-ctl border border-rule-strong px-3.5 text-sm font-medium hover:border-ink transition-colors"
          >
            {t("g.close")}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {blocked ? (
            <div>
              <p className="text-[0.9375rem] font-medium">{t("doc.blockedTitle")}</p>
              <p className="mt-2 max-w-prose text-[0.9375rem] leading-[1.55] text-ink-2">
                {t(blocked)}
              </p>
              {blocked === "doc.blocked.chakshu" && (
                <form
                  className="mt-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    // The same shape the extractor accepts, normalised the same
                    // way, so a number typed here and a number lifted out of a
                    // sentence are one number in the case file.
                    const digits = phone.replace(/\D/g, "").replace(/^(?:0{0,2}91|0)(?=[6-9]\d{9}$)/, "");
                    if (!/^[6-9]\d{9}$/.test(digits)) {
                      setPhoneBad(true);
                      return;
                    }
                    setPhoneBad(false);
                    update((c) => ({
                      suspect: { ...c.suspect, phones: [digits, ...c.suspect.phones.filter((p) => p !== digits)] },
                      events: [
                        ...c.events,
                        { at: new Date().toISOString(), kind: "edit" as const, label: "Suspect number added" },
                      ],
                    }));
                    // Nothing else to do: the case now has a number, the
                    // document stops being blocked, and the effect above writes
                    // the letter on the next render.
                  }}
                >
                  <label htmlFor={`doc-phone-${docKey}`} className="label block">
                    {t("doc.addPhoneLabel")}
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      id={`doc-phone-${docKey}`}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => { setPhone(event.target.value); setPhoneBad(false); }}
                      placeholder={t("doc.addPhonePlaceholder")}
                      aria-invalid={phoneBad}
                      aria-describedby={`doc-phone-hint-${docKey}`}
                      /* 16px, or iOS zooms the page when it is focused. */
                      className="h-11 w-full max-w-[15rem] rounded-ctl border border-rule-strong bg-raised px-3 text-base focus:border-ink focus:outline-none"
                    />
                    <Button type="submit" size="md">{t("doc.addPhoneSave")}</Button>
                  </div>
                  <p id={`doc-phone-hint-${docKey}`} className="mt-2 max-w-prose text-[0.8125rem] leading-[1.45] text-ink-3">
                    {t("doc.addPhoneHint")}
                  </p>
                  {phoneBad && (
                    <p role="alert" className="mt-2 text-[0.8125rem] text-urgent-ink">
                      {t("doc.addPhoneBad")}
                    </p>
                  )}
                </form>
              )}

              {onSeeAll && (
                <button
                  type="button"
                  onClick={() => { onClose(); onSeeAll(); }}
                  className="mt-5 block min-h-11 text-sm underline underline-offset-4 hover:text-ink"
                >
                  {t("doc.seeAll")} →
                </button>
              )}
            </div>
          ) : written ? (
            <>
              {/* The plain version is already usable and already saved. This
                  says so, rather than leaving somebody wondering whether to
                  wait — and it disappears by itself when the better wording
                  arrives, or stays gone if it never does. */}
              {busy && (
                <p className="mb-4 flex items-start gap-2.5 rounded-ctl bg-sunk px-3 py-2.5 text-[0.8125rem] leading-[1.45] text-ink-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-urgent" aria-hidden />
                  {t("doc.polishing")}
                </p>
              )}
              <OneDocument
              caseFile={caseFile}
              doc={doc}
              body={fillDocument(draft, caseFile)}
              update={update}
              // The sheet's own bar already says which letter this is.
              titled={false}
            />
            </>
          ) : (
            /*
             * Writing, not asking.
             *
             * Opening this sheet *is* the request — somebody tapped "the
             * letter" on the step that needs it. Meeting them with a second
             * button that says "write it now" made them ask twice for the one
             * thing they had already asked for, which is the shape of the
             * problem this modal was added to fix in the first place.
             *
             * So it starts on open and this is a progress state. A failure
             * offers a retry rather than a dead end, and says plainly that
             * nothing in the case has changed — because the person cannot see
             * that for themselves and it is the thing they will worry about.
             */
            <div>
              {error ? (
                <>
                  <p className="text-[0.9375rem] font-medium">{t("doc.writeFailed")}</p>
                  <p className="mt-2 max-w-prose text-[0.9375rem] leading-[1.55] text-ink-2">{t(error)}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button onClick={() => void generate(true)} disabled={busy} size="md">
                      {busy ? `${t("doc.generating")}…` : t("doc.tryAgain")}
                    </Button>
                    {onSeeAll && (
                      <button
                        type="button"
                        onClick={() => { onClose(); onSeeAll(); }}
                        className="min-h-11 text-sm underline underline-offset-4 hover:text-ink"
                      >
                        {t("doc.seeAll")} →
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="flex items-center gap-2.5 text-[0.9375rem] font-medium">
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-urgent" aria-hidden />
                  {t("doc.writing")}
                </p>
              )}
              {!error && (
                <p className="mt-2 max-w-prose text-[0.9375rem] leading-[1.55] text-ink-2">
                  {t("doc.writingBody")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
