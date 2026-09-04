import { schedule, type ScheduledTask } from "node-cron";
import { TRACKS } from "@/lib/case/tracks";
import { sendEmail } from "./transport";
import { buildDeadlineEmail, buildDigestEmail } from "./templates";
import { getReminders, markReminded } from "@/lib/reminders/store";
import type { TrackId } from "@/lib/case/types";

/** How often to check: every hour at minute 0 */
const SCHEDULE = "0 * * * *";

/** Only remind if deadline is within this window (ms). Default: 7 days ahead. */
const REMIND_WINDOW = 7 * 86400_000;

/** Also send for deadlines that just passed — up to 48 hours overdue. */
const OVERDUE_WINDOW = 2 * 86400_000;

/** Minimum gap between reminders for the same track (ms). Default: 12 hours. */
const MIN_GAP = 12 * 3600_000;

function computeDeadline(
  trackId: TrackId,
  incidentAt: Date,
  bankAlertAt?: Date,
): Date | null {
  const def = TRACKS.find((t) => t.id === trackId);
  if (!def) return null;
  const fakeCase = {
    incidentAt: incidentAt.toISOString(),
    bankAlertAt: bankAlertAt?.toISOString(),
    tracks: [],
    triage: { applicableTracks: [trackId] },
  } as any;
  return def.deadline(fakeCase);
}

async function checkAndSend() {
  const reminders = getReminders();
  const now = Date.now();

  for (const r of reminders) {
    const incidentAt = new Date(r.incidentAt);
    const bankAlertAt = r.bankAlertAt ? new Date(r.bankAlertAt) : undefined;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const caseUrl = `${baseUrl}/case/${r.caseId}`;

    const tracksToCheck: TrackId[] = r.trackIds.length > 0
      ? r.trackIds
      : TRACKS.map((t) => t.id);

    const upcoming: { trackId: TrackId; deadline: Date }[] = [];

    for (const tid of tracksToCheck) {
      const deadline = computeDeadline(tid, incidentAt, bankAlertAt);
      if (!deadline) continue;

      const diff = deadline.getTime() - now;
      // Skip if deadline is more than 7 days away, or more than 48 hours overdue
      if (diff > REMIND_WINDOW) continue;
      if (diff < -OVERDUE_WINDOW) continue;

      const lastReminded = r.reminded[tid];
      if (lastReminded) {
        const gap = now - new Date(lastReminded).getTime();
        if (gap < MIN_GAP) continue;
      }

      upcoming.push({ trackId: tid, deadline });
    }

    if (upcoming.length === 0) continue;

    upcoming.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

    if (upcoming.length === 1) {
      const u = upcoming[0];
      const email = buildDeadlineEmail({
        trackId: u.trackId,
        deadline: u.deadline,
        caseRef: r.caseRef,
        caseUrl,
      });
      const ok = await sendEmail({ to: r.email, subject: email.subject, html: email.body });
      if (ok) markReminded(r.caseId, u.trackId, new Date().toISOString());
    } else {
      const digest = buildDigestEmail({
        upcoming,
        caseRef: r.caseRef,
        caseUrl,
      });
      const ok = await sendEmail({ to: r.email, subject: digest.subject, html: digest.html });
      if (ok) {
        for (const u of upcoming) {
          markReminded(r.caseId, u.trackId, new Date().toISOString());
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

let _task: ScheduledTask | null = null;

export function startReminderCron() {
  if (_task) return;
  _task = schedule(SCHEDULE, () => {
    checkAndSend().catch((err) => {
      console.error("[cron] reminder check failed:", err);
    });
  });
  console.log(`[cron] reminder checker started (${SCHEDULE})`);
}

export function stopReminderCron() {
  if (_task) {
    _task.stop();
    _task = null;
  }
}
