"use client";

import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/context";

/**
 * The part of the damage that is not money.
 *
 * Official follow-up routes when identity documents or a handset may have been
 * exposed. Each route remains a request/check with its own prerequisites.
 */

const ITEMS = [
  {
    id: "tafcop",
    href: "https://tafcop.sancharsaathi.gov.in/telecomUser/",
    titleKey: "care.sim.t",
    bodyKey: "care.sim.b",
  },
  {
    id: "ceir",
    href: "https://ceir.sancharsaathi.gov.in/",
    titleKey: "care.phone.t",
    bodyKey: "care.phone.b",
  },
  {
    id: "credit",
    href: undefined,
    titleKey: "care.credit.t",
    bodyKey: "care.credit.b",
  },
] as const;

export function Aftercare() {
  const t = useT();

  return (
    <section className="sheet overflow-hidden">
      <div className="px-5 py-4 border-b border-rule bg-sunk">
        <p className="label">{t("care.kicker")}</p>
        <h3 className="mt-1.5 text-2xl">{t("care.title")}</h3>
        <p className="mt-2 text-[0.9375rem] leading-snug text-ink-2 max-w-xl">{t("care.sub")}</p>
      </div>

      <ul className="divide-y divide-rule">
        {ITEMS.map((item) => (
          <li key={item.id} className="px-5 py-4">
            <p className="text-lg leading-snug">{t(item.titleKey)}</p>
            <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-ink-2 max-w-2xl">{t(item.bodyKey)}</p>
            {item.href && (
              <Button href={item.href} size="sm" variant="secondary" external className="mt-3">
                {t("track.open")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
