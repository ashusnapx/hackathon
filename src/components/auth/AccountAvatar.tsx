"use client";

import { useRef, useState } from "react";

import { authClient } from "@/lib/auth/browser";
import { authConfigured } from "@/lib/auth/config";
import { useAccountEmail } from "@/lib/auth/session";
import { useMenuBehaviour, moveMenuFocus } from "@/components/useMenu";
import { useT } from "@/lib/i18n/context";
import { casePath, useActiveCaseId } from "@/lib/case/store";
import { cn } from "@/lib/utils";

/**
 * The avatar, and what hangs off it.
 *
 * It used to be a bare link to /account — which meant signing out took a page
 * load to reach, "my cases" took two taps to find, and a signed-out visitor
 * got no entry point at all: the circle simply was not there. Research on
 * account menus converges on one shape (Google's switcher is the reference):
 * the trigger confirms the identity at a glance, the menu repeats it, quick
 * links follow, and sign-out sits separated at the bottom where a thumb cannot
 * hit it by accident.
 *
 * The /account page stays exactly as it is. A dozen honest lines about keys
 * and devices do not belong in a popup on a phone; the menu is the way in,
 * not the whole story.
 */
export function AccountAvatar() {
  const t = useT();
  const caseId = useActiveCaseId();
  // One reader for the signed-in address, shared with the start button and the
  // case-email sender. This used to keep its own copy of the same effect.
  const { email, loaded } = useAccountEmail();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Nothing closes the menu on sign-out because nothing has to: the whole
  // component returns null without an address, so somebody else's login on a
  // shared phone takes this menu with it rather than inheriting it.

  const close = () => setOpen(false);
  useMenuBehaviour({
    open,
    onClose: close,
    containerRef: menuRef,
    extraRefs: [buttonRef],
    triggerRef: buttonRef,
    // A small dropdown, not a sheet: arrows + Escape are the contract, and a
    // Tab trap would hold keyboard users hostage over three links.
    trap: false,
  });

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

  if (!authConfigured()) return null;

  // A reserved circle while the session resolves, so the header does not jump
  // when the avatar arrives a beat later.
  if (!loaded) {
    return (
      <span
        aria-hidden
        className="grid place-items-center w-11 h-11 shrink-0 rounded-full border border-rule-strong bg-raised"
      />
    );
  }

  /*
   * No session: offer the thing to do, not the thing to join.
   *
   * This was a "Sign in" button, which put an account in front of somebody
   * whose money left an hour ago — and Kavach works without one. Signing in
   * only adds carrying cases between devices, which is worth nothing until
   * there is a case to carry. The route in is now the same as the one on the
   * landing page, and /start's own screen offers signing in to anybody who
   * wants it.
   */
  /*
   * Nothing. The bar this sits in already ends with its own "Start" button, so
   * returning a second one printed "Start Start" side by side to every
   * signed-out visitor — which is every first-time visitor. The paragraph above
   * still holds: what a signed-out person is offered is the thing to do rather
   * than an account to join. It is offered once.
   */
  if (!email) return null;

  const initial = (email.trim()[0] ?? "?").toUpperCase();

  const item =
    "flex w-full items-center gap-3 rounded-ctl px-3 py-3 text-start text-[0.9375rem] font-medium transition-colors hover:bg-ink/[0.055] hover:text-ink";

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="account-menu"
        aria-label={`${t("avatar.menu")}: ${email}`}
        title={email}
        className={cn(
          "press flex items-center gap-1 rounded-full border pe-1.5 ps-0 py-0 transition-colors",
          open ? "border-ink bg-ink text-paper" : "border-rule-strong bg-raised hover:border-ink",
        )}
      >
        <span
          className="grid place-items-center w-9 h-9 rounded-full bg-deep text-[#ffffeb] text-sm font-semibold"
          aria-hidden
        >
          {initial}
        </span>
        <Caret open={open} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id="account-menu"
          role="menu"
          aria-label={t("avatar.menu")}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); moveMenuFocus(menuRef.current, 1); }
            if (e.key === "ArrowUp") { e.preventDefault(); moveMenuFocus(menuRef.current, -1); }
          }}
          className="absolute end-0 top-full z-50 mt-3 w-64 rounded-card border border-ink/20 bg-paper/95 backdrop-blur-xl p-1.5 pb-2 shadow-[0_18px_50px_-18px_rgba(26,26,26,0.5)] rise"
        >
          {/* Identity first, repeated from the trigger: on a shared phone the
              glance that confirms whose account this is matters most. */}
          <p className="flex items-center gap-3 px-3 pt-2.5 pb-3">
            <span
              className="grid place-items-center w-9 h-9 shrink-0 rounded-full bg-deep text-[#ffffeb] text-sm font-semibold"
              aria-hidden
            >
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.9375rem] font-semibold leading-tight">{email}</span>
            </span>
          </p>

          <div className="border-t border-rule pt-1.5">
            {caseId && (
              <a
                role="menuitem"
                href={casePath(caseId)}
                onClick={close}
                className={cn(item, "font-semibold text-urgent")}
              >
                {t("nav.myCase")} →
              </a>
            )}
            <a role="menuitem" href="/cases" onClick={close} className={item}>
              {t("nav.cases")}
            </a>
            <a role="menuitem" href="/account" onClick={close} className={item}>
              {t("account.title")}
            </a>
          </div>

          {/* Separated and tinted: the exit is not one more link. */}
          <div className="mt-1.5 border-t border-rule pt-1.5">
            <button
              role="menuitem"
              type="button"
              onClick={signOut}
              disabled={busy}
              className={cn(item, "text-urgent-ink hover:bg-urgent-soft disabled:opacity-50")}
            >
              {busy ? `${t("auth.working")}…` : t("auth.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden
      className={cn("me-1 shrink-0 transition-transform duration-200", open && "rotate-180")}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
