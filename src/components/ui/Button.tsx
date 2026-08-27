"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "urgent";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // Ink, not brand blue. The one loud colour is reserved for urgency.
  primary: "bg-ink text-paper hover:bg-ink/88 border border-ink",
  secondary: "bg-raised text-ink border border-rule-strong hover:border-ink hover:bg-sunk",
  ghost: "text-ink-2 hover:text-ink hover:bg-sunk border border-transparent",
  urgent: "bg-urgent text-white border border-urgent hover:bg-urgent-ink",
};

const SIZES: Record<Size, string> = {
  // 44px / 48px / 56px — all comfortably above the touch-target floor.
  sm: "h-11 px-4 text-[0.9375rem]",
  md: "h-12 px-5 text-base",
  lg: "h-14 px-7 text-[1.0625rem]",
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  external?: boolean;
  full?: boolean;
}

export function Button({
  variant = "primary", size = "md", href, external, full, className, children, ...rest
}: Props) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-[3px] font-medium tracking-tight",
    "transition-colors duration-150 select-none",
    "disabled:opacity-45 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
    className,
  );

  if (href) {
    if (external || href.startsWith("http") || href.startsWith("tel:")) {
      return (
        <a
          href={href}
          className={cls}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {children}
        </a>
      );
    }
    return <Link href={href} className={cls}>{children}</Link>;
  }

  return <button className={cls} {...rest}>{children}</button>;
}
