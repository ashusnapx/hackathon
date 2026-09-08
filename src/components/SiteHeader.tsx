"use client";

import { AccountAvatar } from "@/components/auth/AccountAvatar";
import { AccessibilityControls } from "@/components/AccessibilityControls";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Wordmark } from "@/components/Wordmark";
import { useAccountCases } from "@/lib/case/account-cases";
import { cn } from "@/lib/utils";

/**
 * One header, on every page that is not the landing page.
 *
 * It was the same two hundred characters of class names copied into seven
 * files, differing only in a max-width, which is how a product ends up with a
 * language picker that sits in a different place depending on where you are.
 * The width still varies, because the bar is meant to line up with the column
 * of content under it, so that is the one thing this takes as a prop.
 *
 * The row never wraps and never grows: on a 320px screen the wordmark shortens
 * to the shield, the status text hides, and the two controls stay put. Anything
 * a page wants to add goes in `status`, which is the first thing dropped when
 * there is no room for it.
 */
const WIDTHS = {
  md: "max-w-md",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

export function SiteHeader({ width = "5xl", status, action, noPrint }: {
  width?: keyof typeof WIDTHS;
  /** A case file is printed and handed over; its chrome is not part of that. */
  noPrint?: boolean;
  /** A save indicator or sync state. Hidden below `sm`, where there is no room. */
  status?: React.ReactNode;
  /** A page's own call to action, kept to the end of the row. */
  action?: React.ReactNode;
}) {
  // Mounted here so every non-landing page reconciles the signed-in account's
  // keyring with this device's. The return is unused: the pull writes cases
  // into the store, and the list re-renders itself.
  useAccountCases();
  return (
    <header className={cn("sticky top-0 z-40 px-3 sm:px-5 pt-3 sm:pt-4 pointer-events-none", noPrint && "no-print")}>
      <div
        className={cn(
          "pointer-events-auto mx-auto rounded-card border border-ink/15 bg-paper/90 backdrop-blur-xl",
          "shadow-[0_6px_24px_-18px_rgba(26,26,26,0.55)]",
          "px-2.5 sm:px-4 h-[60px] sm:h-[64px] flex items-center gap-2 sm:gap-3 flex-nowrap",
          WIDTHS[width],
        )}
      >
        <Wordmark />
        {/*
          The status cannot be the thing that pushes the controls to the end of
          the row: it is hidden below `sm`, so on a phone it collapsed to
          nothing and the controls stayed bunched against the wordmark with a
          dead gap beside them. This spacer pushes at every width, and the
          status simply sits in it once there is room to show it.
        */}
        <div className="ms-auto hidden min-w-0 flex-1 items-center justify-end sm:flex">{status}</div>
        <div className="ms-auto sm:hidden" aria-hidden />
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageSwitcher compact />
          <AccessibilityControls />
          <AccountAvatar />
          {action}
        </div>
      </div>
    </header>
  );
}
