"use client";

import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth/browser";
import { findCategory } from "@/lib/case/categories";
import { readCaseKey } from "@/lib/case/key";
import { isFinancial } from "@/lib/case/tracks";
import type { CaseFile } from "@/lib/case/types";

/**
 * Send the case reference to the person, once, as soon as there is somewhere
 * to send it.
 *
 * This used to live inside a component rendered on the "Share, save or delete"
 * panel, and it had two faults that cancelled each other out into silence:
 *
 *  · It only fired when an address had been typed into the case builder. Most
 *    people never open that field, so most cases never produced an email.
 *  · The panel it lived on became a page of its own when the case screen was
 *    split into routes, and a page that is not open is not mounted — so even
 *    with an address typed in, the effect only ran while somebody happened to
 *    be looking at the sharing screen.
 *
 * It now runs from the case shell, which is mounted on every case screen, and
 * an account's own address is enough on its own. Nobody has to ask for the
 * email that tells them their reference.
 */

const SENT_KEY = "kavach.case-email.v1";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type CaseEmailState = "idle" | "sent" | "already" | "nowhere";

/** The signed-in address, or null while it is unknown or absent. */
function useAccountEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const client = authClient();
    if (!client) return;

    let live = true;
    void client.auth.getSession().then(({ data }) => {
      if (live) setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return email;
}

export function useCaseCreatedEmail(caseFile: CaseFile | null): CaseEmailState {
  const account = useAccountEmail();
  const [state, setState] = useState<CaseEmailState>("idle");

  // The account wins, the same way it does on the server: the route ignores a
  // body address for anybody signed in, so preferring it here keeps the
  // once-only marker keyed to the address the mail will actually go to.
  const typed = caseFile?.victim.email?.trim();
  const to = account ?? (typed && EMAIL_PATTERN.test(typed) ? typed : null);
  const caseId = caseFile?.id ?? null;

  useEffect(() => {
    if (!caseFile || !caseId || !to) return;

    const sentKey = `${SENT_KEY}:${caseId}`;
    let alreadySent = false;
    try {
      alreadySent = localStorage.getItem(sentKey) === to;
    } catch {
      // Storage can be off. Worst case is a second copy of the same email.
    }
    // Not setState in the effect body: React re-renders on it, and the render
    // that follows would run this effect again to reach the same conclusion.
    if (alreadySent) {
      queueMicrotask(() => setState("already"));
      return;
    }

    let live = true;
    void fetch("/api/email/case-created", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        ref: caseFile.ref,
        caseId,
        // Without the key the email still carries the reference; with it the
        // link opens the case on a device that has never seen it.
        caseKey: readCaseKey(caseId) ?? undefined,
        category: findCategory(caseFile.triage?.categoryId)?.label,
        amountInr: caseFile.amount,
        financial: isFinancial(caseFile),
      }),
    })
      .then((response) => response.json().catch(() => null))
      .then((body: { sent?: boolean } | null) => {
        if (!live) return;
        if (body?.sent) {
          try {
            localStorage.setItem(sentKey, to);
          } catch {
            // Nothing to remember it with; a duplicate is the only cost.
          }
          setState("sent");
        }
      })
      .catch(() => {
        // Quiet on purpose. The case is saved in the browser regardless, so a
        // failed send is not something to alarm anybody about.
      });

    return () => { live = false; };
  }, [caseFile, caseId, to]);

  return to ? state : "nowhere";
}
