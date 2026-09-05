"use client";

import { useEffect, useState } from "react";
import type { CaseFile } from "@/lib/case/types";
import { isFinancial } from "@/lib/case/tracks";
import { findCategory } from "@/lib/case/categories";
import { readCaseKey } from "@/lib/case/key";
import { useT } from "@/lib/i18n/context";

const SENT_KEY = "kavach.case-email.v1";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Emails the case reference once, when an address first exists.
 *
 * The address is asked for in the case builder, not before: someone who has
 * just been defrauded should not have to hand over an email to get help. When
 * they do give one, the copy goes out on its own — one fewer button on a page
 * that already has too many.
 *
 * Delivery is deliberately quiet. The case is saved in the browser regardless,
 * so a failed send is not something to alarm anyone about.
 */
export function CaseEmail({ caseFile }: { caseFile: CaseFile }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "sent" | "already">("idle");
  const email = caseFile.victim.email?.trim();

  useEffect(() => {
    if (!email || !EMAIL_PATTERN.test(email)) return;

    const sentKey = `${SENT_KEY}:${caseFile.id}`;
    let alreadySent = false;
    try {
      alreadySent = localStorage.getItem(sentKey) === email;
    } catch {
      // Storage can be off. Worst case is a second copy of the same email.
    }
    if (alreadySent) {
      queueMicrotask(() => setState("already"));
      return;
    }

    let active = true;
    void fetch("/api/email/case-created", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        ref: caseFile.ref,
        caseId: caseFile.id,
        // Sent so the link works on the phone they read the email on, not only
        // in the browser that happened to build the case.
        ...(readCaseKey(caseFile.id) ? { caseKey: readCaseKey(caseFile.id) } : {}),
        category: findCategory(caseFile.triage?.categoryId)?.label,
        amountInr: caseFile.amount,
        financial: isFinancial(caseFile),
      }),
    })
      .then((response) => response.json())
      .then((data: { sent?: boolean }) => {
        if (!active || !data?.sent) return;
        try {
          localStorage.setItem(sentKey, email);
        } catch {
          // Nothing to do; the copy was still delivered.
        }
        setState("sent");
      })
      .catch(() => {
        // Silent by design. The case is saved either way.
      });

    return () => { active = false; };
  }, [email, caseFile]);

  if (state === "idle" || !email) return null;

  return (
    <p className="text-sm text-ink-3">
      {t("case.emailSent")} <span className="font-medium text-ink-2">{email}</span>
    </p>
  );
}
