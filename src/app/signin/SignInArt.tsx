"use client";

import { useT } from "@/lib/i18n/context";

/**
 * The left half of the sign-in page.
 *
 * A password wall is where a frightened person meets an unexplained obstacle,
 * so this half exists to answer "why am I being asked for this" before the
 * question is out loud: the shield is the mark, and the paperwork inside it is
 * what is actually behind the wall.
 *
 * It is decoration, so it is hidden below `lg` rather than stacked. On a phone
 * the form is the entire job, and shipping an illustration that pushes the
 * email field below the fold would be a worse page, not a richer one. Nothing
 * load-bearing lives here — the emergency numbers sit with the form, where
 * every screen size can see them.
 */
export function SignInArt() {
  const t = useT();
  return (
    <aside
      // `on-deep` rather than `bg-deep`: the class carries the whole token set
      // for this ground — ink, rules, focus ring, and the print rule that turns
      // it back to black on white — so nothing inside needs a one-off colour.
      className="on-deep relative hidden lg:flex flex-col justify-between overflow-hidden p-10 xl:p-14"
      // Decorative in full: the words are repeated in the form column's own
      // copy, so a screen reader that skips this loses nothing.
      aria-hidden
    >
      <Glow />
      <div className="relative grid flex-1 place-items-center">
        <Shield />
      </div>
      <div className="relative max-w-sm">
        <p className="font-display text-[2rem] leading-[1.15] tracking-tight text-ink">
          {t("auth.artTitle")}
        </p>
        <p className="mt-4 text-[0.9375rem] leading-[1.65] text-ink-2">
          {t("auth.artBody")}
        </p>
      </div>
    </aside>
  );
}

/** A warm bloom off the top corner, so the panel is not a flat block of green. */
function Glow() {
  return (
    <div
      className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full opacity-25 blur-3xl"
      style={{ background: "radial-gradient(circle, var(--glow), transparent 70%)" }}
    />
  );
}

/**
 * Colours are written out rather than taken from tokens.
 *
 * This sits on one known ground — the deep green — and the drawing depends on
 * the contrast between the cream paper and that green. A token that is
 * redefined by a future theme would quietly turn the case file the same colour
 * as the panel behind it.
 */
const CREAM = "#ffffeb";
const DEEP = "#034f46";
const FLARE = "#ff6c4c";

function Shield() {
  return (
    <svg viewBox="0 0 384 384" className="w-full max-w-[24rem]" fill="none">
      {/* Rings, as on a stamp rather than a halo. */}
      <circle cx="192" cy="196" r="178" stroke={CREAM} strokeOpacity="0.16" strokeWidth="1.5" />
      <circle
        cx="192" cy="196" r="152"
        stroke={CREAM} strokeOpacity="0.22" strokeWidth="1.5" strokeDasharray="2 10" strokeLinecap="round"
      />

      {/* The mark from the header, drawn at twelve times the size. */}
      <path
        d="M192 30 54 84v122.4c0 79.2 56.4 130.8 138 147.6 81.6-16.8 138-68.4 138-147.6V84L192 30Z"
        fill={CREAM}
        fillOpacity="0.05"
        stroke={CREAM}
        strokeOpacity="0.9"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* Two case files behind the front one: this is a folder, not a page. */}
      <g opacity="0.4">
        <rect x="126" y="128" width="132" height="150" rx="12" fill={CREAM} transform="rotate(-6 192 203)" />
      </g>
      <g opacity="0.65">
        <rect x="126" y="128" width="132" height="150" rx="12" fill={CREAM} transform="rotate(3 192 203)" />
      </g>

      {/* The one in front, with its reference line and the lines of a statement. */}
      <rect x="122" y="126" width="140" height="156" rx="13" fill={CREAM} />
      <rect x="140" y="148" width="58" height="7" rx="3.5" fill={FLARE} />
      <g fill={DEEP} opacity="0.24">
        <rect x="140" y="172" width="104" height="6" rx="3" />
        <rect x="140" y="188" width="104" height="6" rx="3" />
        <rect x="140" y="204" width="72" height="6" rx="3" />
      </g>

      {/* Filed and acknowledged. The tick is the only saturated mark on the
          page, which is the same rule the buttons follow. */}
      <circle cx="192" cy="246" r="19" fill={DEEP} />
      <path
        d="m183 246 6.5 6.5L201 240"
        stroke={CREAM} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
