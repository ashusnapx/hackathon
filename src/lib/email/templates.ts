import type { TrackId } from "@/lib/case/types";

interface DeadlineEmail {
  subject: string;
  body: string;
  urgent: boolean;
}

const TRACK_LABELS: Record<TrackId, string> = {
  helpline: "Call 1930 Cybercrime Helpline",
  "bank-notice": "Notify your bank in writing",
  ncrp: "File NCRP complaint online",
  fir: "File FIR at local police station",
  chakshu: "Report fraud number on Chakshu",
  "bank-credit": "Follow up on credit-back",
  mrm: "Raise Money Restoration request",
  ombudsman: "Escalate to RBI Ombudsman",
  "bank-resolution": "Await bank resolution",
  "legal-aid": "Seek legal aid",
};

function timeLeft(deadline: Date): string {
  const diff = deadline.getTime() - Date.now();
  if (diff < 0) {
    const overdue = Math.abs(diff);
    const hours = Math.floor(overdue / 3600_000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `OVERDUE by ${days} day${days > 1 ? "s" : ""} and ${hours % 24} hour${hours % 24 !== 1 ? "s" : ""}`;
    return `OVERDUE by ${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  const hours = Math.floor(diff / 3600_000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} and ${hours % 24} hour${hours % 24 !== 1 ? "s" : ""}`;
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}

function deadlineStr(deadline: Date): string {
  return deadline.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildDeadlineEmail(opts: {
  trackId: TrackId;
  deadline: Date;
  caseRef: string;
  caseUrl: string;
}): DeadlineEmail {
  const label = TRACK_LABELS[opts.trackId] ?? opts.trackId;
  const left = timeLeft(opts.deadline);
  const date = deadlineStr(opts.deadline);
  const isOverdue = opts.deadline.getTime() < Date.now();
  const isUrgent = isOverdue || opts.deadline.getTime() - Date.now() < 86400_000;

  const subject = isOverdue
    ? `OVERDUE: ${label} — ${left}`
    : isUrgent
      ? `URGENT: ${label} — only ${left} left`
      : `Reminder: ${label} — ${left} remaining`;

  const body = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#008069;color:white;padding:16px 20px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:20px;">Kavach — Deadline Reminder</h1>
      </div>
      <div style="background:#f0f2f5;padding:20px;border-radius:0 0 12px 12px;">
        <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px;">
          Case <strong>${opts.caseRef}</strong>
        </p>

        <div style="background:white;border-radius:8px;padding:16px;margin-bottom:16px;border-left:4px solid ${isUrgent ? "#ff6c4c" : "#ffa946"};">
          <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1a1a1a;">
            ${isOverdue ? "🚨 OVERDUE" : isUrgent ? "⏰ URGENT" : "📋 Upcoming"}: ${label}
          </p>
          <p style="margin:0 0 4px;font-size:14px;color:#686868;">
            Deadline: <strong>${date}</strong>
          </p>
          <p style="margin:0;font-size:14px;color:${isUrgent ? "#ff6c4c" : "#ffa946"};">
            ${isOverdue ? "Passed" : "Time remaining"}: <strong>${left}</strong>
          </p>
        </div>

        <p style="font-size:14px;color:#686868;margin:0 0 16px;">
          Missing this deadline could affect your rights under RBI guidelines.
          Please take action as soon as possible.
        </p>

        <a href="${opts.caseUrl}"
           style="display:inline-block;background:#008069;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Open Your Case →
        </a>

        <p style="font-size:12px;color:#999;margin:24px 0 0;border-top:1px solid #e0e0e0;padding-top:12px;">
          This is an automated reminder from Kavach, your cybercrime assistance platform.
          This is not a government communication.
        </p>
      </div>
    </div>
  `;

  return { subject, body, urgent: isUrgent };
}

export function buildDigestEmail(opts: {
  upcoming: { trackId: TrackId; deadline: Date }[];
  caseRef: string;
  caseUrl: string;
}): { subject: string; html: string } {
  const rows = opts.upcoming
    .map((u) => {
      const label = TRACK_LABELS[u.trackId] ?? u.trackId;
      const left = timeLeft(u.deadline);
      const date = deadlineStr(u.deadline);
      const isOverdue = u.deadline.getTime() < Date.now();
      const isUrgent = isOverdue || u.deadline.getTime() - Date.now() < 86400_000;
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e8e8e8;">
            <span style="color:${isUrgent ? "#ff6c4c" : "#1a1a1a"};font-weight:${isUrgent ? "700" : "400"};">
              ${label}
            </span>
          </td>
          <td style="padding:12px;border-bottom:1px solid #e8e8e8;text-align:right;white-space:nowrap;">
            ${date}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e8e8e8;text-align:right;color:${isUrgent ? "#ff6c4c" : "#686868"};">
            ${left}
          </td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#008069;color:white;padding:16px 20px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:20px;">Kavach — Deadline Digest</h1>
      </div>
      <div style="background:#f0f2f5;padding:20px;border-radius:0 0 12px 12px;">
        <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px;">
          Case <strong>${opts.caseRef}</strong> — ${opts.upcoming.length} upcoming deadline${opts.upcoming.length !== 1 ? "s" : ""}
        </p>

        <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f8f8f8;">
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#686868;">Action</th>
              <th style="padding:10px 12px;text-align:right;font-size:13px;color:#686868;">Deadline</th>
              <th style="padding:10px 12px;text-align:right;font-size:13px;color:#686868;">Time left</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <a href="${opts.caseUrl}"
           style="display:inline-block;background:#008069;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px;">
          Open Your Case →
        </a>

        <p style="font-size:12px;color:#999;margin:24px 0 0;border-top:1px solid #e0e0e0;padding-top:12px;">
          Automated reminder from Kavach. Not a government communication.
        </p>
      </div>
    </div>
  `;

  return {
    subject: `Kavach: ${opts.upcoming.length} deadline${opts.upcoming.length !== 1 ? "s" : ""} approaching for case ${opts.caseRef}`,
    html,
  };
}
