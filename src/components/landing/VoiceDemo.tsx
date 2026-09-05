"use client";

import { useMemo, useState } from "react";
import call from "@/lib/demo/call.json";
import { isPlaceholderValue } from "@/lib/intake/from-vaani";
import { DEMO_CASE_PATH } from "@/lib/demo/case";
import { Headline } from "@/components/ui/Split";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * One real call, shown whole.
 *
 * Every competing claim about voice AI is a demo video. This is the recording,
 * the transcript and the fields the model filled, taken straight from the
 * provider and committed to the repo — so it loads on a cold cache with no key,
 * and so anyone can check the extraction against what was actually said.
 *
 * The audio is 700 KB and never loads until someone presses play.
 */

/** Fields that are plumbing rather than facts about the caller's case. */
const HIDDEN = new Set([
  "call_outcome", "language", "safe_to_speak", "transcript_consent", "recording_consent",
  "summary_confirmed", "human_requested", "restricted_data_detected", "safeguarding_required",
  "immediate_danger", "child_context", "chronology_draft", "unknown_or_conflicting",
  "caller_corrections", "emergency_112_advised",
]);

const LABELS: Record<string, string> = {
  caller_name: "What to call them",
  amount_inr: "Amount lost",
  payment_method: "Paid through",
  bank_name: "Bank",
  transaction_reference: "Reference",
  transaction_authorisation: "How it was authorised",
  suspect_upi: "Suspect UPI ID",
  suspect_email: "Suspect email",
  suspect_phone: "Suspect number",
  compromised_account: "Where they were contacted",
  evidence_available: "Evidence held",
  prior_reporting_status: "Already reported",
  incident_timing: "When",
  possible_category: "Possible category",
  money_moved: "Money moved",
  helpline_1930_advised: "Told to call 1930",
  desired_help: "What they want",
  state: "State",
  district: "District",
};

export function VoiceDemo() {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const facts = useMemo(
    () => Object.entries(call.extracted as Record<string, unknown>)
      .filter(([key]) => !HIDDEN.has(key))
      // A field the agent could not fill is not a fact it captured. Showing
      // "Suspect email: unknown" would pad this list with its own failures.
      .filter(([, value]) => typeof value !== "string" || !isPlaceholderValue(value))
      .map(([key, value]) => [LABELS[key] ?? key.replace(/_/g, " "), format(key, value)] as const),
    [],
  );

  const turns = expanded ? call.turns : call.turns.slice(0, 8);

  return (
    <section id="voice-demo" className="bg-raised border-y border-rule">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[23rem_minmax(0,1fr)] gap-x-16 gap-y-12">

          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="label">{t("vdemo.kicker")}</p>
            <h2 className="mt-3">
              <Headline>{t("vdemo.h2")}</Headline>
            </h2>
            <p className="mt-7 text-[1.0625rem] leading-[1.55] text-ink-2" data-reveal>
              {t("vdemo.body")}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
              <Stat value={`${(call.latencyMsP50.endToEnd / 1000).toFixed(1)}s`} label={t("vdemo.statReply")} />
              <Stat value={String(facts.length)} label={t("vdemo.statFields")} />
              <Stat value="23" label={t("vdemo.statLangs")} />
              <Stat value="0" label={t("vdemo.statTyping")} />
            </dl>

            <ul className="mt-8 space-y-3 text-sm leading-[1.55] text-ink-2">
              {["vdemo.why1", "vdemo.why2", "vdemo.why3", "vdemo.why4"].map((key) => (
                <li key={key} className="flex gap-2.5">
                  <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-done" aria-hidden />
                  <span>{t(key as Parameters<typeof t>[0])}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6 self-start">
            <div className="rounded-card border border-rule-strong bg-paper px-4 py-4 sm:px-5">
              <p className="text-sm font-semibold">{t("vdemo.listen")}</p>
              {/* preload=none: nothing is fetched until somebody actually presses play. */}
              <audio controls preload="none" src={call.audio} className="mt-3 w-full" />
              <p className="mt-2 text-xs leading-[1.55] text-ink-3">{t("vdemo.disclaimer")}</p>
            </div>

            <div className="rounded-card border border-rule-strong bg-paper px-4 py-4 sm:px-5">
              <p className="text-sm font-semibold">{t("vdemo.transcript")}</p>
              <ol className="mt-3 space-y-2.5">
                {turns.map((turn, index) => (
                  <li key={index} className="text-[0.9375rem] leading-[1.5]">
                    <span className={cn("font-semibold", turn.agent ? "text-info" : "text-ink")}>
                      {turn.agent ? t("vdemo.agent") : t("vdemo.caller")}:{" "}
                    </span>
                    <span className={turn.agent ? "text-ink-3" : "text-ink-2"}>{turn.text}</span>
                  </li>
                ))}
              </ol>
              {!expanded && call.turns.length > 8 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="mt-4 text-sm font-semibold underline underline-offset-4"
                >
                  {t("vdemo.more")} ({call.turns.length - 8})
                </button>
              )}
            </div>

            <div className="rounded-card border border-done/35 bg-done/[0.06] px-4 py-4 sm:px-5">
              <p className="text-sm font-semibold">{t("vdemo.extracted")}</p>
              <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("vdemo.extractedSub")}</p>
              <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {facts.map(([label, value]) => (
                  <div key={label} className="border-b border-rule pb-2">
                    <dt className="text-xs text-ink-3">{label}</dt>
                    <dd className="mt-0.5 text-[0.9375rem] font-medium text-ink break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* The call is only half the claim. This is the other half: the
                case file it produced, which anyone can open and read. */}
            <a
              href={DEMO_CASE_PATH}
              className="group flex items-center gap-4 rounded-card border border-ink/15 bg-paper px-5 py-5 no-underline transition-colors hover:border-ink"
            >
              <span className="min-w-0">
                <span className="block text-[1.0625rem] font-semibold leading-snug">
                  {t("vdemo.openCase")}
                </span>
                <span className="mt-1 block text-sm leading-[1.55] text-ink-2">
                  {t("vdemo.openCaseSub")}
                </span>
              </span>
              <span
                className="ms-auto text-2xl leading-none text-ink-3 transition-transform group-hover:translate-x-1"
                aria-hidden
              >
                →
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="num text-3xl leading-none font-semibold">{value}</dd>
      <p className="mt-1.5 text-xs leading-tight text-ink-3">{label}</p>
    </div>
  );
}

function format(key: string, value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (typeof value === "number") {
    return key.endsWith("_inr") ? `₹${value.toLocaleString("en-IN")}` : value.toLocaleString("en-IN");
  }
  return String(value);
}
