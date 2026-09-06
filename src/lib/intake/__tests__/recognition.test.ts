import { describe, expect, it } from "vitest";

import { appendPhrase, readRecognition, type RecognitionEventLike } from "../recognition";

const phrase = (transcript: string, isFinal: boolean) =>
  Object.assign([{ transcript }], { isFinal });

const event = (resultIndex: number, ...phrases: ReturnType<typeof phrase>[]): RecognitionEventLike =>
  ({ resultIndex, results: phrases });

describe("reading the speech recogniser", () => {
  it("keeps words still being revised out of the record", () => {
    const { settled, live } = readRecognition(event(0, phrase("a man called saying", false)));
    expect(settled).toBe("");
    expect(live).toBe("a man called saying");
  });

  it("commits a phrase once the engine has settled on it", () => {
    const { settled, live } = readRecognition(event(0, phrase("A man called saying.", true)));
    expect(settled).toBe("A man called saying.");
    expect(live).toBe("");
  });

  it("does not re-emit a phrase it has already handed over", () => {
    // `results` is cumulative when continuous is set: this event carries the
    // first sentence again alongside the second. Walking it from zero sent the
    // first one a second time, and a paragraph came out as a stutter.
    const cumulative = event(
      1,
      phrase("A man called saying he was from my bank.", true),
      phrase(" Then 47500 rupees left.", true),
    );
    expect(readRecognition(cumulative).settled).toBe("Then 47500 rupees left.");
  });

  it("survives an engine that gives no resultIndex at all", () => {
    const odd = { results: [phrase("hello", true)] } as unknown as RecognitionEventLike;
    expect(readRecognition(odd).settled).toBe("hello");
  });

  it("ignores an empty alternative rather than committing a blank", () => {
    expect(readRecognition(event(0, phrase("", true))).settled).toBe("");
  });
});

describe("joining what was said to what came before", () => {
  it("adds a sentence rather than replacing the last one", () => {
    // The bug this guards against: the recogniser binds its handler once, so a
    // handler holding the transcript as it was at that moment overwrote every
    // sentence after the first.
    expect(appendPhrase("A man called.", "Then the money went.")).toBe("A man called. Then the money went.");
  });

  it("does not leave a gap when there is nothing to join to", () => {
    expect(appendPhrase("", "First words.")).toBe("First words.");
    expect(appendPhrase("  ", "  First words.  ")).toBe("First words.");
    expect(appendPhrase("Already said.", "   ")).toBe("Already said.");
  });
});
