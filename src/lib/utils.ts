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
