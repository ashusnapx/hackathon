"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { VoiceInput } from "@/components/start/VoiceInput";
import { useT } from "@/lib/i18n/context";
import { appendPhrase } from "@/lib/intake/recognition";
import { cn } from "@/lib/utils";

/**
 * Say it in as many goes as you need, and watch it land.
 *
 * Nobody describes the worst hour of their week in one clean sentence. They
 * start, stop, remember the bank's name, start again. The first version of this
 * screen swapped the microphone out for a text box the moment the first phrase
 * arrived, which meant the second thought had nowhere to go — so the microphone
 * now stays exactly where it is and the words pile up beside it.
 *
 * The panel is a real text field, not a read-out. That is deliberate: it makes
 * typing and speaking the same act rather than two modes to choose between, and
 * it lets somebody correct a name the transcriber heard wrong without starting
 * over. Live words appear in grey underneath while they are still being said,
 * where the engine can produce them — on a phone the recorder path has nothing
 * to show until a take finishes, so it says it is listening instead of
 * pretending to stream.
 */
export function VoiceComposer({
  value, onChange, onSubmit, submitLabel, busy, disabled, minLength = 25, prompts,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
  disabled?: boolean;
  /** Below this, the story is too thin to route and the button waits. */
  minLength?: number;
  /**
   * What is worth mentioning, shown before anybody speaks.
   *
   * Every one of these is a question the interview would otherwise put
   * afterwards, one at a time. Somebody who can see the list can answer six of
   * them in a single breath — and each one they cover is one the conversation
   * then knows not to ask.
   */
  prompts?: string[];
}) {
  const t = useT();
  const [interim, setInterim] = useState("");
  const [mode, setMode] = useState<string>("idle");
  const listening = mode === "listening";
  const flowRef = useRef<HTMLDivElement>(null);

  // Follow the words down as they arrive, the way a chat follows a message.
  useEffect(() => {
    const el = flowRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [value, interim]);
  const ready = value.trim().length >= minLength && !busy && !disabled;

  const append = (chunk: string) => {
    setInterim("");
    onChange(appendPhrase(value, chunk));
  };

  return (
    <div className="sheet p-3 sm:p-4">
      <div className="grid gap-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-start">
        <div className="flex flex-col items-center gap-1 sm:pt-2">
          <VoiceInput
            variant="hero"
            disabled={busy || disabled}
            onResult={append}
            onInterim={setInterim}
            onModeChange={(next) => setMode(next)}
          />
        </div>

        <div className="min-w-0">
          <label
            className="flex items-center gap-2 text-xs text-ink-3"
            htmlFor="story"
          >
            {t("compose.heading")}
            {listening && (
              <span className="inline-flex items-center gap-1.5 text-urgent">
                <span className="w-1.5 h-1.5 rounded-full bg-urgent animate-pulse" aria-hidden />
                {t("compose.listening")}
              </span>
            )}
          </label>
          {/*
            One field, one height, one flow.
            
            It used to be a growing textarea with the live words in a second
            block underneath: the box got taller with every sentence and pushed
            the whole page down while somebody was mid-thought, and the two
            blocks read as two different things happening at once.
            
            The height is now fixed and the text scrolls inside it, so nothing
            below ever moves. While the microphone is open the box shows one
            continuous paragraph — what has been committed, then the words still
            being revised in grey — because that is what a person is actually
            saying: one sentence, some of which we are sure of. The moment they
            stop it becomes an ordinary editable field again, on the same spot,
            at the same size.
          */}
          <div
            className={cn(
              "mt-1.5 h-44 rounded-ctl border bg-raised transition-colors",
              listening ? "border-urgent/60" : "border-rule-strong focus-within:border-ink",
            )}
          >
            {listening ? (
              <div
                ref={flowRef}
                aria-live="polite"
                className="h-full overflow-y-auto no-scrollbar px-3 py-2.5 text-base leading-[1.6]"
              >
                {value || interim ? (
                  <p className="whitespace-pre-wrap">
                    {value}
                    {value && interim ? " " : ""}
                    <span className="text-ink-3">{interim}</span>
                  </p>
                ) : (
                  <p className="text-ink-3/70">{t("compose.listeningEmpty")}</p>
                )}
              </div>
            ) : (
              <textarea
                id="story"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={busy}
                placeholder={t("compose.placeholder")}
                /* 16px minimum, or iOS Safari zooms the page when it is focused.
                   resize-none: dragging this taller moved everything under it,
                   which is the problem this whole block exists to stop. */
                className={cn(
                  "block h-full w-full resize-none bg-transparent px-3 py-2.5",
                  "text-base leading-[1.6] focus:outline-none no-scrollbar",
                  "placeholder:text-ink-3/70 disabled:opacity-60",
                )}
              />
            )}
          </div>
        </div>
      </div>

      {prompts && prompts.length > 0 && (
        <div className="mt-3 border-t border-rule pt-3">
          <p className="text-xs text-ink-3">{t("compose.promptsH")}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {prompts.map((prompt) => (
              <li
                key={prompt}
                className="rounded-full border border-rule bg-sunk px-2.5 py-1 text-xs text-ink-2"
              >
                {prompt}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 border-t border-rule pt-3">
        <p className="flex-1 min-w-0 text-xs leading-[1.4] text-ink-3">{t("compose.hint")}</p>
        <Button onClick={onSubmit} disabled={!ready} size="md">
          {busy ? `${t("start.analysing")}…` : submitLabel}
        </Button>
      </div>
    </div>
  );
}
