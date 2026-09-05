"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/browser";
import { authConfigured } from "@/lib/auth/config";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * The way back out.
 *
 * A full navigation rather than a router push, because signing out is a cookie
 * change and the middleware has to see it: a client-side transition would leave
 * the already-rendered page on screen still looking signed in.
 */
export function SignOutButton({ className }: { className?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  if (!authConfigured()) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await authClient().auth.signOut();
        } catch {
          // Signing out locally is still the right outcome when the network is
          // gone; the reload below leaves nothing signed in on this device.
        }
        // A router push would not do: the session lives in a cookie, and only a
        // real request lets the middleware read the new one.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
      }}
      className={cn(
        "text-xs text-ink-3 underline underline-offset-4 hover:text-ink disabled:opacity-50",
        className,
      )}
    >
      {t("auth.signOut")}
    </button>
  );
}
