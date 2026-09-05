"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { VoiceInput } from "@/components/start/VoiceInput";
import { useT } from "@/lib/i18n/context";
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
  value, onChange, onSubmit, submitLabel, busy, disabled, minLength = 25,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
  disabled?: boolean;
  /** Below this, the story is too thin to route and the button waits. */
  minLength?: number;
}) {
  const t = useT();
  const [interim, setInterim] = useState("");
  const [mode, setMode] = useState<string>("idle");
  const listening = mode === "listening";
  const ready = value.trim().length >= minLength && !busy && !disabled;

  const append = (chunk: string) => {
    setInterim("");
    onChange([value.trim(), chunk.trim()].filter(Boolean).join(" "));
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
          <textarea
            id="story"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={5}
            disabled={busy}
            placeholder={t("compose.placeholder")}
            /* 16px minimum, or iOS Safari zooms the page when it is focused. */
            className={cn(
              "mt-1.5 w-full min-h-[7.5rem] rounded-ctl border bg-raised px-3 py-2.5",
              "text-base leading-[1.6] resize-y focus:outline-none focus:border-ink",
              "placeholder:text-ink-3/70 disabled:opacity-60",
              listening ? "border-urgent/50" : "border-rule-strong",
            )}
          />
          {/* The engine's guess so far, kept visibly separate from what has
              been committed, so nobody watches their own words rewrite
              themselves and assumes the app lost them. */}
          <p aria-live="polite" className="mt-1.5 min-h-[1.25rem] text-sm italic leading-snug text-ink-3">
            {interim}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 border-t border-rule pt-3">
        <p className="flex-1 min-w-0 text-xs leading-[1.4] text-ink-3">{t("compose.hint")}</p>
        <Button onClick={onSubmit} disabled={!ready} size="md">
          {busy ? `${t("start.analysing")}…` : submitLabel}
        </Button>
      </div>
    </div>
  );
}
