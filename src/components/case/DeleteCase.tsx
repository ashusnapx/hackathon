"use client";

import { useState } from "react";

import type { DeleteCaseResult } from "@/lib/case/store";
import { useT } from "@/lib/i18n/context";

/**
 * Deleting the case, behind the door that offers it.
 *
 * This used to sit directly under the case reference at the top of the page — a
 * plain underlined link a few millimetres below the thing everybody taps to
 * copy their reference number, on the screen somebody opens while their hands
 * are shaking. It is the only irreversible control in the product, and the
 * evidence it removes is held in this browser and nowhere else, so there is no
 * copy to restore from.
 *
 * It now lives inside "Share, save or delete", which is where somebody looking
 * for it would go, and nowhere near a thumb aiming at something else.
 */
export function DeleteCase({ onDelete }: { onDelete: () => Promise<DeleteCaseResult> }) {
  const t = useT();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [cleanupIncomplete, setCleanupIncomplete] = useState(false);

  return (
    <div className="border-t border-rule pt-4">
      {!confirmingDelete ? (
        <button
          type="button"
          onClick={() => { setConfirmingDelete(true); setDeleteError(false); }}
          className="inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 hover:text-urgent"
        >
          {t("case.delete")}
        </button>
      ) : (
        <div className="rounded-ctl border border-urgent/25 bg-urgent-soft px-4 py-3 max-w-2xl">
          {cleanupIncomplete ? (
            <>
              <p role="alert" className="text-sm leading-[1.55] text-urgent-ink">
                {t("case.deleteCleanupError")}
              </p>
              <a href="/cases" className="mt-3 inline-flex h-11 items-center rounded-ctl border border-rule-strong px-4 text-sm font-semibold">
                {t("case.deleteContinue")}
              </a>
            </>
          ) : (
            <>
              <p className="text-sm leading-[1.55] text-urgent-ink">{t("case.deleteConfirm")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setDeleting(true);
                    setDeleteError(false);
                    void onDelete()
                      .then((result) => {
                        if (result.evidenceCleanup === "incomplete") {
                          setDeleting(false);
                          setCleanupIncomplete(true);
                        }
                      })
                      .catch(() => {
                        setDeleting(false);
                        setDeleteError(true);
                      });
                  }}
                  className="h-11 rounded-ctl border border-urgent-ink bg-urgent px-4 text-sm font-semibold disabled:opacity-50"
                >
                  {deleting ? t("case.deleting") : t("g.confirm")}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                  className="h-11 rounded-ctl border border-rule-strong px-4 text-sm font-semibold disabled:opacity-50"
                >
                  {t("g.cancel")}
                </button>
              </div>
              {deleteError && <p role="alert" className="mt-2 text-sm text-urgent-ink">{t("case.deleteError")}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
