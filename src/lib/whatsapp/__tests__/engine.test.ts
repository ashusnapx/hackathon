import { describe, expect, it } from "vitest";

import { advance, FORGOTTEN, STOP, handoffMessages } from "../engine";
import type { IntakeDraft } from "@/lib/intake/interview";

/**
 * The conversation, driven as a table.
 *
 * `advance` is pure, so the whole interview can be walked here rather than by
 * hand in Meta's sandbox — which matters because the parts most likely to break
 * are the ones hardest to reach by hand: a "no" at the safety gate, a retry, a
 * story that arrives in the name slot.
 */

/** Walk a list of replies through the machine and return the final draft. */
function walk(said: string[]): { draft: IntakeDraft | null; last: string[]; handoff: boolean } {
  let draft: IntakeDraft | null = null;
  let last: string[] = [];
  let handoff = false;
  for (const text of said) {
    const turn = advance(draft, text);
    draft = turn.draft;
    last = turn.messages;
    handoff = Boolean(turn.handoff);
  }
  return { draft, last, handoff };
}

const STORY = "Someone called saying my KYC expired and I paid 10000 rupees by card to bharatpe@okaxis";

describe("the opening", () => {
  it("leads with what Kavach is not, before anything else", () => {
    const { last } = walk([""]);
    expect(last.join(" ")).toMatch(/not\W+the police/i);
    expect(last.join(" ")).toMatch(/1930/);
  });

  it("does not advance until the boundaries are accepted", () => {
    const { draft } = walk([""]);
    expect(draft?.acceptedBoundaries).toBeFalsy();
  });

  it("answers a request for more before asking again", () => {
    const { last } = walk(["", "2"]);
    expect(last.join(" ")).toMatch(/no OTP/i);
  });
});

describe("the safety gate", () => {
  it("sends someone in danger to 112 and stops the interview there", () => {
    const { last, draft } = walk(["", "1", "2"]);
    expect(last.join(" ")).toMatch(/\*112\*/);
    expect(draft?.safety).toBe("danger");
    // Not asked for their story while they are unsafe.
    expect(last.join(" ")).not.toMatch(/what happened/i);
  });

  it("records when the answer was given, so a stale 'safe' cannot be reused", () => {
    const { draft } = walk(["", "1", "1"]);
    expect(draft?.safetyCheckedAt).toBeTruthy();
  });

  it("re-asks rather than rejecting an answer it cannot read", () => {
    const { last } = walk(["", "1", "purple"]);
    expect(last.join(" ")).toMatch(/are you safe/i);
    expect(last.join(" ")).not.toMatch(/invalid/i);
  });
});

describe("the money question", () => {
  it("pushes 1930 when money has already gone", () => {
    const { last } = walk(["", "1", "1", "1", "1"]);
    expect(last.join(" ")).toMatch(/1930/);
  });

  it("does not push 1930 when nothing has moved yet", () => {
    const { last } = walk(["", "1", "1", "1", "2"]);
    expect(last.join(" ")).not.toMatch(/1930/);
  });
});

describe("the name step", () => {
  it("keeps a long answer as the story instead of storing it as a first name", () => {
    const { draft } = walk(["", "1", "1", "1", "1", STORY]);
    expect(draft?.callerName).toBeUndefined();
    expect(draft?.narrative).toContain("KYC");
  });

  it("takes a short answer as the name", () => {
    const { draft } = walk(["", "1", "1", "1", "1", "Pranav"]);
    expect(draft?.callerName).toBe("Pranav");
  });
});

describe("the story and the read-back", () => {
  const upTo = ["", "1", "1", "1", "1", "Pranav"];

  it("asks for more when there is barely anything to work with", () => {
    const { last } = walk([...upTo, "fraud"]);
    expect(last.join(" ")).toMatch(/anything more/i);
  });

  it("reads back the amount and the identifier it found", () => {
    const { last } = walk([...upTo, STORY]);
    const said = last.join(" ");
    expect(said).toMatch(/10,000/);
    expect(said).toMatch(/bharatpe@okaxis/);
    expect(said).toMatch(/is that right/i);
  });

  it("hands off once the read-back is confirmed", () => {
    const { handoff, draft } = walk([...upTo, STORY, "1"]);
    expect(handoff).toBe(true);
    expect(draft?.analysisConfirmed).toBe(true);
  });

  it("takes a correction as more sentences rather than asking which field was wrong", () => {
    const { last, draft } = walk([...upTo, STORY, "2"]);
    expect(last.join(" ")).toMatch(/what I got wrong/i);
    expect(draft?.analysis).toBeUndefined();
    // The narrative survives the correction.
    expect(draft?.narrative).toContain("KYC");
  });

  it("recomputes the read-back after a correction", () => {
    const { last } = walk([...upTo, STORY, "2", "it was actually 25000 rupees"]);
    expect(last.join(" ")).toMatch(/is that right/i);
  });
});

describe("the handoff", () => {
  it("says the link is the case, and tells them not to lose it", () => {
    const draft = walk(["", "1", "1", "1", "1", "Pranav", STORY, "1"]).draft!;
    const said = handoffMessages("https://example.test/assist?wa=abc", draft).join(" ");
    expect(said).toContain("https://example.test/assist?wa=abc");
    expect(said).toMatch(/losing it loses the case/i);
    expect(said).toMatch(/Pranav/);
  });

  it("does not claim anything has been filed", () => {
    const draft = walk(["", "1", "1", "1", "2", "Asha", STORY, "1"]).draft!;
    expect(handoffMessages("https://x.test/a", draft).join(" ")).toMatch(/nothing has been filed/i);
  });
});

describe("being forgotten", () => {
  it.each(["stop", "STOP", "delete", "forget me", "remove my data"])("recognises %s", (word) => {
    expect(STOP.test(word)).toBe(true);
  });

  it("does not fire on an ordinary sentence", () => {
    expect(STOP.test("they told me to stop using my card")).toBe(false);
  });

  it("says the case survives the chat being deleted", () => {
    expect(FORGOTTEN).toMatch(/held by the link/i);
  });
});
