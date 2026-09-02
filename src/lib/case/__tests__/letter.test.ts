import { describe, expect, it } from "vitest";
import { parseLetter } from "../letter";

const FIR = `To,
The Station House Officer
Pune Cyber Crime Police Station
Pune, Maharashtra

Date: 02 September 2026

Subject: Application for registration of a First Information Report in respect of
         a cognizable offence of cyber fraud

Sir / Madam,

I, Sunita Deshmukh, aged ___ years, respectfully submit as follows.

1. On 01 September 2026 at 07:35 pm I was the victim of OTP fraud.

2. The particulars of the disputed transaction are:
   Amount: Rs. 85,000
   Transaction reference: 402312345678
   Beneficiary UPI ID: 9876543210@ybl

3. I therefore pray that this Hon'ble office be pleased to:
   a. register a First Information Report on the basis of this application;
   b. issue me a free copy of the First Information Report as required by law.

Yours faithfully,

(Sunita Deshmukh)
Mobile: 9820011223

FOR OFFICE USE
Received on ______________ at ______________ hrs
Diary / FIR number ______________________`;

describe("parseLetter", () => {
  const blocks = parseLetter(FIR);
  const kinds = blocks.map((b) => b.kind);

  it("recognises the addressee block and stops at the blank line", () => {
    const addr = blocks.find((b) => b.kind === "address");
    expect(addr).toBeDefined();
    expect(addr && "lines" in addr && addr.lines).toEqual([
      "The Station House Officer",
      "Pune Cyber Crime Police Station",
      "Pune, Maharashtra",
    ]);
  });

  it("joins a subject line that wraps across source lines", () => {
    const s = blocks.find((b) => b.kind === "subject");
    expect(s && "text" in s && s.text).toBe(
      "Application for registration of a First Information Report in respect of a cognizable offence of cyber fraud",
    );
  });

  it("keeps Date as meta rather than prose", () => {
    expect(kinds).toContain("meta");
  });

  it("finds the salutation and the signature block", () => {
    expect(kinds).toContain("salutation");
    const sig = blocks.find((b) => b.kind === "signature");
    expect(sig && "lines" in sig && sig.lines).toEqual([
      "Yours faithfully,",
      "(Sunita Deshmukh)",
      "Mobile: 9820011223",
    ]);
  });

  it("numbers paragraphs and nests lettered sub-items deeper", () => {
    const nums = blocks.filter((b) => b.kind === "numbered");
    expect(nums.map((n) => "marker" in n && n.marker)).toEqual(["1.", "2.", "3.", "a.", "b."]);
    const a = nums.find((n) => "marker" in n && n.marker === "a.");
    expect(a && "depth" in a && a.depth).toBeGreaterThan(0);
  });

  it("reads an indented run of Label: value as a table", () => {
    const kv = blocks.find((b) => b.kind === "kv");
    expect(kv && "rows" in kv && kv.rows).toEqual([
      ["Amount", "Rs. 85,000"],
      ["Transaction reference", "402312345678"],
      ["Beneficiary UPI ID", "9876543210@ybl"],
    ]);
  });

  it("boxes the office-use block", () => {
    const box = blocks.find((b) => b.kind === "box");
    expect(box && "title" in box && box.title).toBe("FOR OFFICE USE");
  });

  it("never invents or drops content it cannot classify", () => {
    const plain = parseLetter("Just one ordinary sentence with no structure at all.");
    expect(plain).toEqual([{ kind: "para", text: "Just one ordinary sentence with no structure at all." }]);
  });

  it("survives empty input", () => {
    expect(parseLetter("")).toEqual([]);
  });
});
