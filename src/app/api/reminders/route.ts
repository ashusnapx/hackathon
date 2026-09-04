import { NextResponse } from "next/server";
import { addReminder, getReminders, removeReminder } from "@/lib/reminders/store";
import { startReminderCron } from "@/lib/email/cron";
import type { TrackId } from "@/lib/case/types";

// POST /api/reminders — register email for deadline reminders
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { caseId, caseRef, email, trackIds, incidentAt, bankAlertAt } = body;

    if (!caseId || !caseRef || !email || !incidentAt) {
      return NextResponse.json(
        { error: "Missing required fields: caseId, caseRef, email, incidentAt" },
        { status: 400 },
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const entry = addReminder({
      caseId,
      caseRef,
      email,
      trackIds: (trackIds as TrackId[]) || [],
      incidentAt,
      bankAlertAt,
    });

    // Ensure cron is running
    startReminderCron();

    return NextResponse.json({ ok: true, id: entry.id });
  } catch (err) {
    console.error("[api/reminders] POST failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET /api/reminders — list all reminders (for debugging)
export async function GET() {
  const reminders = getReminders();
  return NextResponse.json({ reminders, count: reminders.length });
}

// DELETE /api/reminders — remove a reminder
export async function DELETE(req: Request) {
  try {
    const { caseId, email } = await req.json();
    if (!caseId || !email) {
      return NextResponse.json({ error: "Missing caseId or email" }, { status: 400 });
    }
    removeReminder(caseId, email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/reminders] DELETE failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
