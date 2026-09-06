import { describe, expect, it } from "vitest";

import { checkDetailAnswer, DETAIL_QUESTIONS } from "../details";

const q = (id: string) => DETAIL_QUESTIONS.find((question) => question.id === id)!;
const why = (id: string, value: string) => {
  const verdict = checkDetailAnswer(q(id), value);
  return verdict.ok ? null : verdict.reason;
};

describe("the victim's own mobile number", () => {
  it("takes a real Indian mobile, however it was written down", () => {
    for (const written of ["9876543210", "98765 43210", "+91 98765 43210", "091-9876543210"]) {
      expect(why("phone", written), written).toBeNull();
    }
  });

  it("refuses one that could not ring", () => {
    // The bank and the police call this number. Nine digits, or one starting
    // with 5, is not a number anybody answers.
    expect(why("phone", "987654321")).toBe("detail.errPhone");
    expect(why("phone", "98765432100")).toBe("detail.errPhone");
    expect(why("phone", "1234567890")).toBe("detail.errPhone");
    expect(why("phone", "5876543210")).toBe("detail.errPhone");
  });
});

describe("the number they were called from", () => {
  it("is deliberately lenient", () => {
    // It may be a landline, a short code or an international line. Refusing it
    // over a formatting opinion loses evidence.
    for (const written of ["9876543210", "1800123456", "+1 415 555 0123", "140-2345"]) {
      expect(why("suspectPhone", written), written).toBeNull();
    }
  });

  it("still refuses something that is not a number at all", () => {
    expect(why("suspectPhone", "12345")).toBe("detail.errSuspectPhone");
  });
});

describe("bank and payment identifiers", () => {
  it("wants four digits of the account, not the whole thing", () => {
    expect(why("accountLast4", "4417")).toBeNull();
    expect(why("accountLast4", "1234 5678 9012 4417")).toBeNull();
    expect(why("accountLast4", "441")).toBe("detail.errLast4");
  });

  it("knows the shape of a UPI ID", () => {
    expect(why("suspectUpi", "fraudster@okaxis")).toBeNull();
    expect(why("suspectUpi", "9876543210@ybl")).toBeNull();
    expect(why("suspectUpi", "fraudster")).toBe("detail.errUpi");
    expect(why("suspectUpi", "not an id")).toBe("detail.errUpi");
  });

  it("takes a reference however the bank labelled it", () => {
    expect(why("utr", "123456789012")).toBeNull();
    expect(why("utr", "RRN-4417/22")).toBeNull();
    expect(why("utr", "12345")).toBe("detail.errReference");
  });

  it("keeps a beneficiary account inside believable bounds", () => {
    expect(why("suspectAccount", "123456789012")).toBeNull();
    expect(why("suspectAccount", "12345")).toBe("detail.errAccount");
  });
});

describe("amounts, dates and the rest", () => {
  it("takes an amount however it was said", () => {
    expect(why("amount", "47500")).toBeNull();
    expect(why("amount", "1.2 lakh")).toBeNull();
    expect(why("amount", "forty seven thousand")).toBeNull();
  });

  it("refuses a number nobody lost to a UPI fraud", () => {
    expect(why("amount", "I do not know")).toBe("detail.errAmount");
    expect(why("amount", "999999999999")).toBe("detail.errAmountBig");
  });

  it("refuses a fraud that has not happened yet", () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
    expect(why("incidentAt", tomorrow)).toBe("detail.errFuture");
    expect(why("incidentAt", "2026-09-01T10:30")).toBeNull();
  });

  it("checks an email is an email", () => {
    expect(why("email", "meera@example.com")).toBeNull();
    expect(why("email", "meera@example")).toBe("detail.errEmail");
    expect(why("email", "meera")).toBe("detail.errEmail");
  });

  it("wants a name in letters, in any script", () => {
    expect(why("name", "Meera Nair")).toBeNull();
    expect(why("name", "अशुतोष")).toBeNull();
    expect(why("name", "12345")).toBe("detail.errName");
  });

  it("wants an address a letter could reach", () => {
    expect(why("address", "12 MG Road, Bengaluru 560038")).toBeNull();
    expect(why("address", "Bengaluru")).toBe("detail.errAddress");
  });

  it("says something is empty rather than nothing at all", () => {
    expect(why("name", "   ")).toBe("detail.errEmpty");
  });
});
