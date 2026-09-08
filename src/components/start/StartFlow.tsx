"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/components/SiteHeader";
import { VoiceComposer } from "@/components/start/VoiceComposer";
import { SpokenSummary, type Understood } from "@/components/start/SpokenSummary";
import type { HeardEdits } from "@/components/start/HeardSoFar";
import { DETAIL_QUESTIONS } from "@/lib/intake/details";
import { emptyIntake } from "@/lib/intake/interview";
import { ruleTriage } from "@/lib/ai/fallback";
import { extractEntities } from "@/lib/ai/extract";
import { draftFromStory } from "@/lib/intake/infer";
import { INTAKE_STORAGE_KEY, loadBrowserIntakeDraft, saveBrowserIntakeDraft } from "@/lib/intake/persistence";
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
  const [understood, setUnderstood] = useState<Understood | null>(null);
  /*
   * Corrections made by tapping a row in the read-back, before the model has
   * even been asked. They are the person's own answer, so they outrank both the
   * reading and the model's, and they are seeded into the summary rather than
   * being asked for a second time.
   */
  const [heardEdits, setHeardEdits] = useState<HeardEdits>({});
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Resuming, and refusing to resume.
   *
   * Somebody who reloads mid-report picks up at the question they were on, not
   * at the box they already spoke into. But somebody who has just pressed "Say
   * it yourself" is telling us they want to start something — and they were
   * landing straight on question one of a report they had abandoned days
   * earlier, which is the app looking broken and confused. So the chooser asks
   * for a clean one by name, and this honours that before anything is restored.
   *
   * Deferred rather than read during render, because the server has no
   * localStorage and the two would disagree.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      try { localStorage.removeItem(INTAKE_STORAGE_KEY); } catch { /* private mode */ }
      clearStoredVaaniSession();
      // Take the flag out of the URL so a later refresh resumes rather than
      // wiping what they have answered since.
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    // An interview arriving from WhatsApp is still being claimed when this
    // runs, so there is nothing in storage to find yet. `WhatsAppHandoff` owns
    // the navigation until its token is spent.
    if (params.get("wa")) return;
    // A report already under way belongs at the questions, not back at the box.
    if (loadBrowserIntakeDraft().draft?.analysis) router.replace("/say/questions");
  }, [router]);

  /*
   * Read what they said, once, and show it back.
   *
   * The model first, because it is the only thing here that reads all
   * twenty-three languages — the rule-based extractors cover a handful of
   * scripts and will never cover the rest, however many currency words get
   * added. One call, at the moment somebody has finished talking: not per
   * keystroke and not per interim result, which is both what the quota allows
   * and what a person describing a fraud deserves.
   *
   * The rules are the fallback, and when they run the summary says so rather
   * than passing a keyword match off as a reading.
   */
  const read = async () => {
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
      const payload = await response.json() as Understood;
      setUnderstood(payload);
    } catch {
      // Unreachable, rate-limited or down. Read it with what we have and be
      // plain about which one they are looking at.
      const text = story.trim();
      setUnderstood({
        triage: ruleTriage(text),
        entities: extractEntities(text),
        source: "rules",
      });
    } finally {
      setBusy(false);
    }
  };

  /** They have read the summary and corrected whatever was wrong. */
  const confirm = (edits: Record<string, string>) => {
    if (!understood) return;
    const { callerName, bankName, ...rest } = understood;
    const analysis: IntakeAnalysis = {
      triage: {
        ...rest.triage,
        // A correction is the person's own answer and outranks the reading.
        amount: edits.amount ? Number(edits.amount.replace(/[^\d]/g, "")) || rest.triage.amount : rest.triage.amount,
        incidentAt: edits.incidentAt ? new Date(edits.incidentAt).toISOString() : rest.triage.incidentAt,
      },
      entities: rest.entities,
      source: rest.source,
    };
    // Nothing of the last report comes with them: not the narrative, not the
    // extracted facts, and not the receipt for a previous voice call.
    saveBrowserIntakeDraft({
      ...emptyIntake("web"),
      ...draftFromStory(story, analysis, new Date(), {
        callerName: edits.callerName || callerName,
        bankName: edits.bankName || bankName,
      }),
    });
    clearStoredVaaniSession();
    router.push("/say/questions");
  };

  const prompts = ["name", "bankName", "amount", "incidentAt", "utr", "suspectPhone"]
    .map((id) => DETAIL_QUESTIONS.find((question) => question.id === id))
    .filter((question) => question !== undefined)
    .map((question) => t(question.label));

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
              onChange={(next) => { setStory(next); setError(null); setUnderstood(null); }}
              onSubmit={read}
              submitLabel={t("begin.storyCta")}
              busy={busy}
              prompts={prompts}
              heardEdits={heardEdits}
              onHeardEdit={(id, value) =>
                setHeardEdits((prev) => {
                  const next = { ...prev };
                  if (value) next[id] = value;
                  else delete next[id];
                  return next;
                })
              }
            />
          </div>

          {/* Shown once, after they have finished, and editable — see the note
              at the top of SpokenSummary for why that is the only version of
              this that works in every one of the twenty-three languages. */}
          {(busy || understood) && (
            <SpokenSummary
              understood={busy ? null : understood}
              story={story}
              seed={heardEdits}
              onConfirm={confirm}
              onAddMore={() => setUnderstood(null)}
            />
          )}

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
