"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * The reassurance the original never gives.
 *
 * People filing these complaints have been thrown out of a form before and
 * expect to be thrown out again. Saying "saved" once is not enough; the badge
 * keeps a live count of how long ago, because "saved 4 seconds ago" is the
 * thing that lets someone stop and find their bank statement without panicking.
 */
export function SaveBadge({
  state,
  savedAt,
  online,
}: {
  state: "idle" | "saving" | "saved" | "error";
  savedAt: Date | null;
  online: boolean;
}) {
  const t = useT();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  if (state === "error") {
    return (
      <span role="alert" aria-live="assertive" className="inline-flex items-center gap-2 text-sm text-urgent">
        <Dot className="bg-urgent" />
        {t("rep.save.error")}
      </span>
    );
  }

  if (!online) {
    return (
      <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-wait">
        <Dot className="bg-wait" />
        {t("rep.save.offline")}
      </span>
    );
  }

  if (state === "saving") {
    return (
      <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-ink-3">
        <Dot className="bg-ink-3 animate-pulse" />
        {t("rep.save.saving")}
      </span>
    );
  }

  if (state === "saved" && savedAt) {
    return (
      <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-done">
        <Dot className="bg-done" />
        {t("rep.save.saved")} {ago(savedAt, t("rep.save.justNow"))}
      </span>
    );
  }

  return null;
}

function Dot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("w-1.5 h-1.5 rounded-full shrink-0", className)} />;
}

function ago(d: Date, justNow: string): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 10) return justNow;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}
