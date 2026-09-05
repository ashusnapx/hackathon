"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { freshStartDraft, type ChildContext, type SafetyAnswer } from "@/lib/intake/interview";
import { saveBrowserIntakeDraft } from "@/lib/intake/persistence";
import { clearStoredVaaniSession } from "@/lib/integrations/vaani-client";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type Step = "danger" | "emergency" | "child" | "childSafety" | "choose";

/**
 * The front door.
 *
 * Two safety questions, then a choice of how to talk. The questions are the same
 * ones the interview used to ask one chat turn at a time; asking them here means
 * someone in danger reaches 112 on the first screen rather than after a
 * conversation, and everyone else reaches the thing they came for in two taps.
 */
export function StartFlow() {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<Step>("danger");
  const [safety, setSafety] = useState<SafetyAnswer | undefined>();
  const [childContext, setChildContext] = useState<ChildContext | undefined>();

  const answerSafety = (answer: SafetyAnswer) => {
    setSafety(answer);
    setStep(answer === "safe" ? "child" : "emergency");
  };

  const answerChild = (answer: ChildContext) => {
    setChildContext(answer);
    setStep(answer === "adult-or-no-child" ? "choose" : "childSafety");
  };

  const begin = (channel: "voice" | "whatsapp") => {
    // Nothing of the last report comes with them: not the narrative, not the
    // extracted facts, and not the receipt for a previous voice call — which
    // would otherwise offer a stranger's transcript to import.
    saveBrowserIntakeDraft(freshStartDraft(channel, { safety, childContext }));
    clearStoredVaaniSession();
    router.push("/assist");
  };

  return (
    <main className="min-h-dvh px-4 py-8 sm:py-14 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-xl rounded-card border border-rule bg-surface px-5 py-6 sm:px-8 sm:py-8 shadow-[0_20px_60px_-30px_rgba(26,26,26,0.45)]">
        {step !== "choose" && (
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
            {t("begin.step")} {step === "danger" || step === "emergency" ? 1 : 2} {t("begin.of")} 2
          </p>
        )}

        {step === "danger" && (
          <Question
            title={t("begin.h1")}
            body={t("intake.safetyQ")}
            options={[
              { label: t("intake.safetySafe"), onClick: () => answerSafety("safe"), primary: true },
              { label: t("intake.safetyDanger"), onClick: () => answerSafety("danger") },
              { label: t("intake.preferNot"), onClick: () => answerSafety("prefer-not") },
            ]}
          />
        )}

        {step === "emergency" && (
          <Urgent
            title={t("intake.emergencyH")}
            body={t("intake.emergencyBody")}
            callLabel={t("intake.emergencyCall")}
            callHref="tel:112"
            continueLabel={t("intake.emergencyContinue")}
            onContinue={() => setStep("child")}
          />
        )}

        {step === "child" && (
          <Question
            title={t("intake.ageQ")}
            options={[
              { label: t("intake.ageAdult"), onClick: () => answerChild("adult-or-no-child"), primary: true },
              { label: t("intake.ageSelfMinor"), onClick: () => answerChild("self-minor") },
              { label: t("intake.ageChildOther"), onClick: () => answerChild("child-other") },
              { label: t("intake.preferNot"), onClick: () => answerChild("unknown") },
            ]}
          />
        )}

        {step === "childSafety" && (
          <Urgent
            title={t("intake.childH")}
            body={t("intake.childBody")}
            callLabel={t("intake.childCall")}
            callHref="tel:1098"
            continueLabel={t("intake.childContinue")}
            onContinue={() => setStep("choose")}
          />
        )}

        {step === "choose" && (
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold leading-tight">{t("begin.chooseH")}</h1>
            <p className="mt-2 text-sm leading-[1.55] text-ink-2">{t("begin.chooseSub")}</p>

            <div className="mt-5 grid gap-3">
              <ChannelCard
                title={t("begin.voiceH")}
                note={t("begin.voiceNote")}
                onClick={() => begin("voice")}
                icon={<Image src="/vaani/vaani-mark.png" alt="" width={72} height={72} className="w-7 h-7" />}
              />
              <ChannelCard
                title={t("begin.chatH")}
                note={t("begin.chatNote")}
                onClick={() => begin("whatsapp")}
                icon={
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="#25D366" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.4" />
                  </svg>
                }
              />
            </div>

            <p className="mt-5 text-xs leading-[1.55] text-ink-3">{t("begin.boundaryNote")}</p>
            <a href="/report" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
              {t("begin.formLink")} →
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

function Question({ title, body, options }: {
  title: string;
  body?: string;
  options: { label: string; onClick: () => void; primary?: boolean }[];
}) {
  return (
    <div>
      <h1 className="mt-2 text-xl sm:text-2xl font-semibold leading-tight">{title}</h1>
      {body && <p className="mt-2 text-[0.9375rem] leading-[1.55] text-ink-2">{body}</p>}
      <div className="mt-5 grid gap-2.5">
        {options.map((option) => (
          <button
            key={option.label}
            onClick={option.onClick}
            className={cn(
              "w-full min-h-14 rounded-ctl border px-4 py-3 text-start text-[0.9375rem] font-medium transition-colors",
              option.primary
                ? "border-ink bg-ink text-paper"
                : "border-rule-strong bg-raised hover:border-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A helpline first, and the way onward second. */
function Urgent({ title, body, callLabel, callHref, continueLabel, onContinue }: {
  title: string;
  body: string;
  callLabel: string;
  callHref: string;
  continueLabel: string;
  onContinue: () => void;
}) {
  return (
    <div>
      <h1 className="mt-2 text-xl font-semibold leading-tight text-urgent-ink">{title}</h1>
      <p className="mt-2 text-[0.9375rem] leading-[1.55] text-ink-2">{body}</p>
      <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
        <Button href={callHref} size="sm">{callLabel}</Button>
        <Button onClick={onContinue} size="sm" variant="secondary">{continueLabel}</Button>
      </div>
    </div>
  );
}

function ChannelCard({ title, note, icon, onClick }: {
  title: string;
  note: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-ctl border border-rule-strong bg-raised px-4 py-4 text-start flex items-start gap-3.5 transition-colors hover:border-ink"
    >
      <span className="shrink-0 mt-0.5 grid place-items-center w-11 h-11 rounded-full border border-rule bg-surface">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[1.0625rem] font-semibold leading-tight">{title}</span>
        <span className="block mt-1 text-sm leading-[1.5] text-ink-3">{note}</span>
      </span>
    </button>
  );
}
