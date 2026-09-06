"use client";

import { useT } from "@/lib/i18n/context";

/**
 * The left half of the sign-in page.
 *
 * A password wall is where a frightened person meets an unexplained obstacle,
 * so this half answers "why am I being asked for this" before the question is
 * out loud: the shield is the mark, and the paperwork inside it is what is
 * actually behind the wall — a filed complaint, a stamped acknowledgement, the
 * receipt for the money that went.
 *
 * It is decoration, so it is hidden below `lg` rather than stacked. On a phone
 * the form is the entire job, and an illustration that pushes the email field
 * below the fold is a worse page, not a richer one. Nothing load-bearing lives
 * here — the emergency numbers sit with the form, where every screen sees them.
 */
export function SignInArt() {
  const t = useT();
  return (
    <aside
      // `on-deep` rather than `bg-deep`: the class carries the whole token set
      // for this ground — ink, rules, focus ring, and the print rule that turns
      // it back to black on white — so nothing inside needs a one-off colour.
      className="on-deep relative hidden lg:flex lg:h-dvh flex-col justify-between overflow-hidden p-10 xl:p-12"
      // Decorative in full: the words are repeated in the form column's own
      // copy, so a screen reader that skips this loses nothing.
      aria-hidden
    >
      <Glow />
      {/* `min-h-0` so this can actually give way. The panel clips its overflow
          for the sake of the bloom, so a caption that runs to five lines in
          another language has to take the room out of the drawing rather than
          off the bottom of the screen. */}
      <div className="relative grid min-h-0 flex-1 place-items-center">
        <CaseFile />
      </div>
      <div className="relative max-w-sm">
        <p className="font-display text-[1.75rem] xl:text-[2rem] leading-[1.15] tracking-tight text-ink">
          {t("auth.artTitle")}
        </p>
        <p className="mt-3 text-[0.9375rem] leading-[1.6] text-ink-2">{t("auth.artBody")}</p>
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
 * The drawing sits on one known ground and depends on the contrast between
 * cream paper and deep green. A token redefined by some future theme would
 * quietly turn the case file the same colour as the panel behind it.
 */
const CREAM = "#ffffeb";
const DEEP = "#034f46";
const FLARE = "#ff6c4c";

/**
 * The scene, square, so one `max-width` governs both dimensions and the whole
 * thing shrinks on a short laptop instead of pushing the caption off-screen.
 */
function CaseFile() {
  return (
    <svg viewBox="0 0 420 420" className="h-auto max-h-full w-full max-w-[min(27rem,46vh)]" fill="none">
      {/* Rings, as on a stamp rather than a halo. */}
      <circle cx="210" cy="210" r="190" stroke={CREAM} strokeOpacity="0.14" strokeWidth="1.5" />
      <circle
        cx="210" cy="210" r="164"
        stroke={CREAM} strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="2 10" strokeLinecap="round"
      />

      {/* Flecks, to give the green some air. */}
      <g fill={CREAM} opacity="0.3">
        <circle cx="64" cy="128" r="3" />
        <circle cx="128" cy="58" r="2.5" />
        <circle cx="352" cy="300" r="3.5" />
        <circle cx="292" cy="392" r="2.5" />
      </g>

      {/* The mark from the header, at twelve times the size, holding the rest. */}
      <g transform="translate(18 25)">
        <path
          d="M192 30 54 84v122.4c0 79.2 56.4 130.8 138 147.6 81.6-16.8 138-68.4 138-147.6V84L192 30Z"
          fill={CREAM}
          fillOpacity="0.06"
          stroke={CREAM}
          strokeOpacity="0.85"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      </g>

      {/* Three files fanned: this is a folder, not a page. */}
      <g opacity="0.35">
        <rect x="140" y="140" width="140" height="160" rx="13" fill={CREAM} transform="rotate(-7 210 220)" />
      </g>
      <g opacity="0.6">
        <rect x="140" y="140" width="140" height="160" rx="13" fill={CREAM} transform="rotate(4 210 220)" />
      </g>

      {/* The one in front: a heading, the lines of a statement, and a seal. */}
      <rect x="140" y="140" width="140" height="160" rx="13" fill={CREAM} />
      <rect x="158" y="162" width="58" height="8" rx="4" fill={FLARE} />
      <g fill={DEEP} opacity="0.22">
        <rect x="158" y="186" width="104" height="6" rx="3" />
        <rect x="158" y="202" width="104" height="6" rx="3" />
        <rect x="158" y="218" width="72" height="6" rx="3" />
      </g>
      <circle cx="210" cy="262" r="20" fill={DEEP} />
      <path d="m201 262 6.5 6.5L220 255" stroke={CREAM} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* The receipt for the money that went — the thing everybody arrives
          holding, and the first thing the interview asks about. */}
      <g transform="rotate(-8 79 326)">
        <path
          d="M40 296q0-14 14-14h50q14 0 14 14v66l-9.75 9-9.75-9-9.75 9-9.75-9-9.75 9-9.75-9-9.75 9-9.75-9z"
          fill={CREAM}
        />
        <g fill={DEEP} opacity="0.24">
          <rect x="52" y="300" width="52" height="5" rx="2.5" />
          <rect x="52" y="314" width="52" height="5" rx="2.5" />
          <rect x="52" y="328" width="32" height="5" rx="2.5" />
        </g>
      </g>

      {/* Filed and acknowledged. The one saturated ring on the page, which is
          the same rule the buttons follow. */}
      <g transform="rotate(9 350 104)">
        <circle cx="350" cy="104" r="34" fill={CREAM} />
        <circle cx="350" cy="104" r="34" stroke={FLARE} strokeWidth="2.5" />
        <circle
          cx="350" cy="104" r="26"
          stroke={DEEP} strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round"
        />
        <path d="m339 104 7.5 7.5L362 96" stroke={DEEP} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
