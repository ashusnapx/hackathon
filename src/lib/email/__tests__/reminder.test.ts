import { describe, expect, it } from "vitest";

import { reminderHtml, reminderSubject, reminderText } from "../reminder";

const base = {
  ref: "KVC-2A7F-4B91",
  caseId: "018f47a6-9c2e-7b11-8e32-123456789abc",
  step: "Write to your own bank",
  due: "Within 3 working days",
};

describe("the reminder email", () => {
  it("names the step in the subject, so it is legible on a lock screen", () => {
    expect(reminderSubject(base)).toContain("Write to your own bank");
    expect(reminderSubject(base)).toContain("KVC-2A7F-4B91");
  });

  it("says a route is closing only when it actually closes", () => {
    // Most of the ten steps are urgent without being time-barred. Telling
    // somebody a date is fatal when it is not is a lie they will find the
    // first time they check, and it costs every later warning its weight.
    expect(reminderSubject(base)).not.toMatch(/last day/i);
    expect(reminderSubject({ ...base, closing: true })).toMatch(/last day/i);
    expect(reminderHtml({ ...base, closing: true })).toMatch(/last day/i);
  });

  it("never claims anything was filed", () => {
    for (const body of [reminderText(base), reminderHtml(base)]) {
      expect(body).toMatch(/Nothing has been filed/);
      expect(body).not.toMatch(/we have (filed|submitted|reported)/i);
    }
  });

  it("links to the case rather than carrying its contents", () => {
    const html = reminderHtml(base);
    expect(html).toContain(`/case/${base.caseId}`);
    // Email is forwarded, printed and read on shared phones. The reference is
    // the only case detail that travels; the facts stay behind the link.
    expect(html).not.toMatch(/narrative|transcript|account number/i);
  });

  it("escapes a step that arrived with markup in it", () => {
    const html = reminderHtml({ ...base, step: '<img src=x onerror="alert(1)">' });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("tells the person how to stop it", () => {
    expect(reminderText(base)).toMatch(/mark it done/i);
    expect(reminderHtml(base)).toMatch(/mark it done/i);
  });
});
