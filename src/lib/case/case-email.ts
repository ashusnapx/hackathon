"use client";

import { useEffect, useRef, useState } from "react";

import { useAccountEmail } from "@/lib/auth/session";
import { findCategory } from "@/lib/case/categories";
import { readCaseKey } from "@/lib/case/key";
import { isFinancial } from "@/lib/case/tracks";
import type { CaseFile } from "@/lib/case/types";

/**
 * Send the case reference to the person, once, as soon as there is somewhere
 * to send it.
 *
 * ── What went wrong ────────────────────────────────────────────────────────
 *
 * This mailed people repeatedly: on opening a case, on tapping a step, and
 * apparently at random. Every one of those was the same fault seen from a
 * different angle.
 *
 * The record of "already sent" was written inside `.then()`, guarded by the
 * effect's own `live` flag. Each case screen is a route of its own, so moving
 * from a case to one of its steps unmounts this hook — and if that happened
 * while the request was in flight, `live` was already false when the response
 * arrived, the marker was never written, and the next screen sent the email
 * again. Tapping through four steps was four emails. The mail had of course
 * already gone out; the only thing `live` suppressed was the note saying so.
 *
 * Two smaller faults fed the same loop. The effect listed `caseFile` as a
 * dependency, so any autosave or sync that produced a new object tore it down
 * and re-ran it mid-request. And nothing coordinated two mounts, so a fast
 * back-and-forth could have two requests open at once with neither aware of
 * the other.
 *
 * ── What it does now ───────────────────────────────────────────────────────
 *
 *  · The marker is written when the response says so, mounted or not. The
 *    email exists in the world by then; whether this component still does is
 *    beside the point.
 *  · A module-level set holds the in-flight sends, so a remount during a
 *    request joins the existing one instead of starting a second.
 *  · The effect depends on the case id and the address, not the case. The rest
 *    of the payload is read from a ref at send time.
 *  · The server refusing as a duplicate is recorded here too, so a device that
 *    lost its local storage asks once rather than on every screen.
 *
 * None of that is load-bearing on its own. The authority on whether this email
 * has been sent is `public.email_sends` — see migration 0006 — because local
 * storage is per-device and was always going to mail a laptop and a phone
 * separately. This half exists so the question is asked once rather than often.
 */

const SENT_KEY = "kavach.case-email.v1";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Sends currently open, so two mounts cannot both start one. */
const inFlight = new Set<string>();

export type CaseEmailState = "idle" | "sent" | "already" | "nowhere";

function remember(key: string, to: string): void {
  try {
    localStorage.setItem(key, to);
  } catch {
    // Private windows and blocked site data both throw. The server-side claim
    // is what actually prevents a duplicate; this only saves asking.
  }
}

export function useCaseCreatedEmail(caseFile: CaseFile | null): CaseEmailState {
  const { email: account } = useAccountEmail();
  const [state, setState] = useState<CaseEmailState>("idle");

  // The account wins, the same way it does on the server: the route ignores a
  // body address for anybody signed in, so preferring it here keeps the
  // once-only marker keyed to the address the mail will actually go to.
  const typed = caseFile?.victim.email?.trim();
  const to = account ?? (typed && EMAIL_PATTERN.test(typed) ? typed : null);
  const caseId = caseFile?.id ?? null;

  // Everything else the email carries. Held in a ref so that a save, a sync or
  // a re-render cannot restart a send that is already under way. Written from
  // an effect declared above the send, so it is current by the time the send
  // reads it in the same commit.
  const details = useRef(caseFile);
  useEffect(() => { details.current = caseFile; }, [caseFile]);

  useEffect(() => {
    if (!caseId || !to) return;

    const sentKey = `${SENT_KEY}:${caseId}`;
    const flightKey = `${caseId}:${to}`;

    let alreadySent = false;
    try {
      alreadySent = localStorage.getItem(sentKey) === to;
    } catch {
      // Storage can be off. The server-side claim still holds.
    }
    // Not setState in the effect body: React re-renders on it, and the render
    // that follows would run this effect again to reach the same conclusion.
    if (alreadySent) {
      queueMicrotask(() => setState("already"));
      return;
    }
    if (inFlight.has(flightKey)) return;

    const current = details.current;
    if (!current) return;

    let live = true;
    inFlight.add(flightKey);

    void fetch("/api/email/case-created", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        ref: current.ref,
        caseId,
        // Without the key the email still carries the reference; with it the
        // link opens the case on a device that has never seen it.
        caseKey: readCaseKey(caseId) ?? undefined,
        category: findCategory(current.triage?.categoryId)?.label,
        amountInr: current.amount,
        financial: isFinancial(current),
      }),
    })
      .then((response) => response.json().catch(() => null))
      .then((body: { sent?: boolean; reason?: string } | null) => {
        // Deliberately outside the `live` check. Whether this screen is still
        // open has no bearing on whether the email was sent, and treating it as
        // if it did is what mailed people four times.
        const done = body?.sent === true;
        const duplicate = body?.reason === "already-sent";
        if (done || duplicate) remember(sentKey, to);
        if (live) setState(done ? "sent" : duplicate ? "already" : "idle");
      })
      .catch(() => {
        // Quiet on purpose. The case is saved in the browser regardless, so a
        // failed send is not something to alarm anybody about — and the claim
        // was handed back on the server, so the next screen may try again.
      })
      .finally(() => {
        inFlight.delete(flightKey);
      });

    return () => { live = false; };
  }, [caseId, to]);

  return to ? state : "nowhere";
}
