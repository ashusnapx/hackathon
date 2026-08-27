/**
 * Indian banking calendar. Scheduled commercial banks are shut on Sundays and
 * on the second and fourth Saturday of each month, so "three working days"
 * from a Thursday is not the same as three calendar days. Getting this wrong
 * is exactly the kind of error that costs a citizen their zero-liability claim,
 * so we compute it rather than approximating.
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
  // Deadlines land at the close of the working day, not the same clock time.
  d.setHours(17, 0, 0, 0);
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

/**
 * Probability of getting funds frozen, as a function of delay. Anchored on the
 * figures police and I4C quote publicly: reporting inside the first hour is
 * roughly an even chance, and it collapses through the first day.
 */
export function freezeChance(minutesSinceIncident: number): number {
  const m = Math.max(minutesSinceIncident, 0);
  if (m <= 60) return 0.52 - (m / 60) * 0.11;      // 52% → 41%
  if (m <= 360) return 0.41 - ((m - 60) / 300) * 0.16;  // → 25%
  if (m <= 1440) return 0.25 - ((m - 360) / 1080) * 0.19; // → 6%
  if (m <= 4320) return 0.06 - ((m - 1440) / 2880) * 0.03; // → 3%
  return 0.02;
}

export function windowPhase(minutes: number): "strong" | "fading" | "late" | "expired" {
  if (minutes <= 60) return "strong";
  if (minutes <= 1440) return "fading";
  if (minutes <= 10080) return "late";
  return "expired";
}
