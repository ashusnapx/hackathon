import { describe, expect, it } from "vitest";
import {
  SUSPECT_REPO_BOOKMARKLET,
  repoCopyAll,
  repoLabel,
  repoValue,
} from "@/lib/check/suspect-repo";

describe("suspect-repo bridge", () => {
  it("strips +91 the way the portal demands", () => {
    expect(repoValue({ kind: "phone", value: "+919812345670" })).toBe("9812345670");
    expect(repoValue({ kind: "phone", value: "9812345670" })).toBe("9812345670");
    expect(repoValue({ kind: "upi", value: "refund.amazon@okpay" })).toBe("refund.amazon@okpay");
  });

  it("labels identifiers in the repository's own language", () => {
    expect(repoLabel("phone")).toBe("Mobile");
    expect(repoLabel("upi")).toBe("UPI ID");
    expect(repoLabel("account")).toBe("Bank Account Number");
    expect(repoLabel("email")).toBe("E-mail");
    expect(repoLabel("handle")).toBe("Social Media");
  });

  it("formats a paste-ready block", () => {
    const out = repoCopyAll([
      { kind: "phone", value: "+919812345670" },
      { kind: "upi", value: "x@ybl" },
    ]);
    expect(out).toBe("Mobile: 9812345670\nUPI ID: x@ybl");
  });

  it("bookmarklet targets the verified gov form fields and stays one line", () => {
    expect(SUSPECT_REPO_BOOKMARKLET.startsWith("javascript:")).toBe(true);
    expect(SUSPECT_REPO_BOOKMARKLET).not.toMatch(/[\n\r]/);
    for (const id of [
      "ContentPlaceHolder1_rblMeasurementSystem_",
      "ContentPlaceHolder1_idverify",
      "ContentPlaceHolder1_txtcapcha",
    ]) {
      expect(SUSPECT_REPO_BOOKMARKLET).toContain(id);
    }
    // No line comments: they would eat the payload in a javascript: URL.
    expect(SUSPECT_REPO_BOOKMARKLET).not.toContain("//");
    // Never .click() the type radios: their handler posts the form back and
    // a reload would kill the bookmarklet mid-run. Selection is programmatic.
    expect(SUSPECT_REPO_BOOKMARKLET).not.toContain(".click()");
  });
});
