"use client";

import { AccountAvatar } from "@/components/auth/AccountAvatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Wordmark } from "@/components/Wordmark";
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
        {status && <div className="hidden sm:flex ms-auto items-center min-w-0">{status}</div>}
        <div className={cn("flex items-center gap-2 shrink-0", !status && "ms-auto")}>
          <LanguageSwitcher compact />
          <AccountAvatar />
          {action}
        </div>
      </div>
    </header>
  );
}
