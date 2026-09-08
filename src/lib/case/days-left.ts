import type { LiveTrack } from "./tracks";

/**
 * How long is left, said as a number of days rather than as a status.
 *
 * The badge used to read "Do now" or "Coming up". Both are opinions, and
 * neither survives the second day: everything says "do now" on the morning
 * somebody loses their money, and by Thursday the person cannot tell which of
 * the six things saying "do now" is the one about to close. A count is a fact,
 * it changes on its own, and it sorts itself.
 *
 * Working days are counted where the rule counts working days. The RBI
 * liability windows are in working days, so a Friday notice does not expire on
 * Sunday — but this counts weekends only. India's banks close on state-specific
 * holidays and there is no feed for them here, so the count can be one or two
 * days optimistic around a festival, and every screen that shows it also shows
 * `track.calendarCaveat` saying exactly that. An estimate labelled as one is
 * useful; an estimate presented as the law is how somebody misses a window.
 */

export type DaysLeftTone = "gone" | "today" | "urgent" | "soon" | "later";

export interface DaysLeft {
  /** Whole days remaining. Negative once the date has passed. */
  days: number;
  /** True when the count skipped weekends. */
  working: boolean;
  tone: DaysLeftTone;
}

const DAY_MS = 86_400_000;

/** Midnight local, so "tomorrow" does not depend on the hour of the tap. */
function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

/**
 * Working days between two dates, counting Monday to Friday.
 *
 * Saturday is a real complication and is deliberately not modelled: Indian
 * banks open on the first, third and fifth Saturday of a month and close on the
 * second and fourth. Getting that wrong in the optimistic direction would tell
 * somebody they had a day they did not have, so both are treated as closed,
 * which can only ever under-count the time available.
 */
export function workingDaysBetween(from: Date, to: Date): number {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (end <= start) return 0;

  let days = 0;
  for (let at = start + DAY_MS; at <= end; at += DAY_MS) {
    const day = new Date(at).getDay();
    if (day !== 0 && day !== 6) days += 1;
  }
  return days;
}

export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

function toneFor(days: number): DaysLeftTone {
  if (days < 0) return "gone";
  if (days === 0) return "today";
  if (days <= 2) return "urgent";
  if (days <= 7) return "soon";
  return "later";
}

/**
 * The count for one track, or null when it has no date to count towards.
 *
 * Most tracks deliberately have no deadline — reporting is urgent without being
 * time-barred — and inventing a countdown for them would manufacture a
 * statutory cliff that does not exist. Those keep a plain label.
 */
export function daysLeftFor(track: LiveTrack, now = new Date()): DaysLeft | null {
  if (!track.deadline || track.state === "done" || track.state === "na") return null;

  const working = Boolean(track.def.workingDayEstimate);
  const past = track.deadline.getTime() < startOfDay(now);

  if (past) {
    // Once it has passed, say how late in plain calendar days. "Three working
    // days ago" is a harder sentence to act on than "three days ago", and
    // nothing turns on the distinction any more.
    return { days: -calendarDaysBetween(track.deadline, now), working: false, tone: "gone" };
  }

  const days = working
    ? workingDaysBetween(now, track.deadline)
    : calendarDaysBetween(now, track.deadline);

  return { days, working, tone: toneFor(days) };
}
