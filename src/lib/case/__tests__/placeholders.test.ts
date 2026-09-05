import { describe, expect, it } from "vitest";

import { bracketsIn, classifyBracket, fillDocument, findPlaceholders, remainingGaps } from "../placeholders";
import { newCase } from "../store";
import { ruleBankLetter } from "@/lib/ai/fallback";
import type { CaseFile } from "../types";

const blank = (): CaseFile => newCase({
  rawStatement: "I paid twelve thousand rupees to a fake delivery link.",
  amount: 12_000,
});

describe("the gaps a draft leaves", () => {
  it("offers only the ones this document actually has, in the order a person answers them", () => {
    const ids = findPlaceholders("Dear [name of your bank], I am [your full name].").map((f) => f.id);
    // Matched bank-first so a name is never mistaken for a bank's; asked
    // person-first, because that is how anybody fills in a form.
    expect(ids).toEqual(["name", "bankName"]);
    // No branch address in that sentence, so the panel must not ask for one.
    expect(ids).not.toContain("branchAddress");
  });

  it("fills a gap from the case, everywhere it appears", () => {
    const caseFile = { ...blank(), victim: { name: "Meera Nair", phone: "9876543210" } };
    const filled = fillDocument(
      "I, [your full name], can be reached on [your mobile]. Signed, [your full name]",
      caseFile,
    );
    expect(filled).toBe("I, Meera Nair, can be reached on 9876543210. Signed, Meera Nair");
  });

  it("leaves a gap the person has not answered visible", () => {
    const filled = fillDocument("Yours faithfully, [your full name]", blank());
    expect(filled).toContain("[your full name]");
  });

  it("writes the value the way a letter says it, not the way a form stores it", () => {
    const caseFile = { ...blank(), bank: { last4: "4417" } };
    expect(fillDocument("Account: [account]", caseFile)).toBe("Account: ending 4417");

    const dated = { ...blank(), bank: { notifiedAt: "2026-09-03T00:00:00.000Z" } };
    expect(fillDocument("Reported on [date]", dated)).toMatch(/Reported on \d{2} September 2026/);
  });

  it("keeps only the last four digits of an account, whatever is typed", () => {
    const field = findPlaceholders("[account]")[0];
    expect(field.write("1234 5678 9012 4417", blank()).bank?.last4).toBe("4417");
  });

  it("matches a bracket however the draft capitalised it", () => {
    const caseFile = { ...blank(), victim: { state: "Karnataka" } };
    expect(fillDocument("State: [State]", caseFile)).toBe("State: Karnataka");
  });
});

describe("what is left before a letter can be handed over", () => {
  it("counts the notes a draft addresses to the reader, which no form can answer", () => {
    const text = "[Before using this draft, state whether you initiated or approved it.] I am [your full name].";
    const caseFile = { ...blank(), victim: { name: "Meera Nair" } };
    const gaps = remainingGaps(text, caseFile);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].kind).toBe("note");
    expect(gaps[0].text).toMatch(/Before using this draft/);
  });

  it("reports a real bank letter as submittable once its fields are answered", () => {
    const caseFile: CaseFile = {
      ...blank(),
      victim: { name: "Meera Nair", phone: "9876543210", address: "12 MG Road, Bengaluru" },
      bank: { name: "ICICI Bank", last4: "4417", branchAddress: "Indiranagar branch" },
      incidentAt: "2026-09-03T10:30:00.000Z",
    };
    const letter = ruleBankLetter(caseFile);

    // Every gap this letter has is one the panel can offer, apart from the
    // instruction the draft deliberately leaves for the person to resolve.
    const unanswerable = remainingGaps(letter, caseFile);
    expect(unanswerable.every((gap) => gap.kind === "note")).toBe(true);
    expect(fillDocument(letter, caseFile)).toContain("Meera Nair");
    expect(fillDocument(letter, caseFile)).toContain("Indiranagar branch");
  });
});

describe("brackets the model invents, rather than the ones we wrote", () => {
  // Taken verbatim from a bank letter Gemini produced for the sample case.
  const MODEL_BRACKETS = [
    "[Bank Name]",
    "[Bank Branch Address]",
    "[Contact Number]",
    "[Dispute Reference Number if any]",
    "[For Bank Use Only]",
    "[Please confirm whether the transaction was unauthorised or a third-party breach.]",
  ];

  it("recognises them as the same holes the rules engine leaves", () => {
    const kinds = MODEL_BRACKETS.map((bracket) => classifyBracket(bracket));
    expect(kinds.map((gap) => gap.field?.id ?? gap.kind)).toEqual([
      "bankName",
      "branchAddress",
      "phone",
      "bankAck",
      "for-others",
      "note",
    ]);
  });

  it("does not count a block the bank fills in against the person", () => {
    const caseFile = { ...blank(), bank: { name: "ICICI Bank" } };
    const text = "To [Bank Name].\n\n[For Bank Use Only]";
    expect(remainingGaps(text, caseFile)).toEqual([]);
    expect(fillDocument(text, caseFile)).toContain("To ICICI Bank.");
  });

  it("keeps a person's own name away from their branch manager", () => {
    expect(classifyBracket("[Bank Name]").field?.id).toBe("bankName");
    expect(classifyBracket("[Your Full Name]").field?.id).toBe("name");
    expect(classifyBracket("[Bank Branch Address]").field?.id).toBe("branchAddress");
    expect(classifyBracket("[Your Address]").field?.id).toBe("address");
  });
});

describe("reading brackets out of a draft", () => {
  it("does not mistake a line of the letter for a gap", () => {
    expect(bracketsIn("Enclosures: statement, screenshots.")).toEqual([]);
    expect(bracketsIn("A [gap] and [another one]")).toEqual(["[gap]", "[another one]"]);
    // A bracket that runs over a line break is not a placeholder.
    expect(bracketsIn("[not\na placeholder]")).toEqual([]);
  });
});
