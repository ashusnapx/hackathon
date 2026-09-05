"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { caseShareLink, readCaseKey } from "@/lib/case/key";
import { isSyncable } from "@/lib/case/sync";
import type { CaseFile } from "@/lib/case/types";
import { useT } from "@/lib/i18n/context";

/**
 * The way back into this case from anywhere else.
 *
 * A case is held by whoever has its key, not by an account, so this is the
 * whole of the recovery story: one link, which the person can mail to
 * themselves or keep in their notes. That also makes it the one thing on the
 * page that can hand a stranger the case, so the warning is not fine print —
 * it sits above the button, in the same size as everything else.
 */
export function CaseAccess({ caseFile }: { caseFile: CaseFile }) {
  const t = useT();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!isSyncable(caseFile.id)) return;
    // Deferred: neither localStorage nor location exists during the server render.
    queueMicrotask(() => {
      const key = readCaseKey(caseFile.id);
      if (key) setLink(caseShareLink(window.location.origin, caseFile.id, key));
    });
  }, [caseFile.id]);

  if (!link) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 4_000);
    } catch {
      // Clipboard access can be refused; showing the link is the fallback.
      setRevealed(true);
    }
  };

  return (
    <section className="sheet px-5 py-5">
      <p className="label">{t("access.title")}</p>
      <p className="mt-2 text-[0.9375rem] leading-[1.6] text-ink-2 max-w-2xl">{t("access.body")}</p>
      <p className="mt-3 text-sm leading-[1.55] text-wait-ink max-w-2xl">{t("access.warning")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={copy} size="sm" variant="secondary">
          {copied ? t("access.copied") : t("access.copy")}
        </Button>
        <button
          onClick={() => setRevealed((current) => !current)}
          className="text-sm text-ink-3 underline underline-offset-4 hover:text-ink"
        >
          {revealed ? t("access.hide") : t("access.show")}
        </button>
      </div>

      {revealed && (
        <p className="mt-3 break-all rounded-ctl border border-rule bg-sunk px-3 py-2 text-xs leading-[1.6] text-ink-2">
          {link}
        </p>
      )}
    </section>
  );
}
