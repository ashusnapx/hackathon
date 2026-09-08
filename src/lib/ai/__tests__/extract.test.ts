import { describe, expect, it } from "vitest";

import { extractAmount, extractEntities, extractIncidentTime } from "../extract";

describe("Indic digits", () => {
  // The old implementation masked the low nibble, which is only correct for a
  // block whose zero sits at 0x_0. The nine Brahmic blocks start at 0x_6, so
  // every digit in them came out six too high — silently, and confidently.
  const BLOCKS: [string, string][] = [
    ["Devanagari", "८५०००"],
    ["Bengali", "৮৫০০০"],
    ["Gurmukhi", "੮੫੦੦੦"],
    ["Gujarati", "૮૫૦૦૦"],
    ["Odia", "୮୫୦୦୦"],
    ["Tamil", "௮௫௦௦௦"],
    ["Telugu", "౮౫౦౦౦"],
    ["Kannada", "೮೫೦೦೦"],
    ["Malayalam", "൮൫൦൦൦"],
    ["Arabic-Indic", "٨٥٠٠٠"],
    ["Extended Arabic-Indic", "۸۵۰۰۰"],
  ];

  it.each(BLOCKS)("reads ₹85,000 written in %s digits", (_script, digits) => {
    expect(extractAmount(`₹${digits}`)).toBe(85000);
  });

  it("does not invent a reference number out of Devanagari digits", () => {
    // The mangled form was longer than the original and still matched RX.ref,
    // so a fabricated UTR would have been reported as a real one.
    expect(extractEntities("UTR १२३४५६७८९०१२").refs).toEqual(["123456789012"]);
  });

  it("reads a Devanagari incident time", () => {
    const now = new Date("2026-09-08T12:00:00+05:30");
    expect(extractIncidentTime("३ दिन पहले", now)?.slice(0, 10)).toBe("2026-09-05");
  });
});

describe("amounts as people actually say them", () => {
  // "das hazaar ka fraud hua hai" is an ordinary sentence for most of this
  // app's users and it used to yield no amount at all, while the English
  // "ten thousand" worked.
  it.each([
    ["das hajar", 10_000],
    ["das hazaar ka fraud hua hai", 10_000],
    ["mere sath das hajar ka fraud hua hai", 10_000],
    ["do lakh", 200_000],
    ["paanch lakh", 500_000],
    ["ek crore", 10_000_000],
  ])("reads romanised Hindi: %s", (text, expected) => {
    expect(extractAmount(text)).toBe(expected);
  });

  it.each([
    ["पचास हज़ार", 50_000],
    ["बीस हजार", 20_000],
    ["दो लाख", 200_000],
  ])("reads Devanagari: %s", (text, expected) => {
    // \b is defined over [A-Za-z0-9_], so these never matched until the word
    // boundaries were replaced with Unicode-aware lookarounds.
    expect(extractAmount(text)).toBe(expected);
  });

  it("sums a compound rather than taking the first word", () => {
    // "eighty five thousand" returned 80,000 — the first unit word and one
    // scale, with "five" dropped. A wrong figure, not a missing one.
    expect(extractAmount("eighty five thousand")).toBe(85_000);
    expect(extractAmount("twenty five lakh")).toBe(2_500_000);
  });

  it("does not glue a number to a scale word across a clause", () => {
    expect(extractAmount("I have three phones. Thousands of people are scammed.")).toBeUndefined();
  });
});

describe("when it happened, as people actually say it", () => {
  const now = new Date("2026-09-08T12:00:00+05:30");
  const day = (text: string) => extractIncidentTime(text, now)?.slice(0, 10);

  it("reads a Hindi day offset with a Hindi number", () => {
    expect(day("das din pehle")).toBe("2026-08-29");
    expect(day("दस दिन पहले")).toBe("2026-08-29");
  });

  it("does not let 'aaj' in the sentence collapse the offset to today", () => {
    // "aaj se das din pehle" is ten days BEFORE today. The today branch used to
    // run first and swallowed the whole phrase, returning today's date — which
    // then goes into a complaint as the incident date and moves every deadline
    // the rest of the app computes from it.
    expect(day("yeh aaj se das din pehle hua")).toBe("2026-08-29");
    expect(day("aaj hi hua")).toBe("2026-09-08");
  });

  it("reads weeks, months and hours in Hindi units", () => {
    expect(day("ek hafta pehle")).toBe("2026-09-01");
    expect(day("teen mahine pehle")).toBe("2026-06-08");
    expect(extractIncidentTime("do ghante pehle", now)).toBe(
      new Date(now.getTime() - 2 * 3_600_000).toISOString(),
    );
  });

  it("clamps rather than overflows at the end of a short month", () => {
    // setMonth alone turns 31 March minus one month into 31 February, which
    // JavaScript rolls forward to 3 March — a date AFTER the one described.
    expect(extractIncidentTime("1 month ago", new Date("2026-03-31T12:00:00+05:30"))?.slice(0, 10))
      .toBe("2026-02-28");
  });

  it("still reads the phrases it always read", () => {
    expect(day("yesterday evening")).toBe("2026-09-07");
    expect(day("parso")).toBe("2026-09-06");
    expect(day("2 hours ago")).toBe("2026-09-08");
    expect(day("nothing time-like here")).toBeUndefined();
  });
});
