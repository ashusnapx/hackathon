/**
 * Reading one event out of the browser's speech recogniser.
 *
 * Two things about that API are easy to get wrong and impossible to see going
 * wrong, which is why this is a function on its own with tests around it.
 *
 * `results` is cumulative when `continuous` is set: every event carries every
 * phrase since the session opened, not just the new one. Walking it from zero
 * therefore re-emits phrases that were already committed, and a paragraph turns
 * into a stutter. `resultIndex` is the first entry that changed in this event,
 * and it is the only sane place to start.
 *
 * The rest is the split between settled and live. A phrase the engine has
 * committed is the person's words and belongs in the transcript; a phrase it is
 * still revising belongs on screen but not in the record, or somebody watches
 * their own sentence rewrite itself and assumes the app lost it.
 */
export interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

export function readRecognition(event: RecognitionEventLike): { settled: string; live: string } {
  let settled = "";
  let live = "";
  const from = Number.isFinite(event.resultIndex) ? Math.max(0, event.resultIndex) : 0;
  for (let i = from; i < event.results.length; i += 1) {
    const result = event.results[i];
    const text = result?.[0]?.transcript ?? "";
    if (!text) continue;
    if (result.isFinal) settled += `${text} `;
    else live += text;
  }
  return { settled: settled.trim(), live: live.trim() };
}

/** Join a new phrase onto what is already there without doubling the space. */
export function appendPhrase(existing: string, phrase: string): string {
  return [existing.trim(), phrase.trim()].filter(Boolean).join(" ");
}
