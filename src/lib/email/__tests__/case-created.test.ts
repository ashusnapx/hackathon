import { describe, expect, it } from "vitest";

import { caseCreatedHtml, caseCreatedSubject, caseCreatedText } from "../case-created";
import { emailAppPassword, emailConfigured, emailUser } from "../config";

const base = { ref: "KVC-2A7F-4B91", caseId: "018f47a6-9c2e-7b11-8e32-123456789abc" };

describe("case-created email", () => {
  it("leads with the reference and links to the case", () => {
    const html = caseCreatedHtml(base);
    expect(caseCreatedSubject(base)).toContain("KVC-2A7F-4B91");
    expect(html).toContain("KVC-2A7F-4B91");
    expect(html).toContain(`/case/${base.caseId}`);
  });

  it("says plainly that nothing has been filed", () => {
    expect(caseCreatedHtml(base)).toContain("Nothing has been filed");
    expect(caseCreatedText(base)).toMatch(/Nothing has been filed/);
  });

  it("puts 1930 and the bank first only when money moved", () => {
    const financial = caseCreatedText({ ...base, financial: true });
    expect(financial).toMatch(/1\. Call 1930/);
    expect(financial).toMatch(/Write to your bank/);
    expect(caseCreatedText(base)).not.toMatch(/Call 1930/);
  });

  it("never promises a freeze or a refund", () => {
    const financial = caseCreatedHtml({ ...base, financial: true, amountInr: 25000 });
    expect(financial).toMatch(/cannot guarantee a freeze or a refund/);
    expect(financial).toContain("₹25,000");
  });

  it("escapes a category that arrived with markup in it", () => {
    const html = caseCreatedHtml({ ...base, category: '<img src=x onerror="alert(1)">' });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("warns against sharing a secret, in both parts", () => {
    expect(caseCreatedHtml(base)).toMatch(/Never share an OTP/);
    expect(caseCreatedText(base)).toMatch(/Never share an OTP/);
  });
});

describe("reading the Gmail app password however it was pasted in", () => {
  it("accepts either variable name", () => {
    // The code read only GMAIL_APP_PASSWORD, so a deployment that had set
    // GMAIL_APP_PASS reported email as "not configured" with the credential
    // sitting right there.
    expect(emailAppPassword({ GMAIL_APP_PASSWORD: "abcdefghijklmnop" })).toBe("abcdefghijklmnop");
    expect(emailAppPassword({ GMAIL_APP_PASS: "abcdefghijklmnop" })).toBe("abcdefghijklmnop");
  });

  it("strips the display spaces Google shows the password in", () => {
    // "abcd efgh ijkl mnop" is how the password is displayed; sent verbatim it
    // is 19 characters and Gmail rejects it with an error mentioning neither.
    expect(emailAppPassword({ GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" })).toBe("abcdefghijklmnop");
    expect(emailAppPassword({ GMAIL_APP_PASSWORD: "  abcd\tefgh ijkl mnop \n" })).toBe("abcdefghijklmnop");
  });

  it("reports nothing configured when nothing is set", () => {
    // This used to fall back to a mailbox and app password hardcoded in the
    // repository, so that a deployment whose variables never arrived would
    // still send. That hid the misconfiguration it was meant to survive — and
    // a password in a repository is public, so it was spent from the day it
    // was committed. Missing configuration is now reported as missing.
    expect(emailAppPassword({})).toBeNull();
    expect(emailUser({})).toBeNull();
    expect(emailConfigured({})).toBe(false);
  });

  it("keeps no credential of its own", async () => {
    // A guard, not a formality: this is the file a credential gets pasted into
    // when somebody is in a hurry, and it is the file everybody can read.
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../config.ts", import.meta.url), "utf8"),
    );
    // A Google app password is sixteen lowercase letters.
    expect(source).not.toMatch(/["'][a-z]{16}["']/);
    expect(source).not.toMatch(/@gmail\.com/);
  });

  it("lets the environment win, and lets a blank value switch it off", () => {
    expect(emailAppPassword({ GMAIL_APP_PASSWORD: "zzzzzzzzzzzzzzzz" })).toBe("zzzzzzzzzzzzzzzz");
    expect(emailUser({ GMAIL_USER: "someone@else.com" })).toBe("someone@else.com");
    // Explicitly blank is a decision, unlike absent, and is honoured as one.
    expect(emailAppPassword({ GMAIL_APP_PASSWORD: "   " })).toBeNull();
    expect(emailUser({ GMAIL_USER: "" })).toBeNull();
    expect(emailConfigured({ GMAIL_USER: "" })).toBe(false);
  });
});
