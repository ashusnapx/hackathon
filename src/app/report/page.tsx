"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { SaveBadge } from "@/components/report/SaveBadge";
import { StageIncident, StageEvidence, StageSuspect, StageYou } from "@/components/report/Stages";
import { StageReview } from "@/components/report/StageReview";
import { STAGES, type Stage } from "@/lib/report/schema";
import { useDraft, useOnline } from "@/lib/report/draft";
import { reportDraftToCase } from "@/lib/report/handoff";
import { newCase, saveCase } from "@/lib/case/store";
import { useI18n } from "@/lib/i18n/context";
import { hasCompletedSafetyGate, type ChildContext } from "@/lib/intake/interview";
import { loadBrowserIntakeDraft } from "@/lib/intake/persistence";
import { cn } from "@/lib/utils";

/**
 * The complaint form, rebuilt.
 *
 * The original is four tabs and about forty fields behind a mobile OTP that
 * expires in thirty minutes, with no autosave and a Reset button on the review
 * screen. Three decisions here follow from that, and everything else is detail:
 * you can start without identifying yourself, nothing you type is ever held
 * only in memory, and no single missing field can stop the complaint.
 */
export default function ReportPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const online = useOnline();
  const { draft, patch, flush, reset, saveState, savedAt, hydrating } = useDraft();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ caseRef: string } | null>(null);
  const [resumed, setResumed] = useState(false);
  const [safetyGate, setSafetyGate] = useState<{
    status: "checking" | "allowed" | "blocked";
    childContext?: ChildContext;
  }>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;
    const verify = () => {
      const restored = loadBrowserIntakeDraft();
      const allowed = Boolean(restored.draft && hasCompletedSafetyGate(restored.draft));
      const next = allowed
        ? { status: "allowed" as const, childContext: restored.draft?.childContext }
        : { status: "blocked" as const };
      if (cancelled) return;
      setSafetyGate(next);
      if (!allowed) router.replace("/assist");
    };
    queueMicrotask(verify);
    const timer = setInterval(verify, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [router]);

  const index = STAGES.findIndex((s) => s.id === draft.stage);
  const stage = index < 0 ? 0 : index;

  const goTo = useCallback(
    (s: Stage) => {
      patch({ stage: s });
      flush();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [patch, flush],
  );

  // Answered-question count, not a percentage of screens. A progress bar that
  // says 80% while four things are still missing is a lie the citizen pays for.
  const answered = useMemo(() => {
    const checks = [
      draft.narrative.trim().length > 20,
      Boolean(draft.categoryId),
      Boolean(draft.incidentAt),
      draft.files.length > 0 || draft.pastedText.trim().length > 0,
      draft.suspectIds.length > 0,
      Boolean(draft.name?.trim()),
      Boolean(draft.mobile && draft.mobile.length === 10),
      Boolean(draft.state),
    ];
    return { got: checks.filter(Boolean).length, total: checks.length };
  }, [draft]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const caseData = reportDraftToCase(
        draft,
        lang.code,
        new Date(),
        { ageContext: safetyGate.childContext },
      );
      // Review normally prevents this path. Keep the guard here as well so a
      // stale click or a malformed restored draft cannot create an unroutable
      // case while pretending it has been classified.
      if (!caseData) return;

      // This prototype cannot file with NCRP. It creates only a local case draft
      // that carries the citizen's facts into the official-channel checklist.
      const c = newCase(caseData);
      c.events.push({
        at: new Date().toISOString(),
        kind: "edit",
        label: `Local case draft saved · ${c.ref} · not filed with NCRP`,
      });
      if (!saveCase(c)) {
        setSubmitError(t("rep.save.error"));
        return;
      }

      setDone({ caseRef: c.ref });
      reset();
      setTimeout(() => router.push(`/case/${c.id}`), 2600);
    } finally {
      setSubmitting(false);
    }
  }, [draft, lang.code, reset, router, safetyGate.childContext, t]);

  if (hydrating || safetyGate.status === "checking") {
    return <main className="mx-auto max-w-2xl px-5 py-24" aria-busy />;
  }

  if (safetyGate.status === "blocked") {
    return (
      <>
        <Header />
        <main id="main" className="mx-auto max-w-2xl px-5 sm:px-8 py-16">
          <p className="label">Safety check required</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">Start with the short safety questions.</h1>
          <p className="mt-4 max-w-prose text-ink-2 leading-relaxed">
            Kavach checks immediate danger and child-safety needs before opening any screen that accepts an incident narrative.
          </p>
          <Button href="/assist" size="lg" className="mt-7">Continue safely</Button>
        </main>
      </>
    );
  }

  if (done) {
    return (
      <>
        <Header />
        <main id="main" className="mx-auto max-w-2xl px-5 sm:px-8 py-16 sm:py-24">
          <p className="label">{t("build.saved")}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">{t("case.ref")}</h1>
          <p className="mt-6 num text-2xl">{done.caseRef}</p>
          <p className="mt-4 text-[1.0625rem] leading-[1.65] text-ink-2 max-w-prose">
            {t("case.mock")}
          </p>
          <p className="mt-6 sheet px-4 py-3 text-sm leading-[1.6] text-ink-2">{t("honesty.m1")}</p>
        </main>
      </>
    );
  }

  const showResume = !resumed && savedAt && draft.narrative.trim().length > 0 && stage > 0;

  return (
    <>
      <Header />

      <main id="main" className="mx-auto max-w-2xl px-5 sm:px-8 py-8 sm:py-12">
        {!online && (
          <p role="status" className="mb-6 sheet px-4 py-3 text-sm leading-[1.6] bg-wait-soft border-wait/30">
            {t("rep.save.offline")}
          </p>
        )}
        {submitError && (
          <p role="alert" className="mb-6 rounded-ctl border border-urgent/35 bg-urgent-soft px-4 py-3 text-sm leading-[1.55] text-urgent-ink">
            {submitError}
          </p>
        )}

        {showResume && (
          <div className="mb-6 sheet px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <p className="flex-1 min-w-[12rem] text-[0.9375rem] leading-snug">{t("rep.resume")}</p>
            <Button onClick={() => setResumed(true)} size="sm" variant="secondary">{t("rep.resumeCta")}</Button>
            <button
              onClick={() => { reset(); setResumed(true); }}
              className="text-sm text-ink-3 hover:text-ink underline underline-offset-4"
            >
              {t("rep.startOver")}
            </button>
          </div>
        )}

        {/* Progress, the honest kind: how many questions are answered, and the
            explicit promise that a gap is not a blocker. */}
        <div className="mb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <p className="label">
              {t("rep.step")} {stage + 1} / {STAGES.length} · {t(STAGES[stage].labelKey)}
            </p>
            <SaveBadge state={saveState} savedAt={savedAt} online={online} />
          </div>

          <ol className="mt-3 flex gap-1.5" aria-label={t("rep.progress")}>
            {STAGES.map((s, i) => (
              <li key={s.id} className="flex-1">
                <button
                  onClick={() => goTo(s.id)}
                  aria-current={i === stage ? "step" : undefined}
                  className={cn(
                    "w-full h-1.5 rounded-full transition-colors",
                    i < stage ? "bg-done" : i === stage ? "bg-ink" : "bg-rule",
                  )}
                >
                  <span className="sr-only">{t(s.labelKey)}</span>
                </button>
              </li>
            ))}
          </ol>

          <p className="mt-2.5 num text-xs text-ink-3">
            {answered.got}/{answered.total} {t("rep.answered")}
          </p>
        </div>

        {draft.stage === "incident" && <StageIncident draft={draft} patch={patch} lang={lang.code} />}
        {draft.stage === "evidence" && (
          <StageEvidence
            draft={draft}
            patch={patch}
            lang={lang.code}
            childContext={safetyGate.childContext}
          />
        )}
        {draft.stage === "suspect" && <StageSuspect draft={draft} patch={patch} lang={lang.code} />}
        {draft.stage === "you" && <StageYou draft={draft} patch={patch} lang={lang.code} />}
        {draft.stage === "review" && (
          <StageReview draft={draft} goTo={goTo} onSubmit={submit} submitting={submitting} />
        )}

        {draft.stage !== "review" && (
          <div className="mt-10 pt-6 border-t border-rule flex flex-wrap items-center gap-3">
            {stage > 0 && (
              <Button onClick={() => goTo(STAGES[stage - 1].id)} size="md" variant="secondary">
                {t("rep.back")}
              </Button>
            )}
            <Button onClick={() => goTo(STAGES[stage + 1].id)} size="md">
              {t("rep.next")}
            </Button>
            <button
              onClick={() => goTo("review")}
              className="text-sm text-ink-3 hover:text-ink underline underline-offset-4 ms-auto"
            >
              {t("rep.skipToReview")}
            </button>
          </div>
        )}
      </main>
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3 sm:pt-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-card border border-ink/15 bg-paper/85 backdrop-blur-xl shadow-[0_6px_24px_-18px_rgba(26,26,26,0.55)] px-3 sm:px-4 h-[60px] sm:h-[64px] flex items-center gap-4">
        <Wordmark />
        <div className="ms-auto">
          <LanguageSwitcher compact />
        </div>
      </div>
    </header>
  );
}
