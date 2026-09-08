"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { DOCS, OneDocument, type DocKey } from "@/components/case/DocumentsPanel";
import { fillDocument } from "@/lib/case/placeholders";
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
export function DocModal({ caseFile, docKey, update, onClose }: {
  caseFile: CaseFile;
  docKey: DocKey;
  update: (patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => void;
  onClose: () => void;
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

  const doc = DOCS.find((entry) => entry.key === docKey);
  const draft = caseFile.docs[docKey];
  if (!doc || typeof draft !== "string" || !draft || !mounted) return null;

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
          <OneDocument
            caseFile={caseFile}
            doc={doc}
            body={fillDocument(draft, caseFile)}
            update={update}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
