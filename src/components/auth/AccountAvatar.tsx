"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth/browser";
import { authConfigured } from "@/lib/auth/config";
import { useT } from "@/lib/i18n/context";

/**
 * The avatar, and nothing else.
 *
 * A panel hanging off the header meant the account lived in a place that is
 * cramped on a phone and easy to dismiss by accident. The circle is now purely
 * a way in: one tap, a real page, room to say everything. It is also the only
 * thing in the header that has to fit at 320px, which a dropdown never did.
 */
export function AccountAvatar() {
  const t = useT();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!authConfigured()) return;
    const supabase = authClient();
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (live) setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (live) setEmail(session?.user.email ?? null);
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!authConfigured() || !email) return null;

  return (
    <Link
      href="/account"
      aria-label={`${t("account.title")}: ${email}`}
      title={email}
      className="grid place-items-center w-11 h-11 shrink-0 rounded-full border border-rule-strong bg-raised hover:border-ink transition-colors"
    >
      <span
        className="grid place-items-center w-8 h-8 rounded-full bg-deep text-[#ffffeb] text-sm font-semibold"
        aria-hidden
      >
        {(email.trim()[0] ?? "?").toUpperCase()}
      </span>
    </Link>
  );
}
