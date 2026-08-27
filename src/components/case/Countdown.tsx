"use client";

import { useEffect, useState } from "react";
import { countdown, formatCountdown } from "@/lib/case/time";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * A live deadline chip. Ticks every second under an hour — at that point the
 * seconds are the message — and every minute after, to stay cheap.
 */
export function Countdown({ target, className }: { target: string | Date; className?: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => new Date());

  const c = countdown(target, now);
  const urgent = !c.overdue && c.ms < 3_600_000;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), urgent ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [urgent]);

  const label = urgent
    ? `${String(c.hours * 60 + c.minutes).padStart(2, "0")}:${String(
        Math.floor((Math.abs(c.ms) % 60_000) / 1000),
      ).padStart(2, "0")}`
    : formatCountdown(c);

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 num text-sm",
        c.overdue ? "text-urgent" : urgent ? "text-urgent" : "text-ink-2",
        className,
      )}
    >
      <span className={cn("font-medium", urgent && "tick")}>{label}</span>
      <span className="chip text-ink-3">
        {c.overdue ? t("track.overdue") : t("track.left")}
      </span>
    </span>
  );
}
