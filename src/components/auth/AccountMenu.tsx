"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Session, User } from "@supabase/supabase-js";

import { authClient } from "@/lib/auth/browser";
import { authConfigured } from "@/lib/auth/config";
import { useCases } from "@/lib/case/store";
import { useI18n } from "@/lib/i18n/context";
import { useIsClient } from "@/lib/useIsClient";
import { accountFacts } from "@/lib/auth/account";
import { cn } from "@/lib/utils";

/**
 * Who is signed in, and everything we actually know about them.
 *
 * The account is the one part of this product where a person is entitled to a
 * complete answer: what address is on it, when it was made, when it was last
 * used, how it is signed in to, when this session runs out and what it is
 * holding on this device. Anything less and "account settings" is a sign-out
 * button wearing a hat.
 *
 * The dropdown copies the language picker's shape rather than inventing a
 * second one — including the portal on a phone, which is not decoration: this
 * sits inside a `backdrop-blur` header, and a backdrop-filter makes its element
 * the containing block for any fixed-position descendant, so a sheet rendered
 * in place cannot escape the header.
 */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { t, lang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mounted = useIsClient();
  const cases = useCases();
  // "3 minutes ago" has to stop being true at some point, and reading the clock
  // during render would make every re-render produce a different panel.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = globalThis.setInterval(() => setNow(Date.now()), 30_000);
    return () => globalThis.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!authConfigured()) return;
    const supabase = authClient();
    let live = true;

    // The session comes off the cookie, which is instant and enough to paint.
    // `getUser` then verifies it with Supabase and fills in the fields the
    // cookie's copy can lag on.
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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const el = target instanceof Element ? target : target.parentElement;
      if (el?.closest("[data-account-panel]")) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  if (!authConfigured() || !user) return null;

  const email = user.email ?? "";
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  const facts = accountFacts(user, session, now, lang.code);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 2_000);
    } catch {
      // A denied clipboard is not worth an error state; the id is on screen.
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await authClient().auth.signOut();
    } catch {
      // Clearing this device is still the right outcome with no network.
    }
    // A router push would not do: the session lives in a cookie, and only a
    // real request lets the middleware read the new one.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  };

  const panel = (
    <>
      <div className="flex items-center gap-3 p-4 border-b border-rule">
        <span
          className="grid place-items-center w-11 h-11 shrink-0 rounded-full bg-deep text-[#ffffeb] text-lg font-semibold"
          aria-hidden
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold leading-tight break-all">{email}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs leading-none">
            <span
              className={cn("w-1.5 h-1.5 rounded-full", facts.verified ? "bg-done" : "bg-wait")}
              aria-hidden
            />
            <span className={facts.verified ? "text-done" : "text-wait-ink"}>
              {t(facts.verified ? "account.verified" : "account.unverified")}
            </span>
          </p>
        </div>
      </div>

      <dl className="p-4 space-y-3">
        {facts.rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-4">
            <dt className="text-xs text-ink-3 shrink-0">{t(row.key)}</dt>
            <dd className="text-sm text-end min-w-0 break-words" title={row.title}>
              {row.valueKey
                ? t(row.valueKey)
                : row.value ?? <span className="text-ink-3">{t("account.unknown")}</span>}
            </dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-xs text-ink-3 shrink-0">{t("account.casesHere")}</dt>
          <dd className="num text-sm">{cases.length}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-xs text-ink-3 shrink-0">{t("account.language")}</dt>
          <dd className="text-sm text-end">{lang.endonym}</dd>
        </div>
      </dl>

      <div className="px-4 pb-3">
        <p className="text-xs text-ink-3">{t("account.id")}</p>
        <button
          type="button"
          onClick={copyId}
          className="mt-1 w-full flex items-center gap-2 rounded-ctl border border-rule bg-sunk px-2.5 py-2 text-start hover:border-ink transition-colors"
        >
          <code className="num flex-1 min-w-0 truncate text-[0.6875rem] text-ink-2">{user.id}</code>
          <span className="shrink-0 text-[0.6875rem] font-semibold text-ink-3">
            {copied ? t("account.copied") : t("doc.copy")}
          </span>
        </button>
      </div>

      {/* The cases on this device are not on the account. Somebody looking at
          an account panel will assume they are, and that assumption is how a
          case gets lost — so the panel says otherwise before they find out. */}
      <p className="px-4 pb-3 text-[0.6875rem] leading-[1.5] text-ink-3">{t("account.deviceNote")}</p>

      <div className="p-3 border-t border-rule">
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          className="w-full h-11 rounded-ctl border border-rule-strong bg-raised text-sm font-semibold hover:border-ink transition-colors disabled:opacity-50"
        >
          {busy ? `${t("auth.working")}…` : t("auth.signOut")}
        </button>
      </div>
    </>
  );

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${t("account.title")}: ${email}`}
        className={cn(
          "inline-flex items-center gap-2 h-11 rounded-ctl border border-rule-strong bg-raised",
          "hover:border-ink transition-colors",
          compact ? "px-1.5 sm:px-2" : "px-2",
        )}
      >
        <span
          className="grid place-items-center w-8 h-8 shrink-0 rounded-full bg-deep text-[#ffffeb] text-sm font-semibold"
          aria-hidden
        >
          {initial}
        </span>
        <span className="hidden lg:block max-w-[14ch] truncate text-[0.9375rem] font-medium">{email}</span>
        <ChevronIcon className={cn("me-1 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          data-account-panel
          className={cn(
            "hidden sm:block absolute z-50 mt-2 end-0 w-[22rem] max-w-[calc(100vw-2rem)]",
            "sheet shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] rise overflow-hidden",
          )}
        >
          {panel}
        </div>
      )}

      {open && mounted
        ? createPortal(
            <div className="sm:hidden fixed inset-0 z-[90]">
              <div
                className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
                aria-hidden
                onClick={() => setOpen(false)}
              />
              <div
                data-account-panel
                className={cn(
                  "absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto no-scrollbar",
                  "bg-raised border-t border-rule rounded-t-xl rise",
                  "pb-[env(safe-area-inset-bottom)]",
                )}
              >
                <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
                  <span className="h-1 w-10 rounded-full bg-rule-strong" />
                </div>
                {panel}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
