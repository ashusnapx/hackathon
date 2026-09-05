"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { SiteHeader } from "@/components/SiteHeader";
import { authClient } from "@/lib/auth/browser";
import { authConfigured } from "@/lib/auth/config";
import { accountFacts } from "@/lib/auth/account";
import { useCases } from "@/lib/case/store";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * Everything this product knows about the person using it, on one page.
 *
 * A page rather than a dropdown, because the honest answer runs to a dozen
 * lines and a panel hanging off a header is the wrong shape for it on a phone.
 * Nothing here is a summary: a field the provider did not give us says so
 * rather than showing a plausible blank, and the section about this device is
 * separated from the section about the account because they are genuinely
 * different things and confusing them is how somebody loses a case.
 */
export function AccountView() {
  const { t, lang } = useI18n();
  const cases = useCases();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = globalThis.setInterval(() => setNow(Date.now()), 30_000);
    return () => globalThis.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!authConfigured()) return;
    const supabase = authClient();
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data }) => {
      if (live && data.user) setUser(data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!live) return;
      setSession(next);
      setUser(next?.user ?? null);
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);

  const email = user?.email ?? "";
  const facts = user ? accountFacts(user, session, now, lang.code) : null;

  const copyId = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 2_000);
    } catch {
      // A denied clipboard is not an error worth showing; the id is on screen.
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await authClient().auth.signOut();
    } catch {
      // Clearing this device is still right with no network.
    }
    // Only a real request lets the middleware see the cleared cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  };

  return (
    <>
      <SiteHeader width="2xl" />
      <main id="main" className="mx-auto max-w-2xl px-4 sm:px-8 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl">{t("account.title")}</h1>

        {!user ? (
          <p className="mt-6 text-[1.0625rem] leading-[1.65] text-ink-2">{t("account.loading")}</p>
        ) : (
          <>
            <section className="mt-7 sheet px-4 py-5 sm:px-6 flex items-center gap-4">
              <span
                className="grid place-items-center w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full bg-deep text-[#ffffeb] text-2xl font-semibold"
                aria-hidden
              >
                {(email.trim()[0] ?? "?").toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[1.0625rem] font-semibold leading-tight break-all">{email}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm leading-none">
                  <span
                    className={cn("w-2 h-2 rounded-full", facts?.verified ? "bg-done" : "bg-wait")}
                    aria-hidden
                  />
                  <span className={facts?.verified ? "text-done" : "text-wait-ink"}>
                    {t(facts?.verified ? "account.verified" : "account.unverified")}
                  </span>
                </p>
              </div>
            </section>

            <Section title={t("account.sectionAccount")}>
              <dl className="divide-y divide-rule">
                {facts?.rows.map((row) => (
                  <Row key={row.key} label={t(row.key)} title={row.title}>
                    {row.valueKey
                      ? t(row.valueKey)
                      : row.value ?? <span className="text-ink-3">{t("account.unknown")}</span>}
                  </Row>
                ))}
                <Row label={t("account.id")}>
                  <button
                    type="button"
                    onClick={copyId}
                    className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-ctl border border-rule bg-sunk px-3 py-2 hover:border-ink transition-colors"
                  >
                    <code className="num min-w-0 truncate text-[0.6875rem] text-ink-2">{user.id}</code>
                    <span className="shrink-0 text-[0.6875rem] font-semibold text-ink-3">
                      {copied ? t("account.copied") : t("doc.copy")}
                    </span>
                  </button>
                </Row>
              </dl>
            </Section>

            <Section title={t("account.sectionDevice")}>
              <p className="text-sm leading-[1.6] text-ink-2">{t("account.deviceNote")}</p>
              <dl className="mt-3 divide-y divide-rule">
                <Row label={t("account.casesHere")}><span className="num">{cases.length}</span></Row>
                <Row label={t("account.language")}>{lang.endonym}</Row>
              </dl>
            </Section>

            <section className="mt-7">
              <button
                type="button"
                onClick={signOut}
                disabled={busy}
                className="w-full h-12 rounded-ctl border border-rule-strong bg-raised text-[0.9375rem] font-semibold hover:border-ink transition-colors disabled:opacity-50"
              >
                {busy ? `${t("auth.working")}…` : t("auth.signOut")}
              </button>
              <p className="mt-2.5 text-xs leading-[1.55] text-ink-3">{t("account.signOutNote")}</p>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 sheet px-4 py-5 sm:px-6">
      <h2 className="label">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * A label and a value that stack on a narrow screen rather than squeezing.
 *
 * Two columns at 320px turns "Email and password" into a four-line ribbon down
 * the right-hand edge, so they only become columns when there is room.
 */
function Row({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="py-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-sm text-ink-3 shrink-0">{label}</dt>
      <dd className="text-[0.9375rem] min-w-0 break-words sm:text-end" title={title}>{children}</dd>
    </div>
  );
}
