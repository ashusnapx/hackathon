"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * Reads the case out loud.
 *
 * Every other accessibility control in this product helps somebody who can read
 * but is struggling to — bigger text, higher contrast, plainer words. None of
 * them help somebody who cannot read at all, and India's literacy rate means
 * that is a large share of the people most exposed to this kind of fraud. A
 * screen reader is not the answer either: it is a setting three levels into a
 * phone's menus, it reads the whole interface rather than the thing you want,
 * and somebody who needed it would already have it on.
 *
 * So this is one button that says the important part out loud, in the language
 * the page is already in, using the speech engine the phone ships with. No
 * network call, no cost, no account.
 *
 * What it will not do:
 *
 *  · It never starts on its own. A page that begins talking about a fraud in a
 *    shared room can put somebody in danger, and this product is used by people
 *    hiding what happened from the person who did it.
 *  · It reads a written summary passed to it, not the DOM. Reading the screen
 *    would produce "Right now, comma, one, comma, call one nine three zero" —
 *    the shape of the layout rather than the meaning of it.
 *  · It says nothing if the phone has no voice for the language. A page that
 *    silently reads Hindi text in an American accent is worse than a button
 *    that admits it cannot help, because the person cannot tell which of the
 *    two happened.
 */

export function ReadAloud({ text, className }: { text: string; className?: string }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState<"idle" | "speaking">("idle");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Read rather than stored in state: this never changes for the life of the
  // page, and setting it from an effect would render the button once and then
  // take it away again on a phone that has no voice engine.
  const supported = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );

  useEffect(() => {
    // Leaving the page mid-sentence should stop the voice, not carry it into
    // whatever the person opened next.
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // Nothing was speaking.
      }
    };
  }, []);

  if (!supported) return null;

  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (state === "speaking") {
      synth.cancel();
      setState("idle");
      return;
    }

    // Anything already queued belongs to a previous tap.
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // The voices list is populated asynchronously in most browsers, so an empty
    // list here means "not loaded yet" rather than "no voices" — in that case
    // the engine's own default is a better bet than refusing to speak.
    const voices = synth.getVoices();
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(lang.code.toLowerCase()));
    if (match) utterance.voice = match;
    utterance.lang = match?.lang ?? lang.code;
    // Slower than default. This is being listened to by somebody who is
    // distressed, and often once only.
    utterance.rate = 0.92;
    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");

    utterRef.current = utterance;
    synth.speak(utterance);
    setState("speaking");
  };

  return (
    <button
      onClick={speak}
      aria-pressed={state === "speaking"}
      className={cn(
        "press inline-flex items-center gap-2.5 rounded-ctl border border-rule-strong bg-raised",
        "px-4 py-2.5 min-h-11 text-[0.9375rem] font-medium transition-colors hover:border-ink",
        className,
      )}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {state === "speaking" ? (
          <>
            <rect x="7" y="6" width="3.5" height="12" rx="1" />
            <rect x="13.5" y="6" width="3.5" height="12" rx="1" />
          </>
        ) : (
          <>
            <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
            <path d="M16 9.2a4 4 0 010 5.6M18.8 6.5a8 8 0 010 11" />
          </>
        )}
      </svg>
      {t(state === "speaking" ? "aloud.stop" : "aloud.play")}
    </button>
  );
}
