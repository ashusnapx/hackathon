import { describe, expect, it } from "vitest";

import { createVad, VAD_DEFAULTS } from "../vad";

/**
 * The microphone's own decision, as a list of numbers.
 *
 * Every case here is one that was reachable by talking at a laptop and tedious
 * to reach twice: a pause mid-sentence, a slow starter, a room that never goes
 * quiet, a permission prompt nobody answered.
 */

/** Feed a level for a span of time, 60 frames a second. */
function feed(vad: ReturnType<typeof createVad>, level: number, ms: number, from = 0) {
  let last = "waiting";
  for (let t = from; t < from + ms; t += 16) last = vad.push(level, t);
  return { last, until: from + ms };
}

const LOUD = 0.2;
const QUIET = 0.005;

describe("createVad", () => {
  it("waits while the room is silent, rather than calling it speech", () => {
    const vad = createVad();
    expect(feed(vad, QUIET, 3_000).last).toBe("waiting");
    expect(vad.heardSpeech()).toBe(false);
  });

  it("starts once somebody speaks", () => {
    const vad = createVad();
    expect(feed(vad, LOUD, 500).last).toBe("speaking");
    expect(vad.heardSpeech()).toBe(true);
  });

  it("stops after the hangover once they finish", () => {
    const vad = createVad();
    const spoke = feed(vad, LOUD, 2_000);
    const quiet = feed(vad, QUIET, VAD_DEFAULTS.hangoverMs + 200, spoke.until);
    expect(quiet.last).toBe("stop");
  });

  it("does not stop for a pause mid-sentence", () => {
    // The reason the hangover is two seconds: people stop to think, to read a
    // bank SMS, to cry. None of those is the end of a statement.
    const vad = createVad();
    const spoke = feed(vad, LOUD, 2_000);
    const pause = feed(vad, QUIET, 1_200, spoke.until);
    expect(pause.last).toBe("speaking");
    expect(feed(vad, LOUD, 500, pause.until).last).toBe("speaking");
  });

  it("does not cut off a slow starter", () => {
    // A breath, one word, another breath. minSpeechMs protects the gap.
    const vad = createVad();
    const first = feed(vad, LOUD, 100);
    const gap = feed(vad, QUIET, 600, first.until);
    expect(gap.last).toBe("speaking");
  });

  it("gives up if nobody ever says anything", () => {
    // An accidental tap, or a permission prompt sitting unanswered.
    const vad = createVad({ patienceMs: 5_000 });
    expect(feed(vad, QUIET, 5_200).last).toBe("stop");
  });

  it("stops eventually in a room that never goes quiet", () => {
    const vad = createVad({ maxMs: 4_000 });
    expect(feed(vad, LOUD, 4_400).last).toBe("stop");
  });

  it("ignores a level hovering between the two thresholds", () => {
    // One cutoff would flap here several times a second.
    const vad = createVad();
    const spoke = feed(vad, LOUD, 2_000);
    const between = (VAD_DEFAULTS.speechLevel + VAD_DEFAULTS.silenceLevel) / 2;
    expect(feed(vad, between, 5_000, spoke.until).last).toBe("speaking");
  });

  it("stays stopped once it has stopped", () => {
    const vad = createVad();
    const spoke = feed(vad, LOUD, 2_000);
    const quiet = feed(vad, QUIET, VAD_DEFAULTS.hangoverMs + 200, spoke.until);
    expect(quiet.last).toBe("stop");
    expect(vad.push(LOUD, quiet.until + 100)).toBe("stop");
  });

  it("can be reset for the next take", () => {
    const vad = createVad();
    const spoke = feed(vad, LOUD, 2_000);
    feed(vad, QUIET, VAD_DEFAULTS.hangoverMs + 200, spoke.until);
    vad.reset();
    expect(vad.heardSpeech()).toBe(false);
    expect(vad.push(QUIET, 0)).toBe("waiting");
  });
});
