import { describe, expect, it } from "vitest";

import { buildDemoCase, DEMO_CASE_ID, DEMO_CASE_PATH } from "../case";
import call from "../call.json";
import { getEvidence } from "@/lib/case/evidence";

describe("the sample case behind the link on the home page", () => {
  it("carries what the call actually established", () => {
    const c = buildDemoCase();

    expect(c.victim.name).toBe("Pranav");
    expect(c.amount).toBe(10_000);
    expect(c.triage?.categoryId).toBe("financial-fraud");
    expect(c.triage?.applicableTracks.length).toBeGreaterThan(0);
    expect(c.incidentAt?.slice(0, 10)).toBe("2026-09-03");
    expect(c.evidenceText).toMatch(/[Ss]creenshot/);
    expect(c.voiceCall?.demoCallId).toBe(call.callId);
  });

  it("quotes only the caller, never the agent's questions", () => {
    const statement = buildDemoCase().rawStatement;
    expect(statement).toMatch(/I am facing a online fraud/);
    expect(statement).not.toMatch(/Kavach Saathi/);
    expect(statement).not.toMatch(/what may I call you/i);
  });

  it("does not present a field the agent could not fill as a fact", () => {
    // suspect_email came back as the literal string "unknown".
    expect(call.extracted.suspect_email).toBe("unknown");
    expect(buildDemoCase().entities.emails).toEqual([]);
    expect(buildDemoCase().suspect.upiIds).toEqual([]);
  });

  it("marks only the evidence the caller said out loud that they hold", () => {
    const held = getEvidence(buildDemoCase())
      .filter((item) => item.status === "added")
      .map((item) => item.id)
      .sort();
    expect(held).toEqual(["email_correspondence", "txn_screenshot"]);
  });

  it("reads identically on every device, so the link is stable", () => {
    expect(JSON.stringify(buildDemoCase())).toBe(JSON.stringify(buildDemoCase()));
    expect(buildDemoCase().id).toBe(DEMO_CASE_ID);
    expect(DEMO_CASE_PATH).toBe(`/case/${DEMO_CASE_ID}`);
  });
});
