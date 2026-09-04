import { describe, expect, it } from "vitest";
import { emptyDraft, type ReportDraft } from "../draft";
import { reportDraftToCase } from "../handoff";

function draft(overrides: Partial<ReportDraft> = {}): ReportDraft {
  return { ...emptyDraft(), ...overrides };
}

describe("report form handoff", () => {
  it("refuses to create routing data without a recognised category", () => {
    expect(reportDraftToCase(draft({ categoryId: undefined }), "en")).toBeNull();
    expect(reportDraftToCase(draft({ categoryId: "not-in-taxonomy" }), "en")).toBeNull();
  });

  it("carries reviewed facts and extracted identifiers into the case", () => {
    const result = reportDraftToCase(
      draft({
        categoryId: "financial-fraud",
        subcategoryId: "upi",
        narrative: "I approved a transfer after a caller deceived me.",
        platform: " WhatsApp ",
        amount: 12_500,
        pastedText: "UTR 123456789012 and the original chat text",
        suspectIds: [
          { kind: "ref", value: " 123456789012 " },
          { kind: "ref", value: "123456789012" },
          { kind: "upi", value: "fraudster@upi" },
          { kind: "phone", value: "+919876543210" },
          { kind: "email", value: "sender@example.com" },
        ],
        files: [{ name: "chat.png", type: "image/png", size: 456_789 }],
      }),
      "hi",
      new Date("2026-09-04T12:00:00.000Z"),
    );

    expect(result?.triage).toMatchObject({
      categoryId: "financial-fraud",
      subcategoryId: "upi",
      confidence: 1,
      amount: 12_500,
      incidentAt: undefined,
      urgency: "moderate",
    });
    expect(result?.triage?.applicableTracks).toContain("bank-notice");
    expect(result?.entities).toMatchObject({
      refs: ["123456789012"],
      upiIds: ["fraudster@upi"],
      phones: ["+919876543210"],
      emails: ["sender@example.com"],
      apps: ["WhatsApp"],
    });
    expect(result?.suspect?.upiIds).toEqual(["fraudster@upi"]);
    expect(result?.evidenceText).toBe("UTR 123456789012 and the original chat text");
    expect(result?.files).toEqual([{ name: "chat.png", type: "image/png", size: 456_789 }]);
  });

  it("uses only a valid supplied incident time and never manufactures one", () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const recent = reportDraftToCase(
      draft({ categoryId: "financial-fraud", incidentAt: "2026-09-04T11:30:00.000Z" }),
      "en",
      now,
    );
    const invalid = reportDraftToCase(
      draft({ categoryId: "financial-fraud", incidentAt: "not-a-date" }),
      "en",
      now,
    );

    expect(recent?.incidentAt).toBe("2026-09-04T11:30:00.000Z");
    expect(recent?.triage?.urgency).toBe("critical");
    expect(invalid?.incidentAt).toBeUndefined();
    expect(invalid?.triage?.incidentAt).toBeUndefined();
    expect(invalid?.triage?.urgency).toBe("moderate");
  });

  it("drops a subcategory that does not belong to the confirmed category", () => {
    const result = reportDraftToCase(
      draft({ categoryId: "social-media", subcategoryId: "upi" }),
      "en",
    );
    expect(result?.triage?.subcategoryId).toBeUndefined();
  });

  it("carries the completed safety gate's child context into the case", () => {
    const result = reportDraftToCase(
      draft({ categoryId: "women-child", subcategoryId: "harassment" }),
      "en",
      new Date("2026-09-04T12:00:00.000Z"),
      { ageContext: "child-other" },
    );
    expect(result?.victim?.ageContext).toBe("child-other");
  });
});
