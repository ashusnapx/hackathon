"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { SaveBadge } from "@/components/report/SaveBadge";
import { StageIncident, StageEvidence, StageSuspect, StageYou } from "@/components/report/Stages";
import { StageReview } from "@/components/report/StageReview";
import { STAGES, type Stage } from "@/lib/report/schema";
import {
  mockAcknowledgement,
  queueSubmission,
  useDraft,
  useOnline,
  type ReportDraft,
} from "@/lib/report/draft";
import { newCase, saveCase } from "@/lib/case/store";
import { EMPTY_ENTITIES } from "@/lib/case/types";
import { useI18n } from "@/lib/i18n/context";
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
  const [done, setDone] = useState<{ ack: string; queued: boolean } | null>(null);
  const [resumed, setResumed] = useState(false);

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
    try {
      const ack = mockAcknowledgement();
      const submitted: ReportDraft = { ...draft, submittedAt: new Date().toISOString(), acknowledgement: ack };

      // Offline is not a failure state. The complaint goes to a durable outbox
      // and leaves when there is a signal.
      if (!online) {
        queueSubmission(submitted);
        setDone({ ack, queued: true });
        return;
      }

      // The case file is what carries the citizen through the ninety days after
      // this screen, so filing opens one rather than ending the journey.
      const c = newCase({
        language: lang.code,
        rawStatement: draft.narrative,
        entities: { ...EMPTY_ENTITIES },
        amount: draft.amount,
        incidentAt: draft.incidentAt,
        victim: {
          name: draft.name,
          phone: draft.mobile,
          email: draft.email,
          state: draft.state,
          district: draft.district,
          address: draft.address,
        },
        suspect: {
          phones: draft.suspectIds.filter((s) => s.kind === "phone").map((s) => s.value),
          upiIds: draft.suspectIds.filter((s) => s.kind === "upi").map((s) => s.value),
          accounts: draft.suspectIds.filter((s) => s.kind === "account").map((s) => s.value),
          urls: draft.suspectIds.filter((s) => s.kind === "url").map((s) => s.value),
          handles: draft.suspectIds.filter((s) => s.kind === "handle").map((s) => s.value),
        },
        files: draft.files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        tracks: [{ id: "ncrp", doneAt: new Date().toISOString() }],
      });
      c.events.push({ at: new Date().toISOString(), kind: "track", label: `Complaint filed · ${ack}` });
      saveCase(c);

      setDone({ ack, queued: false });
      reset();
      setTimeout(() => router.push(`/case/${c.id}`), 2600);
    } finally {
      setSubmitting(false);
    }
  }, [draft, online, lang.code, reset, router]);

  if (hydrating) {
    return <main className="mx-auto max-w-2xl px-5 py-24" aria-busy />;
  }

  if (done) {
    return (
      <>
        <Header />
        <main id="main" className="mx-auto max-w-2xl px-5 sm:px-8 py-16 sm:py-24">
          <p className="label">{done.queued ? t("rep.done.queuedLabel") : t("rep.done.label")}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">
            {done.queued ? t("rep.done.queuedH") : t("rep.done.h")}
          </h1>
          <p className="mt-6 num text-2xl">{done.ack}</p>
          <p className="mt-4 text-[1.0625rem] leading-[1.65] text-ink-2 max-w-prose">
            {done.queued ? t("rep.done.queuedBody") : t("rep.done.body")}
          </p>
          <p className="mt-6 sheet px-4 py-3 text-sm leading-[1.6] text-ink-2">{t("rep.done.notFir")}</p>
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
            {t("rep.offlineBanner")}
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
        {draft.stage === "evidence" && <StageEvidence draft={draft} patch={patch} lang={lang.code} />}
        {draft.stage === "suspect" && <StageSuspect draft={draft} patch={patch} lang={lang.code} />}
        {draft.stage === "you" && <StageYou draft={draft} patch={patch} lang={lang.code} />}
        {draft.stage === "review" && (
          <StageReview draft={draft} goTo={goTo} onSubmit={submit} submitting={submitting} online={online} />
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
