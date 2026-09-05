"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { VoiceInput } from "@/components/start/VoiceInput";
import { emptyIntake } from "@/lib/intake/interview";
import { draftFromStory } from "@/lib/intake/infer";
import { saveBrowserIntakeDraft } from "@/lib/intake/persistence";
import { clearStoredVaaniSession } from "@/lib/integrations/vaani-client";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { IntakeAnalysis } from "@/lib/intake/interview";

/**
 * The front door: one box.
 *
 * It used to be two safety questions and a choice of channel — four taps before
 * anybody could say a word about what had happened to them, and every one of
 * them a question the story itself answers. Somebody who has just lost their
 * savings does not want a form about forms; they want to tell someone.
 *
 * So they tell us, and the model reads it: the category, the amount, the time,
 * whether money moved, whether this is the kind of fraud that arrives with a
 * threat. What it cannot settle, the interview asks for afterwards in the
 * ordinary way. The 112 and 1930 numbers are on this screen throughout rather
 * than behind a question, which puts them in front of more people than asking
 * ever did.
 */
export function StartFlow() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [story, setStory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = story.trim().length >= 25 && !busy;

  const send = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: story.trim(), lang: lang.code }),
      });
      if (!response.ok) throw new Error("triage-failed");
      const analysis = await response.json() as IntakeAnalysis;

      // Nothing of the last report comes with them: not the narrative, not the
      // extracted facts, and not the receipt for a previous voice call — which
      // would otherwise offer a stranger's transcript to import.
      saveBrowserIntakeDraft({ ...emptyIntake("web"), ...draftFromStory(story, analysis) });
      clearStoredVaaniSession();
      router.push("/assist");
    } catch {
      setError(t("start.error"));
      setBusy(false);
    }
  };

  return (
    <main id="main" className="min-h-dvh px-4 py-8 sm:py-14 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl sm:text-3xl leading-tight">{t("begin.storyH")}</h1>
        <p className="mt-3 text-[1.0625rem] leading-[1.6] text-ink-2">{t("begin.storySub")}</p>

        <div className="mt-6 sheet px-3 py-3 sm:px-4 sm:py-4">
          <textarea
            value={story}
            onChange={(event) => { setStory(event.target.value); setError(null); }}
            rows={6}
            disabled={busy}
            placeholder={t("start.placeholder")}
            aria-label={t("begin.storyH")}
            /* 16px minimum, or iOS Safari zooms the page the moment it is focused. */
            className="w-full bg-transparent resize-y text-base leading-[1.6] focus:outline-none placeholder:text-ink-3/70 disabled:opacity-60"
          />
          <div className="mt-2 flex items-center gap-3 border-t border-rule pt-3">
            <VoiceInput
              variant="compact"
              disabled={busy}
              onResult={(chunk) => setStory((was) => [was.trim(), chunk].filter(Boolean).join(" "))}
            />
            <p className="flex-1 min-w-0 text-xs leading-[1.4] text-ink-3">{t("begin.storyHint")}</p>
            <Button onClick={send} disabled={!ready} size="md">
              {busy ? `${t("start.analysing")}…` : t("begin.storyCta")}
            </Button>
          </div>
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-urgent-ink">{error}</p>}

        {/* Not behind a question. Somebody in danger should reach these without
            first telling a web page that they are in danger. */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button href="tel:1930" external variant="urgent" size="sm">{t("begin.call1930")}</Button>
          <Button href="tel:112" external variant="secondary" size="sm">{t("begin.call112")}</Button>
        </div>

        <p className="mt-5 text-xs leading-[1.55] text-ink-3">{t("begin.boundaryNote")}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <a href="/assist?channel=voice" className={cn("inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4")}>
            <Image src="/vaani/vaani-mark.png" alt="" width={72} height={72} className="w-4 h-4" />
            {t("begin.voiceLink")} →
          </a>
          <a href="/report" className="text-sm font-medium underline underline-offset-4">
            {t("begin.formLink")} →
          </a>
        </div>
      </div>
    </main>
  );
}
