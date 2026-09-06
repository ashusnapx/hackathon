"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/components/SiteHeader";
import { VoiceComposer } from "@/components/start/VoiceComposer";
import { GuidedIntake } from "@/components/intake/GuidedIntake";
import { DETAIL_QUESTIONS } from "@/lib/intake/details";
import { emptyIntake } from "@/lib/intake/interview";
import { draftFromStory } from "@/lib/intake/infer";
import { loadBrowserIntakeDraft, saveBrowserIntakeDraft } from "@/lib/intake/persistence";
import { clearStoredVaaniSession } from "@/lib/integrations/vaani-client";
import { useI18n } from "@/lib/i18n/context";
import type { IntakeAnalysis } from "@/lib/intake/interview";

/**
 * The front door: one thing to do.
 *
 * This screen is read by somebody who has just lost money, on a phone, possibly
 * in their sixties, possibly unable to read the language the internet is
 * written in. It carried ninety-seven words, a thirty-word example inside the
 * box, ten blocks of text and eight controls — and it led with a keyboard,
 * which is the hardest thing you can ask of exactly that person.
 *
 * So it leads with the microphone instead. Speaking is the one input everybody
 * has: it needs no spelling, no script, no keyboard layout for Bhojpuri, and it
 * is how two in five people in India already search. Typing is one tap away for
 * those who prefer it, and everything else on the old screen — what we never
 * ask, the other ways in — is behind a disclosure or in the header, where it
 * can be found and cannot be in the way.
 *
 * The emergency numbers stay in the open. They are the only thing here that
 * matters more than the box.
 */
export function StartFlow() {
  const { t, lang } = useI18n();
  const [story, setStory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Once the story is understood the interview carries on here, on this page,
   * in the same column and under the same header. It used to navigate to a
   * different route with a different layout — a wide two-column workbench —
   * which read as being handed to a second product halfway through a sentence.
   */
  const [started, setStarted] = useState(false);

  /**
   * Somebody coming back to a half-finished report picks up at the question,
   * not at the box they already spoke into. Deferred rather than read during
   * render, because the server has no localStorage and the two would disagree.
   */
  useEffect(() => {
    const restored = loadBrowserIntakeDraft().draft;
    if (restored?.analysis) queueMicrotask(() => setStarted(true));
  }, []);

  const send = async () => {
    if (story.trim().length < 25 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: story.trim(), lang: lang.code }),
      });
      if (!response.ok) throw new Error("triage-failed");
      const payload = await response.json() as IntakeAnalysis & { callerName?: string; bankName?: string };
      const { callerName, bankName, ...analysis } = payload;
      // Nothing of the last report comes with them: not the narrative, not the
      // extracted facts, and not the receipt for a previous voice call.
      saveBrowserIntakeDraft({
        ...emptyIntake("web"),
        ...draftFromStory(story, analysis, new Date(), { callerName, bankName }),
      });
      clearStoredVaaniSession();
      setStarted(true);
    } catch {
      setError(t("start.error"));
      setBusy(false);
    }
  };

  const prompts = ["name", "bankName", "amount", "incidentAt", "utr", "suspectPhone"]
    .map((id) => DETAIL_QUESTIONS.find((question) => question.id === id))
    .filter((question) => question !== undefined)
    .map((question) => t(question.label));

  if (started) {
    return (
      <>
        <SiteHeader width="2xl" />
        <main id="main" className="px-5 sm:px-8 py-6 sm:py-10 flex items-start justify-center">
          <div className="w-full max-w-xl">
            <GuidedIntake lockChannel="web" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader width="2xl" />
      <main id="main" className="px-5 sm:px-8 py-6 sm:py-12 flex items-start justify-center">
        <div className="w-full max-w-xl">
          <h1 className="text-[1.75rem] sm:text-3xl leading-tight">{t("begin.storyH")}</h1>
          <p className="mt-2 text-[1.0625rem] leading-[1.5] text-ink-2">{t("begin.storyShort")}</p>

          <div className="mt-6">
            <VoiceComposer
              value={story}
              onChange={(next) => { setStory(next); setError(null); }}
              onSubmit={send}
              submitLabel={t("begin.storyCta")}
              busy={busy}
              prompts={prompts}
            />
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-urgent-ink">{error}</p>}

          {/* The only thing on this page that matters more than the box, and so
              the only other thing that is never folded away. */}
          <div className="mt-7 grid grid-cols-2 gap-2">
            <Button href="tel:1930" external variant="urgent" size="md">{t("begin.call1930short")}</Button>
            <Button href="tel:112" external variant="secondary" size="md">{t("begin.call112short")}</Button>
          </div>

          <details className="mt-6 group">
            <summary className="inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 cursor-pointer hover:text-ink">
              {t("begin.safeSummary")}
            </summary>
            <p className="mt-2 text-sm leading-[1.6] text-ink-2">{t("begin.boundaryNote")}</p>
            {/* A thumb needs 44px, and these are the fallbacks for somebody who
                could not use either of the two inputs above. */}
            <div className="mt-2 flex flex-col items-start">
              <a href="/talk" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{t("begin.voiceLink")} →</a>
              <a href="/whatsapp" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{t("begin.waLink")} →</a>
              <a href="/report" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{t("begin.formLink")} →</a>
            </div>
          </details>
        </div>
      </main>
    </>
  );
}
