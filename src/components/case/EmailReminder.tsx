"use client";

import { useCallback, useEffect, useState } from "react";
import type { CaseFile } from "@/lib/case/types";
import { cn } from "@/lib/utils";

interface EmailReminderProps {
  caseFile: CaseFile;
}

export function EmailReminder({ caseFile }: EmailReminderProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    // Check if reminder already exists for this case
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((data) => {
        const found = data.reminders?.some((r: any) => r.caseId === caseFile.id);
        if (found) setExisting(true);
      })
      .catch(() => {});
  }, [caseFile.id]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

      setStatus("saving");
      try {
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: caseFile.id,
            caseRef: caseFile.ref,
            email: email.trim(),
            trackIds: caseFile.triage?.applicableTracks ?? [],
            incidentAt: caseFile.incidentAt || caseFile.triage?.incidentAt || caseFile.createdAt,
            bankAlertAt: caseFile.bankAlertAt,
          }),
        });
        if (res.ok) {
          setStatus("saved");
          setExisting(true);
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    },
    [email, caseFile],
  );

  const handleRemove = useCallback(async () => {
    try {
      await fetch("/api/reminders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseFile.id, email }),
      });
      setExisting(false);
      setEmail("");
      setStatus("idle");
    } catch {
      // ignore
    }
  }, [caseFile.id, email]);

  return (
    <section className="sheet px-5 py-5">
      <div className="flex items-center gap-2 mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <p className="label">Email reminders</p>
      </div>

      {existing ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-2">
            Reminders active for <strong>{email || "your email"}</strong>. You will receive alerts before each deadline.
          </p>
          <button
            onClick={handleRemove}
            className="text-xs text-urgent underline underline-offset-4 hover:text-urgent-ink whitespace-nowrap"
          >
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-ink-2 leading-snug">
            Enter your email to receive automatic reminders before each deadline. We will alert you 7 days before, and again every 12 hours as the deadline approaches.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
              placeholder="your@email.com"
              required
              className={cn(
                "flex-1 px-3 py-2 text-sm rounded-ctl border bg-white outline-none transition-colors",
                status === "error" ? "border-urgent" : "border-rule focus:border-ink/40",
              )}
            />
            <button
              type="submit"
              disabled={status === "saving" || !email.trim()}
              className="px-4 py-2 text-sm font-medium rounded-ctl bg-[#008069] text-white hover:bg-[#006d59] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {status === "saving" ? "Saving…" : status === "saved" ? "✓ Done" : "Enable"}
            </button>
          </div>
          {status === "error" && (
            <p className="text-xs text-urgent">Something went wrong. Please try again.</p>
          )}
          {status === "saved" && (
            <p className="text-xs text-done">Reminders enabled. Check your inbox for confirmation.</p>
          )}
        </form>
      )}
    </section>
  );
}
