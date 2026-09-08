"use client";

import { Button } from "@/components/ui/Button";
import { authConfigured } from "@/lib/auth/config";
import { startHref } from "@/lib/auth/routes";
import { useAccountEmail } from "@/lib/auth/session";
import { useT } from "@/lib/i18n/context";

/**
 * The one call to action in the header, pointed at whichever screen the person
 * can actually use: signed out it goes to sign-in first and comes back to
 * `/start` afterwards. `startHref` holds the reasoning and the edge cases.
 */
export function StartButton({ className }: { className?: string }) {
  const t = useT();
  const { email } = useAccountEmail();

  return (
    <Button href={startHref(email, authConfigured())} size="sm" className={className}>
      {t("nav.start")}
    </Button>
  );
}
