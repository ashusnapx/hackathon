import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A shield rendered as a stamped seal rather than an icon — the visual language
 * is official paperwork, and a rounded app-store glyph would undercut that.
 */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string | null }) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5 group", className)}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 2.5 4.5 7v10.2c0 6.6 4.7 10.9 11.5 12.3 6.8-1.4 11.5-5.7 11.5-12.3V7L16 2.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M16 8v11M11 13.5h10" stroke="var(--urgent)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[1.375rem] leading-none tracking-tight">Kavach</span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} aria-label="Kavach, home">
      {inner}
    </Link>
  );
}
