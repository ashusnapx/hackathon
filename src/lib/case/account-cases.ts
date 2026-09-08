"use client";

import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth/browser";
import { authConfigured } from "@/lib/auth/config";
import { getCase, mergeStoredCase } from "./store";
import { readAllCaseKeys, rememberCaseKey } from "./key";
import { adoptRevision, fetchStoredCase, isSyncable, localRevision, subscribeCaseSync } from "./sync";

/**
 * Making the same account show the same cases everywhere.
 *
 * A case is held by a 256-bit key made in the browser, and until now that key
 * only ever existed in the browser that made it. So somebody who signed in with
 * the same email and password on their phone and on their laptop saw two
 * different case lists and reasonably concluded that cases had been lost. They
 * had not: the second device simply had no way to ask for them.
 *
 * This is the reconciliation, and it runs in one direction at a time but both
 * on every pass:
 *
 *   1. offer the account every case this device holds a key for;
 *   2. take back the full keyring for the account;
 *   3. pull down any case in it that is missing here, or is newer there.
 *
 * Nothing is deleted locally. A case that is on this device and not on the
 * account is uploaded rather than removed, because the alternative — treating
 * the server as authoritative — would let a stale response wipe a case somebody
 * created thirty seconds ago on a flaky connection.
 *
 * The sample case is excluded throughout. It is built from the repository on
 * every device and has no row to attach.
 */

export type AccountCaseState = "idle" | "syncing" | "synced" | "offline" | "signed-out";

interface KeyringResponse {
  cases?: { id?: unknown; key?: unknown }[];
}

/** What this browser can currently open, minus the sample. */
function localKeyring(): { id: string; key: string }[] {
  return Object.entries(readAllCaseKeys())
    .filter(([id]) => isSyncable(id))
    .map(([id, key]) => ({ id, key }));
}

/**
 * One pass. Returns how many cases this device gained, or `null` if the account
 * could not be reached — which is not an error worth showing anybody, because
 * every case they already had is still on the screen.
 */
export async function reconcileAccountCases(): Promise<number | null> {
  if (typeof window === "undefined") return null;

  let response: Response;
  try {
    response = await fetch("/api/cases/mine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cases: localKeyring() }),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const body = await response.json().catch(() => null) as KeyringResponse | null;
  if (!body || !Array.isArray(body.cases)) return null;

  let gained = 0;
  for (const entry of body.cases) {
    const { id, key } = entry;
    if (typeof id !== "string" || typeof key !== "string" || !isSyncable(id)) continue;

    // Held before the fetch, so a pull that fails halfway still leaves this
    // device able to open the case from its emailed link.
    rememberCaseKey(id, key);

    const local = getCase(id);
    const stored = await fetchStoredCase(id, key);
    if (!stored) continue;
    // The same last-write rule the rest of sync uses. A case edited on another
    // device wins; one edited here since is not silently overwritten by an
    // older copy, because its revision has not moved.
    if (local && stored.revision <= localRevision(id)) continue;
    // Not `saveCase`: catching up with the account must not repoint the "My
    // case" shortcut at whichever case happened to be pulled last, nor push the
    // bytes straight back to the server that just sent them.
    if (mergeStoredCase(stored.caseFile)) {
      adoptRevision(id, stored.revision);
      if (!local) gained += 1;
    }
  }
  return gained;
}

/**
 * Run the reconciliation for whoever is signed in, and again when that changes.
 *
 * Mounted once in the site header, so every page that has a header keeps the
 * account's cases and the device's cases converging without any screen having
 * to remember to ask. A signed-out visitor never reaches the network: Kavach
 * works without an account and this is the only thing signing in adds.
 */
export function useAccountCases(): AccountCaseState {
  const [state, setState] = useState<AccountCaseState>("idle");

  useEffect(() => {
    if (!authConfigured()) return;
    let live = true;
    let running = false;
    let queued = false;

    const run = async () => {
      if (running) {
        // A save landing mid-reconciliation must not be lost: run again after.
        queued = true;
        return;
      }
      running = true;
      setState("syncing");
      const gained = await reconcileAccountCases();
      if (live) setState(gained === null ? "offline" : "synced");
      running = false;
      if (queued) {
        queued = false;
        void run();
      }
    };

    const supabase = authClient();

    // A case is pushed to the server ~900ms after it is saved, but claimed to
    // the account on sign-in. A device that signs in and immediately creates a
    // case would otherwise claim before the row exists — the foreign key
    // refuses it — and never retry. So every completed push re-runs the
    // reconciliation: the second pass attaches what the first could not.
    const unsubscribeSync = subscribeCaseSync(() => {
      void supabase.auth.getSession().then(({ data }) => {
        if (live && data.session) void run();
      });
    });

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.auth.getSession().then(({ data }) => {
        if (live && data.session) void run();
      });
    };
    const onOnline = () => {
      void supabase.auth.getSession().then(({ data }) => {
        if (live && data.session) void run();
      });
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      if (data.session) void run();
      else setState("signed-out");
    });

    // Signing in on a fresh device is exactly the moment the cases are missing,
    // so the pull happens then rather than on the next full page load.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (!session) {
        setState("signed-out");
        return;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") void run();
    });

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      live = false;
      sub.subscription.unsubscribe();
      unsubscribeSync();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return state;
}
