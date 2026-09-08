/**
 * Indian folk motifs, drawn for Kavach — inspired, not taken.
 *
 * A direct copy of a renowned artist's painting would be theft with a credit
 * line taped to it, so every figure here is an original drawing after folk
 * originals: the Warli dance chain after Jivya Soma Mashe, the Tamil kolam
 * pulli and Mughal jaali already in the stylesheet, the Bengali kantha stitch
 * in the footer, and the lotus below. The footer names them all, because a
 * borrowing you cannot name is a borrowing you should not make.
 *
 * All three render in `currentColor` and carry no text, so they need no
 * translation and cost no image request on a 2G connection.
 */

/** The Warli tarpa dance: a chain of triangle-bodied figures, hand in hand. */
export function WarliStrip({ className }: { className?: string }) {
  // One unit every 64px across a 1280-wide viewBox; the arms are a single line
  // so the hands genuinely join, the way the dance does.
  const units = Array.from({ length: 20 }, (_, i) => i * 64);
  return (
    <svg
      viewBox="0 0 1280 56"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
    >
      {/* Joined arms, one stroke the whole width. */}
      <line x1="0" y1="23" x2="1280" y2="23" stroke="currentColor" strokeWidth="2.5" />
      {units.map((x) => (
        <g key={x}>
          <circle cx={x + 32} cy="9" r="4.5" fill="currentColor" />
          {/* Two triangles apex to apex at the waist — the Warli body. */}
          <path
            d={`M ${x + 24} 16 L ${x + 40} 16 L ${x + 32} 30 Z M ${x + 24} 44 L ${x + 40} 44 L ${x + 32} 30 Z`}
            fill="currentColor"
          />
          {/* Legs mid-step, alternating so the chain dances instead of marching. */}
          {Math.floor(x / 64) % 2 === 0 ? (
            <path
              d={`M ${x + 27} 44 L ${x + 21} 54 M ${x + 37} 44 L ${x + 43} 54`}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ) : (
            <path
              d={`M ${x + 27} 44 L ${x + 33} 54 M ${x + 37} 44 L ${x + 31} 54`}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

/** The lotus: national flower, and small enough to sit beside a label. */
export function LotusMark({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      {/* Three petals rising, two outer leaves steadying them. */}
      <path
        d="M8 1.5C9.6 4.6 9.6 7.6 8 9.8 6.4 7.6 6.4 4.6 8 1.5Z"
        fill="currentColor"
      />
      <path
        d="M4.2 3.6C6.4 4.9 7.5 6.9 7.6 9.6 5.3 9.2 3.9 6.9 4.2 3.6Z"
        fill="currentColor"
        opacity="0.75"
      />
      <path
        d="M11.8 3.6C9.6 4.9 8.5 6.9 8.4 9.6 10.7 9.2 12.1 6.9 11.8 3.6Z"
        fill="currentColor"
        opacity="0.75"
      />
      {/* The water line it floats on. */}
      <path
        d="M2.5 12.2Q8 14.6 13.5 12.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
