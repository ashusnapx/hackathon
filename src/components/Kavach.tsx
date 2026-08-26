"use client";

interface KavachProps {
  mood?: "happy" | "thinking" | "worried" | "celebrating";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Kavach({ mood = "happy", size = "md", className = "" }: KavachProps) {
  const sizes = {
    sm: { w: 48, h: 48 },
    md: { w: 80, h: 80 },
    lg: { w: 120, h: 120 },
  };

  const { w, h } = sizes[size];

  const eyes: Record<string, { cy: number; rx: number; ry: number }> = {
    happy: { cy: 38, rx: 4, ry: 5 },
    thinking: { cy: 36, rx: 4, ry: 5 },
    worried: { cy: 40, rx: 4, ry: 4 },
    celebrating: { cy: 36, rx: 4, ry: 3 },
  };

  const mouths: Record<string, string> = {
    happy: "M 34 48 Q 40 54 46 48",
    thinking: "M 36 48 Q 40 48 44 48",
    worried: "M 34 50 Q 40 46 46 50",
    celebrating: "M 32 47 Q 40 56 48 47",
  };

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Kavach mascot"
    >
      {/* Shield body */}
      <path
        d="M 40 8 L 62 18 L 62 38 Q 62 58 40 72 Q 18 58 18 38 L 18 18 Z"
        fill="#2563EB"
        stroke="#1D4ED8"
        strokeWidth="1.5"
      />

      {/* Shield inner highlight */}
      <path
        d="M 40 12 L 58 20 L 58 37 Q 58 54 40 67 Q 22 54 22 37 L 22 20 Z"
        fill="url(#kavach-gradient)"
        opacity="0.9"
      />

      {/* Face area */}
      <ellipse cx="40" cy="40" rx="16" ry="18" fill="white" opacity="0.15" />

      {/* Eyes */}
      <ellipse
        cx="34"
        cy={eyes[mood].cy}
        rx={eyes[mood].rx}
        ry={eyes[mood].ry}
        fill="white"
      />
      <ellipse
        cx="46"
        cy={eyes[mood].cy}
        rx={eyes[mood].rx}
        ry={eyes[mood].ry}
        fill="white"
      />

      {/* Pupils */}
      <circle cx="35" cy={eyes[mood].cy + 1} r="2" fill="#1A1A2E" />
      <circle cx="47" cy={eyes[mood].cy + 1} r="2" fill="#1A1A2E" />

      {/* Eye shine */}
      <circle cx="36" cy={eyes[mood].cy - 1} r="0.8" fill="white" opacity="0.8" />
      <circle cx="48" cy={eyes[mood].cy - 1} r="0.8" fill="white" opacity="0.8" />

      {/* Mouth */}
      <path
        d={mouths[mood]}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Blush */}
      <ellipse cx="28" cy="44" rx="3" ry="2" fill="#EC4899" opacity="0.3" />
      <ellipse cx="52" cy="44" rx="3" ry="2" fill="#EC4899" opacity="0.3" />

      {/* Thinking bubble for thinking mood */}
      {mood === "thinking" && (
        <>
          <circle cx="62" cy="22" r="3" fill="#E5E7EB" />
          <circle cx="67" cy="16" r="2" fill="#E5E7EB" />
          <circle cx="72" cy="12" r="1.5" fill="#E5E7EB" />
        </>
      )}

      {/* Celebration sparkles */}
      {mood === "celebrating" && (
        <>
          <circle cx="14" cy="14" r="2" fill="#FBBF24" />
          <circle cx="66" cy="14" r="1.5" fill="#FBBF24" />
          <circle cx="10" cy="30" r="1" fill="#EC4899" />
          <circle cx="70" cy="30" r="1.5" fill="#EC4899" />
        </>
      )}

      <defs>
        <linearGradient id="kavach-gradient" x1="40" y1="12" x2="40" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
