"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { StepText } from "@/components/ui/StepText";
import { DocModal } from "@/components/case/DocModal";
import { Countdown } from "./Countdown";
import { ReadAloud } from "./ReadAloud";
import { findCategory, findSubcategory } from "@/lib/case/categories";
import { nextAction, upcomingDeadline } from "@/lib/case/tracks";
import type { CaseFile } from "@/lib/case/types";
import { useT } from "@/lib/i18n/context";
import { fmtDate, inr, since, writeToClipboard } from "@/lib/utils";

/**
 * One banner: who this case is, what it cost, and exactly what to do next.
 *
 * These were three separate blocks — a header carrying the reference and the
 * amount, a "Do this now" heading, and a card holding the next action — each
 * with its own border and its own rhythm, stacked down the top of the screen.
 * A person arriving at this page had to read all three and assemble the answer
 * themselves, and the one thing they came for was at the bottom of it.
 *
 * The steps are inside the banner rather than a click away. That is the whole
 * change: "Call 1930" is not an instruction, it is a heading. The instruction
 * is what to say when somebody picks up, and until it was on this screen the
 * person had to open a track, expand it, and read past two paragraphs to find
 * it.
 *
 * There is exactly one button. A second reading "Ten tracks" used to sit beside
 * it, going to the same place as the first row of the list below and as the
 * jump link at the foot of this banner — three routes to one destination, on
 * the screen where somebody is deciding what to do in the next five minutes.
 * The list is directly underneath; it does not need a shortcut past itself.
 *
 * Deleting the case is deliberately NOT here any more. It used to sit directly
 * under the reference, a plain underlined link a few millimetres from the thing
 * everybody taps to copy. It now lives behind the door that says "Share, save
 * or delete", which is where somebody looking for it would go, and nowhere near
 * a thumb that is aiming at something else.
 */
export function CaseBanner({ caseFile: c, spoken, doorCount, update }: {
  caseFile: CaseFile;
  /** Written summary for the read-aloud button; see ReadAloud. */
  spoken: string;
  /** How many other things this case holds, named on the jump link. */
  doorCount: number;
  /** Lets the draft opened from a step write back what the person edits. */
  update: (patch: Partial<CaseFile> | ((current: CaseFile) => Partial<CaseFile>)) => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  const next = nextAction(c);
  const upcoming = upcomingDeadline(c);
  const sub = findSubcategory(c.triage?.categoryId, c.triage?.subcategoryId);
  const incidentAt = c.incidentAt || c.triage?.incidentAt;
  const overdue = next?.state === "missed";
  // The next action's own draft, when one has been generated. Without it the
  // step's button does not render at all rather than opening an empty sheet.
  const docKey = next?.def.doc;
  const draft = docKey && typeof c.docs?.[docKey] === "string" && c.docs[docKey] ? docKey : null;

  // The reference is the one thing somebody has to carry between this screen, a
  // phone call and a police counter. Making them retype it off a screen is how
  // it gets written down wrong.
  const copyRef = async () => {
    if (await writeToClipboard(c.ref)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <section
      className={`sheet overflow-hidden ${overdue ? "border-urgent/45" : "border-ink"}`}
      aria-labelledby="banner-action"
    >
      {/*
        Who and how much, on one line.

        This was five stacked rows — a "Case reference" label, the reference at
        display size, a copy hint, a disclaimer, the amount under its own label,
        then the category chips. None of it is what the person came for, and on
        a 360px phone it pushed the actual instruction below the fold. It is now
        one line of small type: the reference (still tappable, still the thing
        they have to carry), the amount, and what kind of fraud it was.
      */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule bg-sunk px-5 py-2.5 text-sm">
        <button
          onClick={copyRef}
          className="group inline-flex min-h-11 items-center gap-1.5 text-start"
          aria-label={t("case.copyRef")}
        >
          <span className="num font-semibold tracking-tight">{c.ref}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3 transition-colors group-hover:text-ink" aria-hidden>
            {copied
              ? <path d="M5 13l4 4L19 7" />
              : <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></>}
          </svg>
          <span className="sr-only">{copied ? t("doc.copied") : t("case.copyRef")}</span>
        </button>

        {c.amount ? (
          <>
            <span className="text-ink-3" aria-hidden>·</span>
            <span className="num font-semibold">{inr(c.amount)}</span>
            <span className="text-ink-3">{t("case.lost").toLowerCase()}</span>
          </>
        ) : null}

        {(sub ?? findCategory(c.triage?.categoryId)) && (
          <>
            <span className="text-ink-3" aria-hidden>·</span>
            <span className="min-w-0 truncate text-ink-2">
              {(sub ?? findCategory(c.triage?.categoryId))!.label}
            </span>
          </>
        )}

        {incidentAt && (
          <span className="ms-auto text-xs text-ink-3">{since(incidentAt)} {t("g.ago")}</span>
        )}
      </div>

      {/* ── The instruction, and how to carry it out. ────────────────────── */}
      <div className={`px-5 py-5 ${overdue ? "bg-urgent-soft" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`label ${overdue ? "!text-urgent-ink/70" : ""}`}>{t("plan.now")}</p>
          <div className="flex items-center gap-3">
            {next?.deadline && (
              <span className="inline-flex items-center gap-2">
                {next.def.id === "ombudsman" && <span className="text-xs text-ink-3">{t("track.fileBy")}</span>}
                <Countdown target={next.deadline} />
              </span>
            )}
            <ReadAloud text={spoken} className="no-print" />
          </div>
        </div>

        {next ? (
          <>
            <h2 id="banner-action" className="mt-2 text-2xl sm:text-3xl leading-tight">
              {t(next.def.titleKey)}
            </h2>

            {next.def.stepKeys ? (
              <ol className="mt-4 max-w-2xl space-y-2.5">
                {next.def.stepKeys.map((key, i) => (
                  <li key={key} className="flex gap-3">
                    <span
                      className="num mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule-strong text-xs font-semibold text-ink-2"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="text-[1rem] leading-[1.5]"><StepText onOpenDoc={draft ? () => setDocOpen(true) : undefined} docLabel={t("track.openDoc")}>{t(key)}</StepText></span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.65] text-ink-2">{t(next.def.howKey)}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {next.def.action && (
                <Button
                  href={next.def.action.href}
                  variant={next.def.action.tel ? "urgent" : "primary"}
                  size="md"
                  external
                >
                  {t(next.def.action.labelKey)}
                </Button>
              )}
            </div>
          </>
        ) : (
          <p id="banner-action" className="mt-2 text-lg">
            {t(upcoming?.dateKind === "opens" ? "case.nextOpens" : "case.nextNone")}{" "}
            {upcoming?.deadline ? <span className="num">{fmtDate(upcoming.deadline.toISOString())}</span> : "—"}
          </p>
        )}
      </div>

      {draft && docOpen && (
        <DocModal
          caseFile={c}
          docKey={draft as Parameters<typeof DocModal>[0]["docKey"]}
          update={update}
          onClose={() => setDocOpen(false)}
        />
      )}

      {/*
        The reason this is here: the banner filled a phone screen, and nothing
        on it said there was anything below. A person who had made the call had
        no way of knowing the other ten things existed. It names the count, so
        it reads as "there is more" rather than as decoration.
      */}
      <a
        href="#case-doors"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("case-doors")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="flex min-h-12 items-center justify-between gap-3 border-t border-rule bg-sunk px-5 py-3 text-[0.9375rem] font-medium transition-colors hover:bg-ink/5"
      >
        <span>{t("case.thenN").replace("{n}", String(doorCount))}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </a>
    </section>
  );
}
