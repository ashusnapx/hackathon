/**
 * A partial Indian banking-calendar estimate: it knows only Sundays and the
 * standard second/fourth-Saturday closure. State, local, branch and ad-hoc bank
 * holidays are intentionally not guessed, so every consumer must label the
 * result as an estimate and ask the user to verify the relevant bank calendar.
 */
export function isBankHoliday(d: Date): boolean {
  const day = d.getDay();
  if (day === 0) return true; // Sunday
  if (day !== 6) return false;
  const nth = Math.floor((d.getDate() - 1) / 7) + 1; // which Saturday of the month
  return nth === 2 || nth === 4;
}

export function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (!isBankHoliday(d)) left -= 1;
  }
  // `Date` has no date-only type. Use the last instant of the estimated local
  // date so the UI never invents a 17:00 branch cutoff or marks it missed early.
  // This is a representation detail, not a legal filing time.
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 3600_000);
}

export function addDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export interface Countdown {
  ms: number;
  overdue: boolean;
  days: number;
  hours: number;
  minutes: number;
}

export function countdown(target: Date | string, now = new Date()): Countdown {
  const t = typeof target === "string" ? new Date(target) : target;
  const raw = t.getTime() - now.getTime();
  const ms = Math.abs(raw);
  return {
    ms: raw,
    overdue: raw < 0,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
  };
}

/** "2d 4h", "47m" — deliberately short, because it sits inside a chip. */
export function formatCountdown(c: Countdown): string {
  if (c.days > 0) return `${c.days}d ${c.hours}h`;
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m`;
  return `${Math.max(c.minutes, 0)}m`;
}

export function windowPhase(minutes: number): "strong" | "fading" | "late" | "expired" {
  if (minutes <= 60) return "strong";
  if (minutes <= 1440) return "fading";
  if (minutes <= 10080) return "late";
  return "expired";
}
