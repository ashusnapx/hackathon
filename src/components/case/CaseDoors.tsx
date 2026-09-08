"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";
import { cn } from "@/lib/utils";

/**
 * The case, as a list of doors.
 *
 * The page this replaces had three different ways of getting to things at once:
 * a strip of six tabs across the top, accordions down the middle, and disclosure
 * folds nested inside those accordions. Every one of them was reasonable on its
 * own. Together they meant a person had to learn three separate ideas about
 * where things live before they could find anything, and had no way of knowing
 * whether what they wanted was behind a tab, behind a triangle, or already on
 * screen further down.
 *
 * So there is now one idea. A list of rows; tapping a row opens it as its own
 * screen; a large Back button returns. That is the pattern a phone's settings
 * app uses, which means most people — including the ones who have never used
 * this product — already know it.
 *
 * Four things here are for people who cannot read the labels, which in India is
 * a large share of the people this exists for:
 *
 *  · Every row is numbered. Digits are recognised by many people who cannot
 *    read words, and the number never changes, so "the fourth one" stays a
 *    usable instruction over the phone from a relative.
 *  · Every row has a drawn icon, not a glyph from an icon font — a camera, a
 *    rupee, a clock — carrying the same meaning as the words beside it.
 *  · Every row has a colour-coded state dot with a text label beside it, so the
 *    state survives both colour-blindness and illiteracy, which is why it is
 *    never colour alone.
 *  · Rows are 68px tall. The 44px minimum is a floor for a steady hand, and the
 *    people opening this page have often just lost money and are shaking.
 */

export type DoorState = "urgent" | "wait" | "done" | "none";

export interface Door {
  id: string;
  title: DictKey;
  /** What is inside, in a few words, on the closed row. */
  summary?: string;
  state?: DoorState;
  /** Shown beside the dot, so state never depends on colour alone. */
  stateLabel?: string;
  icon: ReactNode;
  /**
   * True when the panel behind this door prints its own heading.
   *
   * Almost all of them do. The door screen still needs a heading — with Back
   * as the only other orientation cue, a screen reader user landing here has
   * nothing else to say where "here" is — so it keeps one and hides it
   * visually rather than painting the same words twice.
   */
  ownHeading?: boolean;
  render: () => ReactNode;
}

const DOT: Record<DoorState, string> = {
  urgent: "bg-urgent",
  wait: "bg-wait",
  done: "bg-done",
  none: "bg-ink/20",
};

export function CaseDoors({ doors, basePath }: { doors: Door[]; basePath: string }) {
  const t = useT();

  return (
    <ul className="mt-6 divide-y divide-rule border-y border-rule">
      {doors.map((door, i) => (
        <li key={door.id}>
          {/* A link, not a button. It has an address, so it can be opened in a
              new tab, sent to a relative, and reached with the phone's own
              Back gesture afterwards. */}
          <Link
            href={`${basePath}/${door.id}`}
            className="flex w-full items-center gap-4 py-4 text-start min-h-[68px] transition-colors hover:bg-sunk"
          >
            {/* The number and the icon, together, in one fixed-width column so
                the labels all start on the same line down the list. */}
            <span className="flex shrink-0 items-center gap-3">
              <span className="num w-5 text-end text-sm font-semibold text-ink-3" aria-hidden>
                {i + 1}
              </span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rule bg-raised text-ink-2">
                {door.icon}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[1.0625rem] font-medium leading-snug">{t(door.title)}</span>
              {door.summary && (
                <span className="mt-0.5 block text-[0.9375rem] leading-snug text-ink-3">{door.summary}</span>
              )}
            </span>

            {door.stateLabel && (
              <span className="flex shrink-0 items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", DOT[door.state ?? "none"])} aria-hidden />
                <span className="text-sm text-ink-3">{door.stateLabel}</span>
              </span>
            )}

            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="shrink-0 text-ink-3 rtl:rotate-180"
              aria-hidden
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The screen a door opens onto.
 *
 * The Back control is a full-height button with the word next to the arrow, at
 * the top-left where every phone puts it, and it is the first thing in the tab
 * order. An icon-only back arrow is the single most common way an app like this
 * strands somebody who cannot read it and does not know the gesture.
 */
export function DoorScreen({ title, home, crumb, titleHidden, children }: {
  title: string;
  /** The case this door belongs to. */
  home: string;
  /** The trail, rendered under the Back control. */
  crumb?: ReactNode;
  titleHidden?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div className="mt-2">
      <Link
        href={home}
        className="-ms-2 inline-flex items-center gap-2 rounded-ctl px-2 py-2.5 min-h-11 text-[0.9375rem] font-medium hover:bg-sunk transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="rtl:rotate-180" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {t("door.back")}
      </Link>
      {crumb && <div className="mt-1">{crumb}</div>}
      <h2 className={titleHidden ? "sr-only" : "mt-3 !font-sans !text-xl !font-semibold !tracking-normal"}>
        {title}
      </h2>
      <div className={titleHidden ? "mt-4" : "mt-5"}>{children}</div>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────────
   Drawn here rather than pulled from a font, because they have to hold their
   shape at 200% text zoom and in forced-colors mode, where an icon font is
   frequently the first thing to disappear. */

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Icons = {
  steps: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <path d="M4 7l2 2 3-4M4 15l2 2 3-4M13 7h7M13 17h7" />
    </svg>
  ),
  evidence: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <path d="M3 8a2 2 0 012-2h2l1.5-2h7L17 6h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </svg>
  ),
  money: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <path d="M7 5h10M7 9h10M15 5c0 4-3.4 4-6 4l7 10" />
    </svg>
  ),
  papers: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  call: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <path d="M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3z" />
      <path d="M6 11a6 6 0 0012 0M12 17v4M9 21h6" />
    </svg>
  ),
  clock: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.5l3.5 2" />
    </svg>
  ),
  rights: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <path d="M12 3l7 3v5.5c0 4.4-3 7.7-7 9.5-4-1.8-7-5.1-7-9.5V6z" />
      <path d="M9.5 12l1.8 1.8 3.4-3.6" />
    </svg>
  ),
  escalate: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <path d="M12 20V5M6 11l6-6 6 6" />
    </svg>
  ),
  care: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z" />
    </svg>
  ),
  ask: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <path d="M21 12a8.5 8.5 0 01-12.3 7.6L4 21l1.4-4.4A8.5 8.5 0 1121 12z" />
      <path d="M9.7 9.6A2.4 2.4 0 0114.3 10c0 1.6-2.3 1.9-2.3 3.4M12 16.4h.01" />
    </svg>
  ),
  manage: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden>
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="6" r="2.6" />
      <circle cx="18" cy="18" r="2.6" />
      <path d="M8.4 10.8l7.2-3.6M8.4 13.2l7.2 3.6" />
    </svg>
  ),
};
