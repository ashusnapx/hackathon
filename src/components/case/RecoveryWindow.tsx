"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { windowPhase } from "@/lib/case/time";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * Time creates urgency, but the official systems do not publish a defensible
 * case-level probability of freezing or recovering money. This keeps the useful
 * clock and removes the old made-up percentage curve.
 */
export function RecoveryWindow({ incidentAt }: { incidentAt: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const incident = new Date(incidentAt).getTime();
  const minutes = Number.isFinite(incident) ? Math.max(0, (now - incident) / 60_000) : 0;
  const phase = windowPhase(minutes);
  const tone = {
    strong: "border-urgent/40 bg-urgent-soft text-urgent-ink",
    fading: "border-wait/40 bg-wait/10 text-ink",
    late: "border-rule-strong bg-raised text-ink",
    expired: "border-rule-strong bg-raised text-ink",
  }[phase];
  const headline = {
    strong: "window.strong",
    fading: "window.fading",
    late: "window.late",
    expired: "window.expired",
  } as const;
  const sub = {
    strong: "window.sub.strong",
    fading: "window.sub.fading",
    late: "window.sub.late",
    expired: "window.sub.late",
  } as const;
  const elapsed =
    minutes < 60
      ? `${Math.floor(minutes)} min`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} hr ${Math.floor(minutes % 60)} min`
        : `${Math.floor(minutes / 1440)} days`;

  return (
    <section className={cn("rounded-card border px-5 py-5", tone)} aria-label={t("window.title")}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-5">
        <div className="flex-1 min-w-0">
          <p className="label !text-current/65">{t("window.title")}</p>
          <h2 className="mt-2 !font-sans !text-2xl !font-semibold !tracking-normal !leading-snug">{t(headline[phase])}</h2>
          <p className="mt-2 text-[0.9375rem] leading-[1.6] opacity-85 max-w-2xl">{t(sub[phase])}</p>
          <p className="mt-3 text-xs leading-[1.55] opacity-70">{t("window.noOdds")}</p>
        </div>
        <div className="sm:text-end shrink-0">
          <p className="num text-3xl font-medium">{elapsed}</p>
          <p className="mt-1 text-xs opacity-70">{t("window.elapsed")}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button href="tel:1930" external variant="urgent" size="md">{t("sos.call")}</Button>
        <Button href="https://cybercrime.gov.in" external variant="secondary" size="md">{t("track.ncrp.open")}</Button>
      </div>
    </section>
  );
}
