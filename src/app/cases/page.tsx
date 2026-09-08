"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaseTable } from "@/components/case/CaseTable";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { casePath, findByRef, useCases } from "@/lib/case/store";
import { useAccountCases } from "@/lib/case/account-cases";
import { useT } from "@/lib/i18n/context";

/**
 * Coming back to a case you started before.
 *
 * The reference is printed on every document and read down the phone to
 * officers, so it is the handle people actually keep — but until now there was
 * nowhere to type it back in. Case files are stored on the device and nowhere
 * else, which is a deliberate privacy choice with an obvious cost: a reference
 * from another phone cannot be found here. Saying that plainly beats letting
 * someone conclude their case was deleted.
 */
export default function CasesPage() {
  const t = useT();
  const router = useRouter();
  const cases = useCases();
  const account = useAccountCases();
  const [ref, setRef] = useState("");
  const [missed, setMissed] = useState(false);

  const open = () => {
    const found = findByRef(ref);
    if (found) router.push(casePath(found.id));
    else setMissed(true);
  };

  return (
    <>
      <SiteHeader width="3xl" />

      <main id="main" className="mx-auto max-w-3xl px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl">{t("case.findTitle")}</h1>
        <p className="mt-4 text-[1.0625rem] leading-[1.65] text-ink-2 max-w-prose">{t("case.findSub")}</p>

        <div className="mt-8 flex flex-wrap items-end gap-3">
          <Field
            label={t("case.ref")}
            value={ref}
            mono
            onChange={(e) => {
              setRef(e.target.value.toUpperCase());
              setMissed(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && open()}
            placeholder={t("case.findPlaceholder")}
            className="flex-1 min-w-[14rem]"
            error={missed ? t("case.findNone") : undefined}
          />
          <Button onClick={open} size="md" className="h-12">{t("case.findCta")}</Button>
        </div>

        {cases.length > 0 && (
          <section className="mt-14">
            <p className="label">{t("case.recent")}</p>
            {(account === "synced" || account === "syncing") && (
              <p className="mt-2 text-sm text-ink-3" aria-live="polite">
                {t("case.accountSync")}
              </p>
            )}
            <CaseTable cases={cases} />
          </section>
        )}
      </main>
    </>
  );
}
