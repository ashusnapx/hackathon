/**
 * Deciding when somebody has started talking, and when they have stopped.
 *
 * The microphone used to be a button you held a conversation around: press,
 * talk, remember to press again. That is one instruction too many for the
 * person this is built for — somebody in their sixties, on a phone, an hour
 * after losing money — and the commonest failure was not a wrong tap but a
 * forgotten one, ending with two minutes of silence recorded after the story.
 *
 * So the microphone listens for itself. This module holds the decision and
 * nothing else: it takes a level per animation frame and answers "waiting",
 * "speaking" or "stop". No audio, no DOM, no timers of its own — which is what
 * lets the whole thing be tested as a list of numbers instead of by talking at
 * a laptop and hoping.
 *
 * ── The four rules, and why each one exists ─────────────────────────────────
 *
 *  · Two thresholds, not one. A single cutoff makes a voice sitting near it
 *    flap between states several times a second. Speech has to cross the higher
 *    line to start; silence has to fall below the lower one to count.
 *
 *  · Silence has to last. People pause mid-sentence — to think, to read a bank
 *    SMS, to cry. A pause is not the end of a statement, so silence only ends
 *    the take after `hangoverMs`, which is set long on purpose.
 *
 *  · Nothing stops before `minSpeechMs`. Somebody who takes a breath before
 *    starting must not have the microphone close in the gap.
 *
 *  · Everything stops at `maxMs`. A hot microphone in a noisy room would
 *    otherwise never see silence, and a recording that runs forever is a
 *    battery drain and a privacy problem rather than a long answer.
 */

export type VadState = "waiting" | "speaking" | "stop";

export interface VadOptions {
  /** Cross this to be counted as speaking. 0-1, as the meter reports. */
  speechLevel?: number;
  /** Fall below this to be counted as silent. Lower than `speechLevel`. */
  silenceLevel?: number;
  /** How long silence must hold before a take ends. */
  hangoverMs?: number;
  /** Never end a take sooner than this after speech began. */
  minSpeechMs?: number;
  /** End it regardless after this. */
  maxMs?: number;
  /** If nobody says anything at all, give up after this. */
  patienceMs?: number;
}

export const VAD_DEFAULTS: Required<VadOptions> = {
  speechLevel: 0.055,
  silenceLevel: 0.03,
  // Two full seconds. Shorter felt responsive in a quiet room and cut people
  // off mid-sentence everywhere else.
  hangoverMs: 2000,
  minSpeechMs: 900,
  maxMs: 120_000,
  // A minute of nothing means the microphone was opened by accident, or the
  // permission prompt is sitting unanswered behind the page.
  patienceMs: 60_000,
};

export interface Vad {
  /** Feed one measurement. Returns what the microphone should do now. */
  push(level: number, atMs: number): VadState;
  /** Has any speech been heard in this take at all? */
  heardSpeech(): boolean;
  reset(): void;
}

export function createVad(options: VadOptions = {}): Vad {
  const o = { ...VAD_DEFAULTS, ...options };

  let openedAt: number | null = null;
  let speechAt: number | null = null;
  let silenceSince: number | null = null;
  let stopped = false;

  return {
    push(level, atMs) {
      if (stopped) return "stop";
      openedAt ??= atMs;

      if (level >= o.speechLevel) {
        speechAt ??= atMs;
        silenceSince = null;
      } else if (level <= o.silenceLevel) {
        silenceSince ??= atMs;
      }
      // Between the two thresholds nothing changes, which is the hysteresis.

      // Nobody has said anything yet.
      if (speechAt === null) {
        if (atMs - openedAt >= o.patienceMs) {
          stopped = true;
          return "stop";
        }
        return "waiting";
      }

      if (atMs - openedAt >= o.maxMs) {
        stopped = true;
        return "stop";
      }

      // Too soon to end, however quiet it has gone.
      if (atMs - speechAt < o.minSpeechMs) return "speaking";

      if (silenceSince !== null && atMs - silenceSince >= o.hangoverMs) {
        stopped = true;
        return "stop";
      }
      return "speaking";
    },
    heardSpeech: () => speechAt !== null,
    reset() {
      openedAt = null;
      speechAt = null;
      silenceSince = null;
      stopped = false;
    },
  };
}
