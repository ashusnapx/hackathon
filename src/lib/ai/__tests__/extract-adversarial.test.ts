import { describe, expect, it } from "vitest";

import { extractAmount, extractEntities, extractIncidentTime } from "../extract";

/**
 * The extractors, against the way people actually write.
 *
 * `extract.test.ts` next door checks the shapes. This checks the sentences —
 * romanised Hindi, code-mixed Hinglish, WhatsApp punctuation, the phrasings a
 * bank SMS uses, and the near-misses that must *not* be read as money.
 *
 * It exists because of a bug that shipped: `extractAmount` matched a currency
 * marker only when it came *before* the number, so "10000 rupees" — the
 * ordinary phrasing in most of India, and the only one you would type on a
 * phone keyboard where ₹ is two taps away — extracted nothing at all. A case
 * file, a bank dispute letter and an NCRP description all went out with no
 * amount in them, and the person had to notice and fix it themselves.
 *
 * Nothing here is hypothetical grammar. Every input is phrased the way the
 * transcripts and the demo call are phrased.
 */

describe("amounts, as people write them", () => {
  it.each([
    // The marker before the number — what already worked.
    ["Rs 10000 gaya", 10_000],
    ["₹45,000 debited from my account", 45_000],
    ["INR 2500 transferred", 2_500],
    ["rs. 7,500 nikal gaya", 7_500],

    // The marker after it — the bug this file exists for.
    ["I paid 10000 rupees by card", 10_000],
    ["5000 rs chala gaya", 5_000],
    ["2500/- debit ho gaya", 2_500],
    ["mere account se 15000 rupaye gaye", 15_000],
    ["18,000 rupees ka nuksan hua", 18_000],

    // Every romanised spelling of "rupee" people actually use. The pattern
    // listed two of these and missed the rest, which is how a real sentence a
    // real user typed produced a case file with no amount in it.
    ["mujhse 10000 rupay le liye gaye", 10_000],
    ["10000 rupaya gaya", 10_000],
    ["10000 rupya", 10_000],
    ["10000 rupiya nikal gaye", 10_000],
    ["10000 ruppee", 10_000],

    // Scaled, in both scripts and both spellings.
    ["I lost 1.5 lakh", 150_000],
    ["2 lakhs gone", 200_000],
    ["50 hazaar rupaye", 50_000],
    ["₹1.2 crore", 12_000_000],
    ["मैंने 25 हज़ार गंवाए", 25_000],
    ["3 लाख का fraud", 300_000],
  ])("reads %j as %i", (text, expected) => {
    expect(extractAmount(text)).toBe(expected);
  });

  it.each([
    // A number that is not money must not become the amount on a bank letter.
    ["call me on 9876543210"],
    ["my account number is 50100234567890"],
    ["reference 10000RSX2 was quoted"],
    ["OTP was 456789"],
    ["it happened at 1930 hours"],
    // The rupee word is loose on purpose; it must still not swallow this.
    ["the rupture in the pipe cost 10000 nothing"],
  ])("does not invent an amount from %j", (text) => {
    const amount = extractAmount(text);
    // Either nothing, or at least not the identifier itself read as rupees.
    expect(amount === undefined || amount < 100_000_000).toBe(true);
    expect(amount).not.toBe(9_876_543_210);
    expect(amount).not.toBe(456_789);
  });

  it("reads the sentence a user actually reported this failing on", () => {
    const said =
      "Mera naam Ashutosh Kumar hai aur mere sath ek fraud hua Instagram pe aur mujhse 10000 rupay le liye gaye aur";
    expect(extractAmount(said)).toBe(10_000);
  });

  it("does not read a phone number as a sum of money", () => {
    expect(extractAmount("they called from 9876543210 and took my money")).not.toBe(9_876_543_210);
  });

  it("prefers the marked amount over an unmarked number beside it", () => {
    expect(extractAmount("order 12345678 for which I paid Rs 3000")).toBe(3_000);
  });
});

describe("identifiers, out of running prose", () => {
  it("finds a UPI id written mid-sentence with no spaces around it", () => {
    expect(extractEntities("paise bheje the ravi.kumar@okhdfcbank par").upiIds)
      .toContain("ravi.kumar@okhdfcbank");
  });

  it("does not mistake an email address for a UPI id", () => {
    const e = extractEntities("he emailed me from support@fakebank.com");
    expect(e.upiIds).not.toContain("support@fakebank.com");
    expect(e.emails).toContain("support@fakebank.com");
  });

  it("finds an Indian mobile number written the way people send it", () => {
    for (const text of [
      "+91 98765 43210",   // pasted from a contact card
      "+919876543210",     // the canonical form, no separator
      "098765 43210",      // with the trunk prefix
      "98765-43210",
      "9876543210 se call aaya",
    ]) {
      expect(extractEntities(text).phones, text).toContain("9876543210");
    }
  });

  it("does not also file a phone number as a bank reference", () => {
    // "+919876543210" is twelve digits, which is exactly the shape of a UTR.
    // It used to appear in both lists, and then in both the complaint and the
    // bank letter, as though the victim had quoted a transaction reference.
    const e = extractEntities("the number was +919876543210");
    expect(e.phones).toContain("9876543210");
    expect(e.refs).toHaveLength(0);
  });

  it("keeps a scam link out of the phone list and in the url list", () => {
    const e = extractEntities("he sent kyc-verify.link/8821 and asked me to open it");
    expect(e.urls.length).toBeGreaterThan(0);
    expect(e.phones).toHaveLength(0);
  });

  it("survives a WhatsApp forward with no punctuation at all", () => {
    const forward =
      "sir mera paisa gaya 25000 rupees UPI se raju@okaxis par 9876543210 se call aaya tha KYC bola";
    const e = extractEntities(forward);
    expect(extractAmount(forward)).toBe(25_000);
    expect(e.upiIds).toContain("raju@okaxis");
    expect(e.phones.length).toBeGreaterThan(0);
  });

  it("does not crash or hang on a long unbroken string", () => {
    // A pasted base64 screenshot or a wall of digits must not wedge the intake.
    const junk = "a".repeat(5_000) + "9".repeat(5_000);
    expect(() => extractEntities(junk)).not.toThrow();
    expect(() => extractAmount(junk)).not.toThrow();
  });

  it("returns empty lists rather than undefined for an empty account", () => {
    const e = extractEntities("");
    expect(e.upiIds).toEqual([]);
    expect(e.phones).toEqual([]);
    expect(extractAmount("")).toBeUndefined();
  });
});

describe("money, in the languages it is lost in", () => {
  // Bengali, Assamese and Odia do not say "rupee" at all. Leaving them out was
  // three hundred million people whose amount silently did not extract.
  it.each([
    ["Bengali", "amar 10000 taka chole gelo"],
    ["Bengali, own script", "আমার 10000 টাকা চলে গেছে"],
    ["Odia", "10000 ଟଙ୍କା ଚାଲିଗଲା"],
    ["Tamil", "10000 ரூபாய் போயிடுச்சு"],
    ["Telugu", "10000 రూపాయి పోయింది"],
    ["Malayalam", "10000 രൂപ പോയി"],
    ["Gujarati", "10000 રૂપિયા ગયા"],
    ["Marathi", "10000 रुपये गेले"],
    ["Urdu", "10000 روپے چلے گئے"],
  ])("reads an amount written in %s", (_lang, text) => {
    expect(extractAmount(text)).toBe(10_000);
  });
});

describe("a day of the month, as people in India give a date", () => {
  // 14 September, so "28 तारीख" is unambiguously last month.
  const now = new Date("2026-09-14T12:00:00+05:30");
  const day = (text: string) => extractIncidentTime(text, now)?.slice(0, 10);

  it.each([
    ["दस तारीख को इसी महीने", "2026-09-10"],
    ["10 तारीख को हुआ था", "2026-09-10"],
    ["das tareekh ko hua tha", "2026-09-10"],
    ["it happened on the 10th of this month", "2026-09-10"],
    ["28 तारीख को, पिछले महीने", "2026-08-28"],
  ])("reads %j as %s", (text, expected) => {
    expect(day(text)).toBe(expected);
  });

  it("reads a day still ahead of us as last month, never as the future", () => {
    // A date after today is worse than no date: it goes into a police
    // complaint and every reporting clock in the case hangs off it.
    expect(day("28 तारीख को")).toBe("2026-08-28");
  });

  it("refuses a day that does not exist", () => {
    expect(day("32 तारीख को")).toBeUndefined();
  });

  it("lets an explicit date win over a named day in the same sentence", () => {
    expect(day("कल नहीं, दस तारीख को हुआ था")).toBe("2026-09-10");
  });

  it("still reads the relative and named forms it always did", () => {
    expect(day("do din pehle")).toBe("2026-09-12");
    expect(day("kal raat")).toBe("2026-09-13");
  });
});

describe("the whole statement a user reported this failing on", () => {
  it("reads the amount, the date, the number and the platform", () => {
    const said =
      "Mera naam Ashutosh Kumar hai aur mere sath ek fraud hua Instagram pe aur mujhse 10000 rupay "
      + "le liye gaye aur ये हुआ था दस तारीख को इसी महीने, और उनका नंबर था 9352478931।";
    const now = new Date("2026-09-14T12:00:00+05:30");
    expect(extractAmount(said)).toBe(10_000);
    expect(extractIncidentTime(said, now)?.slice(0, 10)).toBe("2026-09-10");
    expect(extractEntities(said).phones).toContain("9352478931");
    expect(extractEntities(said).apps).toContain("instagram");
  });
});

describe("when it happened, in the units people dictate", () => {
  const now = new Date("2026-09-08T12:00:00+05:30");

  it.each([
    ["it happened 2 hours ago"],
    ["do din pehle hua tha"],
    ["दस दिन पहले"],
    ["yesterday evening"],
    ["kal raat"],
  ])("gets a date out of %j", (text) => {
    expect(extractIncidentTime(text, now)).toBeTruthy();
  });

  it("does not date an account that never said when", () => {
    expect(extractIncidentTime("someone took my money by upi", now)).toBeUndefined();
  });

  it("never returns a date in the future", () => {
    // Every deadline in the case hangs off this value, and a future incident
    // date silently makes every one of them wrong.
    for (const text of ["2 hours ago", "kal", "last week", "do din pehle"]) {
      const at = extractIncidentTime(text, now);
      if (at) expect(new Date(at).getTime(), text).toBeLessThanOrEqual(now.getTime());
    }
  });
});
