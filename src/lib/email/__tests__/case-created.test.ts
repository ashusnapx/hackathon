import { describe, expect, it } from "vitest";

import { caseCreatedHtml, caseCreatedSubject, caseCreatedText } from "../case-created";

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
