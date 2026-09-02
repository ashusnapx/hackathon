"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { findByRef, useCases } from "@/lib/case/store";
import { findCategory } from "@/lib/case/categories";
import { useT } from "@/lib/i18n/context";
import { fmtDate } from "@/lib/utils";

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
  const [ref, setRef] = useState("");
  const [missed, setMissed] = useState(false);

  const open = () => {
    const found = findByRef(ref);
    if (found) router.push(`/case/${found.id}`);
    else setMissed(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3 sm:pt-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-2xl rounded-card border border-ink/15 bg-paper/85 backdrop-blur-xl shadow-[0_6px_24px_-18px_rgba(26,26,26,0.55)] px-3 sm:px-4 h-[60px] sm:h-[64px] flex items-center gap-4">
          <Wordmark />
          <div className="ms-auto">
            <LanguageSwitcher compact />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-2xl px-5 sm:px-8 py-12 sm:py-16">
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
            <ul className="mt-4 border-t border-rule-strong">
              {cases.map((c) => (
                <li key={c.id} className="border-b border-rule">
                  <a
                    href={`/case/${c.id}`}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4 hover:bg-sunk/60 transition-colors px-1 -mx-1"
                  >
                    <span className="num text-[0.9375rem]">{c.ref}</span>
                    <span className="text-[0.9375rem] text-ink-2 min-w-0">
                      {findCategory(c.triage?.categoryId)?.label ?? "—"}
                    </span>
                    <span className="num text-sm text-ink-3 ms-auto shrink-0">{fmtDate(c.createdAt)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
