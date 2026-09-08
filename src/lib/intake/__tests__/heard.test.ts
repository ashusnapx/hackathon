import { describe, expect, it } from "vitest";

import { readHeard, anyHeard } from "../heard";

const at = (id: string, items: ReturnType<typeof readHeard>) => items.find((i) => i.id === id)!;

describe("what we have heard so far", () => {
  it("hears nothing in an empty statement", () => {
    const items = readHeard("");
    expect(anyHeard(items)).toBe(false);
    expect(items).toHaveLength(6);
  });

  it("ticks the story only once it is a statement rather than a sentence", () => {
    expect(at("story", readHeard("I was scammed")).found).toBe(false);
    const real = "Yesterday evening I got a call from someone saying they were from my bank and I lost money.";
    expect(at("story", readHeard(real)).found).toBe(true);
  });

  it("reads a spoken amount the way the interview will read it", () => {
    // extractAmount alone returns 80000 here — it takes the first unit word and
    // one scale. Showing 80,000 and then asking the person to confirm 85,000
    // two screens later is the mismatch this routes around.
    const items = readHeard("they took eighty five thousand rupees from my account");
    expect(at("amount", items).found).toBe(true);
    expect(at("amount", items).value).toBe("₹85,000");
  });

  it("reads an amount written in Devanagari digits", () => {
    expect(at("amount", readHeard("₹८५००० gone")).value).toBe("₹85,000");
  });

  it("shows the resolved date back, so a wrong reading is visible", () => {
    const now = new Date("2026-09-08T12:00:00+05:30");
    const items = readHeard("it happened 3 days ago", "en-IN", now);
    expect(at("when", items).found).toBe(true);
    expect(at("when", items).value).toMatch(/5 Sep/);
  });

  it("does not print a clock time the person never gave", () => {
    // extractIncidentTime always returns a full instant, and for a bare
    // "yesterday" the clock half of it is just carried over from now. Printing
    // that would put an invented time next to a green tick.
    const now = new Date("2026-09-08T09:41:00+05:30");
    expect(at("when", readHeard("it happened yesterday", "en-IN", now)).value).not.toMatch(/:/);
    expect(at("when", readHeard("it happened 3 days ago", "en-IN", now)).value).not.toMatch(/:/);
  });

  it("prints the clock time when the words carried one", () => {
    const now = new Date("2026-09-08T09:41:00+05:30");
    expect(at("when", readHeard("about 2 hours ago", "en-IN", now)).value).toMatch(/:/);
    expect(at("when", readHeard("yesterday evening", "en-IN", now)).value).toMatch(/:/);
  });

  it("finds a phone number and a reference separately", () => {
    const items = readHeard("he called from 9876543210 and the UTR is 123456789012");
    expect(at("contact", items).value).toBe("9876543210");
    expect(at("reference", items).value).toBe("123456789012");
  });

  it("finds a bank reference dictated in lowercase", () => {
    // Transcription returns lowercase; the regex used to be case-sensitive on
    // the letter prefix, so a spoken reference was never recognised.
    expect(at("reference", readHeard("the reference is hdfc12345678901")).found).toBe(true);
  });

  it("echoes an app the way the person wrote it", () => {
    expect(at("where", readHeard("they messaged me on WhatsApp")).value).toBe("WhatsApp");
  });

  it("un-ticks when the person deletes what they said", () => {
    const withAmount = readHeard("they took ₹85,000 from me");
    expect(at("amount", withAmount).found).toBe(true);
    expect(at("amount", readHeard("they took money from me")).found).toBe(false);
  });

  it("never lists anything it has no extractor for", () => {
    // The old pill set led with the person's name and their bank's name, and
    // neither can ever go green — they arrive from the model or from Vaani,
    // later. A permanently grey row reads as a test being failed.
    const ids = readHeard("").map((i) => i.id);
    expect(ids).not.toContain("name");
    expect(ids).not.toContain("bank");
  });
});

describe("the amount, against a whole real statement", () => {
  // Caught on screen, not in a unit test: the figure rendered as ₹9,87,66,28,210
  // because the better parser was handed the entire statement and read the
  // phone number and the UTR as digits.
  const REAL =
    "Yesterday evening I got a call from a man saying he was from my bank. " +
    "He asked for an OTP and they took eighty five thousand rupees. " +
    "He called from 9876543210 and messaged me on WhatsApp. The UTR is hdfc12345678901.";

  it("reads the amount and not the phone number or the reference", () => {
    const items = readHeard(REAL);
    expect(items.find((i) => i.id === "amount")!.value).toBe("₹85,000");
    expect(items.find((i) => i.id === "contact")!.value).toBe("9876543210");
    expect(items.find((i) => i.id === "reference")!.value).toBe("hdfc12345678901");
  });

  it("still reads a plain digit amount with no scale word", () => {
    expect(readHeard("they took ₹47,500 from my account").find((i) => i.id === "amount")!.value)
      .toBe("₹47,500");
  });

  it("does not let a stray scale word inflate a digit amount", () => {
    const items = readHeard("₹5,000 went and my account has thousands of rupees left");
    expect(items.find((i) => i.id === "amount")!.value).toBe("₹5,000");
  });
});
