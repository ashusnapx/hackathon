import { NextResponse } from "next/server";
import { getReminders, markReminded } from "@/lib/reminders/store";
import { sendEmail } from "@/lib/email/transport";
import { buildDeadlineEmail, buildDigestEmail } from "@/lib/email/templates";
import { TRACKS } from "@/lib/case/tracks";
import type { TrackId } from "@/lib/case/types";

export async function POST() {
  try {
    const reminders = getReminders();
    if (reminders.length === 0) {
      return NextResponse.json({ error: "No reminders registered" });
    }

    const results: string[] = [];

    for (const r of reminders) {
      const incidentAt = new Date(r.incidentAt);
      const bankAlertAt = r.bankAlertAt ? new Date(r.bankAlertAt) : undefined;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const caseUrl = `${baseUrl}/case/${r.caseId}`;
      const now = Date.now();

      const tracksToCheck: TrackId[] = r.trackIds.length > 0
        ? r.trackIds
        : TRACKS.map((t) => t.id);

      const upcoming: { trackId: TrackId; deadline: Date }[] = [];

      for (const tid of tracksToCheck) {
        try {
          const def = TRACKS.find((t) => t.id === tid);
          if (!def) continue;
          const fakeCase = {
            incidentAt: incidentAt.toISOString(),
            bankAlertAt: bankAlertAt?.toISOString(),
            tracks: [],
            triage: { applicableTracks: [tid] },
            bank: {},
          } as any;
          const deadline = def.deadline(fakeCase);
          if (!deadline || isNaN(deadline.getTime())) continue;

          const diff = deadline.getTime() - now;
          if (diff > 7 * 86400_000) continue;
          if (diff < -7 * 86400_000) continue;

          upcoming.push({ trackId: tid, deadline });
        } catch {
          // Skip tracks that error on deadline computation
          continue;
        }
      }

      if (upcoming.length === 0) {
        results.push(`${r.email}: no upcoming deadlines found`);
        continue;
      }

      upcoming.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

      let ok: boolean;
      if (upcoming.length === 1) {
        const u = upcoming[0];
        const email = buildDeadlineEmail({
          trackId: u.trackId,
          deadline: u.deadline,
          caseRef: r.caseRef,
          caseUrl,
        });
        ok = await sendEmail({ to: r.email, subject: email.subject, html: email.body });
        if (ok) markReminded(r.caseId, u.trackId, new Date().toISOString());
      } else {
        const digest = buildDigestEmail({ upcoming, caseRef: r.caseRef, caseUrl });
        ok = await sendEmail({ to: r.email, subject: digest.subject, html: digest.html });
        if (ok) {
          for (const u of upcoming) {
            markReminded(r.caseId, u.trackId, new Date().toISOString());
          }
        }
      }

      results.push(`${r.email}: ${ok ? "sent" : "failed"} (${upcoming.length} tracks: ${upcoming.map((u) => u.trackId).join(", ")})`);
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
