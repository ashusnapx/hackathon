import { describe, expect, it } from "vitest";
import { parseLetter, reflow } from "../letter";

// The exact shape a real user reported: an entire bank letter as one paragraph.
const BLOB =
  "To, The Branch Manager, [Name of Bank], [Branch Name], [City]. Date: 02-09-2026. " +
  "Subject: Reporting of unauthorized electronic banking transaction and demand for reversal under Reserve Bank of India guidelines on limiting customer liability. " +
  "Respected Sir or Madam, I, Ashutosh Kumar, holding account number [Your Account Number] at your [Branch Name] branch, wish to report an unauthorized electronic transaction from my account. " +
  "1. That on 2026-09-02, an amount of Rs. 50 was fraudulently debited from my account. " +
  "2. That the particulars of the disputed transaction are as follows: Date of transaction: 2026-09-02, Amount: Rs. 50, Beneficiary UPI: 9352478931@paytm, Suspect Phone: 9352478931. " +
  "3. That I have not shared my credentials, PIN, or OTP with any person. " +
  "Yours faithfully, Ashutosh Kumar, Phone: 9193524789. " +
  "Acknowledgement to be provided by the Bank: Received the above letter on [Date]. Signature of Bank Official with Stamp.";

const words = (x: string) => (x.toLowerCase().match(/[a-z0-9]+/g) || []).join(" ");

describe("reflow", () => {
  const out = reflow(BLOB);
  const blocks = parseLetter(BLOB);
  const kinds = blocks.map((b) => b.kind);

  it("breaks a run-on letter into lines", () => {
    expect(out.split("\n").length).toBeGreaterThan(12);
  });

  it("recovers the addressee block", () => {
    const addr = blocks.find((b) => b.kind === "address");
    expect(addr && "lines" in addr && addr.lines[0]).toBe("The Branch Manager");
  });

  it("recovers the subject, salutation and sign-off", () => {
    expect(kinds).toContain("subject");
    expect(kinds).toContain("salutation");
    expect(kinds).toContain("signature");
  });

  it("recovers all three numbered paragraphs", () => {
    const nums = blocks.filter((b) => b.kind === "numbered");
    expect(nums.map((n) => ("marker" in n ? n.marker : ""))).toEqual(["1.", "2.", "3."]);
  });

  it("turns the particulars run into an aligned table", () => {
    const kv = blocks.find((b) => b.kind === "kv");
    expect(kv && "rows" in kv && kv.rows.map((r) => r[0])).toEqual([
      "Date of transaction",
      "Amount",
      "Beneficiary UPI",
      "Suspect Phone",
    ]);
  });

  it("boxes the acknowledgement", () => {
    expect(kinds).toContain("box");
  });

  it("leaves a well-formed document untouched", () => {
    const good = "To,\nThe SHO\n\nDate: 1 Jan\n\nSubject: X\n\nSir / Madam,\n\n1. One.\n\n2. Two.\n\nYours faithfully,\n\nA";
    expect(reflow(good)).toBe(good);
  });

  it("never loses, reorders or invents a word", () => {
    expect(words(reflow(BLOB))).toBe(words(BLOB));
  });

  it("keeps the signature block when a placeholder mentions acknowledgement", () => {
    // The NCRP placeholder contains the word "acknowledgement", which a greedy
    // heading rule once matched — eating the rest of the paragraph and the
    // entire sign-off with it.
    const withPlaceholder =
      "1. That I reported it under acknowledgement number [NCRP Acknowledgement Number]. " +
      "Yours faithfully, Ashutosh Kumar, Phone: 9193524789. " +
      "Acknowledgement to be provided by the Bank: Received on ______ .";
    const out = reflow(withPlaceholder);
    expect(words(out)).toBe(words(withPlaceholder));
    expect(out).toMatch(/Yours faithfully,/);
    const blocks = parseLetter(withPlaceholder);
    expect(blocks.map((b) => b.kind)).toContain("signature");
  });

  it("survives empty input", () => {
    expect(reflow("")).toBe("");
  });
});
