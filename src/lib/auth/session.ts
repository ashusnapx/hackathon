"use client";

import { useEffect, useState } from "react";

import { authClient } from "./browser";
import { authConfigured } from "./config";

/**
 * Who is signed in, on the client.
 *
 * This was written three times — in the account menu, in the case-email sender,
 * and again for the start button — and the copies had already drifted. One of
 * them called `authClient()` without checking `authConfigured()` first, which
 * throws rather than returning null, so a deployment without Supabase keys
 * would have crashed the effect instead of quietly having no account.
 *
 * `loaded` is the part worth having separately from `email`. Before the first
 * answer arrives the two states are indistinguishable — nobody signed in, and
 * nobody asked yet — and a header that renders the signed-out shape during that
 * gap visibly changes its mind a frame later.
 */
export interface AccountSession {
  /** The signed-in address, or null when nobody is. */
  email: string | null;
  /** False only while the first answer is still outstanding. */
  loaded: boolean;
}

export function useAccountEmail(): AccountSession {
  // With no Supabase project there is never going to be a session, so this
  // resolves immediately rather than leaving every caller waiting on an answer
  // that cannot come.
  const configured = authConfigured();
  const [session, setSession] = useState<AccountSession>({ email: null, loaded: !configured });

  useEffect(() => {
    if (!configured) return;

    const client = authClient();
    let live = true;

    void client.auth.getSession().then(({ data }) => {
      if (live) setSession({ email: data.session?.user.email ?? null, loaded: true });
    });

    // Sign-in and sign-out both land here, which is what keeps a shared phone
    // honest: the previous person's address must not survive the next one's
    // sign-in.
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      if (live) setSession({ email: next?.user.email ?? null, loaded: true });
    });

    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  return session;
}
