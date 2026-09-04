import type { CaseFile } from "@/lib/case/types";
import { cn } from "@/lib/utils";

const LABELS = {
  zero_liability: "Answers fit a conditional zero-liability route",
  limited_liability: "Answers fit a limited-liability route",
  bank_policy: "The bank's published policy may govern",
  post_report_loss_only: "Possible customer-negligence route; the bank must prove causation",
  not_applicable: "This circular may not cover an approved payment",
  undetermined: "More facts are needed before applying the circular",
} as const;

export function RbiProtectionCard({ caseFile }: { caseFile: CaseFile }) {
  const record = caseFile.legal?.rbi;
  if (!record) return null;
  const { assessment } = record;
  const positive = assessment.protection === "zero_liability" || assessment.protection === "limited_liability";

  return (
    <section className="sheet overflow-hidden">
      <div className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label">Answer-backed legal screen</p>
            <h2 className="mt-2 !font-sans !text-xl !font-semibold !tracking-normal !leading-snug">
              {LABELS[assessment.protection]}
            </h2>
          </div>
          <span className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-semibold",
            positive ? "border-info/25 bg-info-soft text-info" : "border-rule bg-sunk text-ink-3",
          )}>
            Not a bank decision
          </span>
        </div>
        <ul className="mt-4 space-y-2 text-sm leading-[1.55] text-ink-2">
          {assessment.reasons.slice(0, 3).map((reason) => (
            <li key={reason} className="flex gap-2"><span aria-hidden>•</span><span>{reason}</span></li>
          ))}
        </ul>
      </div>
      <div className="border-t border-rule bg-sunk px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
        <span>RBI/2017-18/15 · paragraphs {Array.from(new Set(assessment.provenance.flatMap((item) => item.sourceParagraphs))).join(", ")}</span>
        <a href={assessment.source.url} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4 text-ink">
          Official circular ↗
        </a>
      </div>
    </section>
  );
}
