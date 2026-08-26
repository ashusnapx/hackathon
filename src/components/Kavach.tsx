"use client";

import { motion } from "framer-motion";

interface KavachProps {
  mood?: "happy" | "thinking" | "worried" | "celebrating";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { w: 48, h: 48 },
  md: { w: 80, h: 80 },
  lg: { w: 120, h: 120 },
};

const eyeVariants = {
  happy: { cy: 38, ry: 5 },
  thinking: { cy: 36, ry: 5 },
  worried: { cy: 40, ry: 4 },
  celebrating: { cy: 36, ry: 3 },
};

const mouthVariants = {
  happy: "M 34 48 Q 40 54 46 48",
  thinking: "M 36 48 Q 40 48 44 48",
  worried: "M 34 50 Q 40 46 46 50",
  celebrating: "M 32 47 Q 40 56 48 47",
};

export function Kavach({ mood = "happy", size = "md", className = "" }: KavachProps) {
  const { w, h } = sizes[size];
  const eye = eyeVariants[mood];

  return (
    <motion.div
      className={className}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      <motion.svg
        width={w}
        height={h}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Kavach mascot"
        animate={
          mood === "celebrating"
            ? { rotate: [0, -3, 3, -3, 0] }
            : mood === "thinking"
            ? { rotate: [0, 5, 0] }
            : {}
        }
        transition={
          mood === "celebrating"
            ? { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
            : mood === "thinking"
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : {}
        }
      >
        {/* Shield body */}
        <motion.path
          d="M 40 8 L 62 18 L 62 38 Q 62 58 40 72 Q 18 58 18 38 L 18 18 Z"
          fill="#2563EB"
          stroke="#1D4ED8"
          strokeWidth="1.5"
          animate={
            mood === "celebrating"
              ? { fill: ["#2563EB", "#3B82F6", "#2563EB"] }
              : {}
          }
          transition={{ duration: 1, repeat: Infinity }}
        />

        {/* Shield inner */}
        <path
          d="M 40 12 L 58 20 L 58 37 Q 58 54 40 67 Q 22 54 22 37 L 22 20 Z"
          fill="url(#kavach-grad)"
          opacity="0.9"
        />

        {/* Face area */}
        <ellipse cx="40" cy="40" rx="16" ry="18" fill="white" opacity="0.15" />

        {/* Eyes */}
        <motion.ellipse
          cx="34"
          cy={eye.cy}
          rx={4}
          ry={eye.ry}
          fill="white"
          animate={{ cy: eye.cy, ry: eye.ry }}
          transition={{ type: "spring", stiffness: 300 }}
        />
        <motion.ellipse
          cx="46"
          cy={eye.cy}
          rx={4}
          ry={eye.ry}
          fill="white"
          animate={{ cy: eye.cy, ry: eye.ry }}
          transition={{ type: "spring", stiffness: 300 }}
        />

        {/* Pupils */}
        <motion.circle
          cx="35"
          r="2"
          fill="#1A1A2E"
          animate={{ cy: eye.cy + 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        />
        <motion.circle
          cx="47"
          r="2"
          fill="#1A1A2E"
          animate={{ cy: eye.cy + 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        />

        {/* Eye shine */}
        <motion.circle
          cx="36"
          r="0.8"
          fill="white"
          opacity="0.8"
          animate={{ cy: eye.cy - 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        />
        <motion.circle
          cx="48"
          r="0.8"
          fill="white"
          opacity="0.8"
          animate={{ cy: eye.cy - 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        />

        {/* Mouth */}
        <motion.path
          d={mouthVariants[mood]}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          animate={{ d: mouthVariants[mood] }}
          transition={{ type: "spring", stiffness: 200 }}
        />

        {/* Blush */}
        <motion.ellipse
          cx="28"
          cy="44"
          rx="3"
          ry="2"
          fill="#EC4899"
          animate={{
            opacity: mood === "happy" || mood === "celebrating" ? 0.4 : 0.2,
          }}
          transition={{ duration: 0.3 }}
        />
        <motion.ellipse
          cx="52"
          cy="44"
          rx="3"
          ry="2"
          fill="#EC4899"
          animate={{
            opacity: mood === "happy" || mood === "celebrating" ? 0.4 : 0.2,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Thinking bubbles */}
        {mood === "thinking" && (
          <g>
            <motion.circle
              cx="62"
              cy="22"
              r="3"
              fill="#E5E7EB"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            />
            <motion.circle
              cx="67"
              cy="16"
              r="2"
              fill="#E5E7EB"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
            />
            <motion.circle
              cx="72"
              cy="12"
              r="1.5"
              fill="#E5E7EB"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
            />
          </g>
        )}

        {/* Celebration sparkles */}
        {mood === "celebrating" && (
          <g>
            <motion.circle
              cx="14"
              cy="14"
              r="2"
              fill="#FBBF24"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.1, duration: 0.4 }}
            />
            <motion.circle
              cx="66"
              cy="14"
              r="1.5"
              fill="#FBBF24"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.3, duration: 0.4 }}
            />
            <motion.circle
              cx="10"
              cy="30"
              r="1"
              fill="#EC4899"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.5, duration: 0.4 }}
            />
            <motion.circle
              cx="70"
              cy="30"
              r="1.5"
              fill="#EC4899"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.7, duration: 0.4 }}
            />
          </g>
        )}

        <defs>
          <linearGradient
            id="kavach-grad"
            x1="40"
            y1="12"
            x2="40"
            y2="72"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
      </motion.svg>
    </motion.div>
  );
}
