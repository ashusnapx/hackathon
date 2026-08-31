import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Rs. 1,85,000 — Indian grouping, because that is how the amount will be read aloud. */
export function inr(n: number | undefined | null, withSymbol = true): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const s = n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return withSymbol ? `₹${s}` : s;
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** "2 hours ago", for the elapsed-time readouts. */
export function since(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ${m % 60} min`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ${h % 24} hr`;
}

/**
 * Copy text, and tell the truth about whether it worked.
 *
 * The async Clipboard API needs a secure context and a permission that several
 * Android WebViews decline silently. Since copying the complaint into the NCRP
 * portal is the whole point of this app, we fall back to the old
 * execCommand path before giving up, and the caller shows a real error if both
 * fail rather than a "Copied!" that lied.
 */
export async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    // Off-screen but still focusable, and not at a position that scrolls iOS.
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
