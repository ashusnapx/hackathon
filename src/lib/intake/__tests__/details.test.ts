import { describe, expect, it } from "vitest";

import {
  answerDetail,
  askedDetails,
  detailProgress,
  detailsComplete,
  detailsForCase,
  isDetailAnswer,
  localDateTimeValue,
  nextDetail,
  parseIndianAmount,
  skipDetail,
  skipRemainingDetails,
  DETAIL_QUESTIONS,
} from "../details";
import { emptyIntake, type IntakeDraft } from "../interview";
import { EMPTY_ENTITIES } from "@/lib/case/types";

const confirmed = (over: Partial<IntakeDraft> = {}): IntakeDraft => ({
  ...emptyIntake("voice"),
  acceptedBoundaries: true,
  safety: "safe",
  safetyCheckedAt: new Date().toISOString(),
  childContext: "adult-or-no-child",
  moneyMoved: "yes",
  incidentTiming: "last-hour",
  narrative: "A caller pretending to be my bank took money from my account today.",
  analysisConfirmed: true,
  rbiAssessmentReviewed: true,
  routingAnswered: true,
  evidence: ["transaction"],
  analysis: {
    source: "openai",
    entities: { ...EMPTY_ENTITIES },
    triage: {
      categoryId: "financial-fraud",
      confidence: 0.8,
      applicableTracks: ["helpline", "ncrp", "bank-notice", "fir", "chakshu"],
      urgency: "critical",
    },
  },
  ...over,
});

const ask = (draft: IntakeDraft, id: string, value: string): IntakeDraft => {
  const question = DETAIL_QUESTIONS.find((q) => q.id === id)!;
  return { ...draft, ...answerDetail(draft, question, value) };
};

describe("which follow-ups a case is asked", () => {
  it("asks a financial case for the bank, the money and the account it went to", () => {
    const ids = detailsForCase(confirmed()).map((q) => q.id);
    expect(ids).toContain("bankName");
    expect(ids).toContain("accountLast4");
    expect(ids).toContain("suspectUpi");
    expect(ids).toContain("utr");
    // A payment fraud has no profile behind it to name.
    expect(ids).not.toContain("suspectHandle");
  });

  it("never asks a sextortion case for a UPI ID", () => {
    const draft = confirmed({
      moneyMoved: "no",
      analysis: {
        source: "openai",
        entities: { ...EMPTY_ENTITIES },
        triage: {
          categoryId: "women-child",
          confidence: 0.8,
          applicableTracks: ["ncrp", "fir", "chakshu", "legal-aid"],
          urgency: "critical",
        },
      },
    });
    const ids = detailsForCase(draft).map((q) => q.id);
    expect(ids).not.toContain("suspectUpi");
    expect(ids).not.toContain("accountLast4");
    expect(ids).not.toContain("amount");
    expect(ids).toContain("suspectHandle");
    expect(ids).toContain("policeStation");
    // Its documents still need a name, a phone and an address.
    expect(ids).toContain("name");
    expect(ids).toContain("address");
  });

  it("asks the same list whatever the RBI screening later says", () => {
    // These questions come before the screening, so they cannot depend on it:
    // a round that re-opened afterwards would put its questions out of order in
    // a conversation that is rebuilt from the answers, top to bottom.
    const before = detailsForCase(confirmed()).map((q) => q.id);
    const after = detailsForCase(confirmed({ bankReportTiming: "not_reported" })).map((q) => q.id);
    expect(after).toEqual(before);
    expect(before).toContain("bankNotifiedAt");
    expect(before).toContain("bankAck");
  });
});

describe("which side of the story a question sits on", () => {
  it("asks who you are before what happened, and nothing else", () => {
    expect(detailsForCase(confirmed(), "intro").map((q) => q.id))
      .toEqual(["name", "phone", "email", "address"]);
  });

  it("keeps everything that needs the story on the far side of it", () => {
    const later = detailsForCase(confirmed(), "case").map((q) => q.id);
    expect(later).toContain("amount");
    expect(later).toContain("bankName");
    expect(later).toContain("suspectUpi");
    expect(later).not.toContain("name");
  });

  it("finishes the introductions on their own, without waiting for the rest", () => {
    const draft = confirmed({ callerName: "Meera Nair" });
    expect(detailsComplete(draft, "intro")).toBe(false);
    const settled = { ...draft, ...skipRemainingDetails(draft) };
    expect(detailsComplete(settled, "intro")).toBe(true);
    expect(detailsComplete(settled)).toBe(true);
  });

  it("walks the introductions in the order a form asks them", () => {
    let draft = confirmed();
    const order: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const question = nextDetail(draft, "intro");
      if (!question) break;
      order.push(question.id);
      draft = { ...draft, ...answerDetail(draft, question, "x@example.com") };
    }
    expect(order).toEqual(["name", "phone", "email", "address"]);
  });
});

describe("asking them", () => {
  it("never asks for what the call already supplied", () => {
    const known = confirmed({ callerName: "Pranav Sharma", bankName: "ICICI Bank" });
    expect(nextDetail(known)?.id).not.toBe("name");
    expect(nextDetail(known)?.id).not.toBe("bankName");
    // And says so, rather than presenting a list that looks untouched.
    expect(detailProgress(known).known).toBe(2);
  });

  it("counts what the model already found in the story", () => {
    const draft = confirmed();
    const withUpi = {
      ...draft,
      analysis: { ...draft.analysis!, entities: { ...EMPTY_ENTITIES, upiIds: ["fraud@okaxis"] } },
    };
    expect(detailsForCase(withUpi).find((q) => q.id === "suspectUpi")!.read(withUpi))
      .toBe("fraud@okaxis");
  });

  it("moves on once a question is answered", () => {
    const draft = confirmed();
    const first = nextDetail(draft)!;
    expect(first.id).toBe("name");
    const after = ask(draft, "name", "Meera Nair");
    expect(after.callerName).toBe("Meera Nair");
    expect(nextDetail(after)?.id).not.toBe("name");
  });

  it("does not ask a skipped question again", () => {
    const draft = confirmed();
    const after = { ...draft, ...skipDetail(draft, "name") };
    expect(nextDetail(after)?.id).not.toBe("name");
    expect(detailsComplete(after)).toBe(false);
  });

  it("takes an answer it cannot store as a skip, rather than asking forever", () => {
    const draft = confirmed();
    const after = ask(draft, "amount", "not a number at all");
    expect(after.analysis?.triage.amount).toBeUndefined();
    expect(nextDetail(after)?.id).not.toBe("amount");
  });

  it("finishes when the rest are waved away", () => {
    const draft = confirmed();
    const after = { ...draft, ...skipRemainingDetails(draft) };
    expect(detailsComplete(after)).toBe(true);
    expect(nextDetail(after)).toBeUndefined();
  });

  it("shows only the questions somebody was actually asked", () => {
    const draft = confirmed({ callerName: "Pranav Sharma" });
    const after = ask(draft, "phone", "9876543210");
    const shown = askedDetails(after);
    expect(shown.map((row) => row.question.id)).toEqual(["phone"]);
    expect(shown[0].answer).toBe("9876543210");
    // The name came off the call; nobody typed it, so nothing is quoted back.
    expect(shown.map((row) => row.question.id)).not.toContain("name");
  });
});

describe("what an answer does to the case", () => {
  it("keeps only the last four digits of an account", () => {
    const after = ask(confirmed(), "accountLast4", "1234 5678 9012 4417");
    expect(after.details?.accountLast4).toBe("4417");
  });

  it("corrects the identifier the person is looking at, and keeps the rest", () => {
    const draft = confirmed();
    const seeded = {
      ...draft,
      analysis: {
        ...draft.analysis!,
        entities: { ...EMPTY_ENTITIES, phones: ["9000000000", "9222222222"] },
      },
    };
    // The chat never asks this one — it is already known — so this is the form
    // beside it, where the box shows the first number and editing means that one.
    const after = ask(seeded, "suspectPhone", "9111111111");
    expect(after.analysis?.entities.phones).toEqual(["9111111111", "9222222222"]);
  });

  it("adds the first identifier of a kind when the story turned up none", () => {
    const after = ask(confirmed(), "suspectPhone", "9111111111");
    expect(after.analysis?.entities.phones).toEqual(["9111111111"]);
  });

  it("does not double an identifier that is already there", () => {
    const draft = confirmed();
    const seeded = {
      ...draft,
      analysis: { ...draft.analysis!, entities: { ...EMPTY_ENTITIES, refs: ["UTR9911"] } },
    };
    const after = ask(seeded, "utr", "utr9911");
    expect(after.analysis?.entities.refs).toEqual(["UTR9911"]);
  });

  it("stores a time as an instant, and offers it back to the field in local time", () => {
    const after = ask(confirmed(), "incidentAt", "2026-09-03T14:30");
    expect(after.analysis?.triage.incidentAt).toBe(new Date("2026-09-03T14:30").toISOString());
    expect(localDateTimeValue(after.analysis?.triage.incidentAt)).toBe("2026-09-03T14:30");
  });
});

describe("an amount said out loud", () => {
  it("reads digits", () => {
    expect(parseIndianAmount("47500")).toBe(47_500);
    expect(parseIndianAmount("₹47,500")).toBe(47_500);
    expect(parseIndianAmount("Rs. 47500 only")).toBe(47_500);
  });

  it("reads the scale words people actually use", () => {
    expect(parseIndianAmount("1.2 lakh")).toBe(120_000);
    expect(parseIndianAmount("2 crore")).toBe(20_000_000);
    expect(parseIndianAmount("50 thousand")).toBe(50_000);
  });

  it("reads an amount dictated in words", () => {
    expect(parseIndianAmount("forty seven thousand five hundred")).toBe(47_500);
    expect(parseIndianAmount("two lakh fifty thousand")).toBe(250_000);
    expect(parseIndianAmount("nine hundred")).toBe(900);
  });

  it("refuses a sentence with no amount in it", () => {
    expect(parseIndianAmount("I do not remember")).toBe(0);
    expect(parseIndianAmount("")).toBe(0);
  });
});

describe("whether the send button should be live", () => {
  const q = (id: string) => DETAIL_QUESTIONS.find((item) => item.id === id)!;

  it("holds until an answer is worth storing", () => {
    expect(isDetailAnswer(q("amount"), "I am not sure")).toBe(false);
    expect(isDetailAnswer(q("amount"), "forty seven thousand")).toBe(true);
    expect(isDetailAnswer(q("email"), "meera")).toBe(false);
    expect(isDetailAnswer(q("email"), "meera@example.com")).toBe(true);
    expect(isDetailAnswer(q("phone"), "98")).toBe(false);
    expect(isDetailAnswer(q("phone"), "9876543210")).toBe(true);
    expect(isDetailAnswer(q("name"), " ")).toBe(false);
  });
});
