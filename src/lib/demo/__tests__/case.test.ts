import { describe, expect, it } from "vitest";

import { buildDemoCase, DEMO_CASE_ID, DEMO_CASE_PATH } from "../case";
import call from "../call.json";
import { getEvidence } from "@/lib/case/evidence";
import { liveTracks } from "@/lib/case/tracks";

/** A fixed "now", so every assertion about the calendar is deterministic. */
const NOW = new Date("2026-09-07T09:00:00.000Z");

describe("the sample case behind the link on the home page", () => {
  it("carries what the call actually established", () => {
    const c = buildDemoCase(NOW);

    expect(c.victim.name).toBe("Pranav");
    expect(c.amount).toBe(10_000);
    expect(c.triage?.categoryId).toBe("financial-fraud");
    expect(c.triage?.applicableTracks.length).toBeGreaterThan(0);
    expect(c.evidenceText).toMatch(/[Ss]creenshot/);
    expect(c.voiceCall?.demoCallId).toBe(call.callId);
  });

  it("places the incident where the caller put it — two days before reading", () => {
    const c = buildDemoCase(NOW);

    expect(c.incidentAt?.slice(0, 10)).toBe("2026-09-05");
    // The triage carries the same date, or the Overview and the clocks disagree.
    expect(c.triage?.incidentAt).toBe(c.incidentAt);
    expect(c.txns[0]?.at).toBe(c.incidentAt);
    expect(c.createdAt).toBe(NOW.toISOString());
  });

  it("opens with deadlines that are still running, not lapsed", () => {
    const tracks = liveTracks(buildDemoCase(NOW), NOW);
    // The point of the sample is a plan in motion. If every clock on it has
    // already run out, it demonstrates nothing a screenshot could not.
    expect(tracks.some((t) => t.state === "due" || t.state === "upcoming")).toBe(true);
    expect(tracks.every((t) => t.state === "missed")).toBe(false);
  });

  it("arrives with its drafts already written, needing no API call", () => {
    const c = buildDemoCase(NOW);

    expect(c.docs.generatedBy).toBe("rules");
    expect(c.docs.generatedAt).toBe(NOW.toISOString());
    expect(c.docs.ncrp).toBeTruthy();
    expect(c.docs.script).toContain("1930");
    // The drafts must quote the case, not a template's placeholder person.
    expect(c.docs.ncrp).toContain("10,000");
  });

  it("tells one date for the incident, including inside the agent's narrative", () => {
    const c = buildDemoCase(NOW);
    const recorded = call.extracted.incident_timing as string;

    // The provider dated its chronology to the day it was recorded. If that
    // survives anywhere, the sample prints two different dates for the same
    // transaction on a police complaint.
    expect(c.triage?.englishNarrative).toContain("2026-09-05");
    expect(JSON.stringify(c)).not.toContain(recorded);
  });

  it("quotes only the caller, never the agent's questions", () => {
    const statement = buildDemoCase(NOW).rawStatement;
    expect(statement).toMatch(/I am facing a online fraud/);
    expect(statement).not.toMatch(/Kavach Saathi/);
    expect(statement).not.toMatch(/what may I call you/i);
  });

  it("does not present a field the agent could not fill as a fact", () => {
    // suspect_email came back as the literal string "unknown".
    expect(call.extracted.suspect_email).toBe("unknown");
    expect(buildDemoCase(NOW).entities.emails).toEqual([]);
    expect(buildDemoCase(NOW).suspect.upiIds).toEqual([]);
  });

  it("never invents the bank alert the three-working-day rule runs from", () => {
    // The caller never said when their bank's message reached them, so the
    // sample must not supply a date that would make that clock look answered.
    expect(buildDemoCase(NOW).bankAlertAt).toBeUndefined();
  });

  it("marks only the evidence the caller said out loud that they hold", () => {
    const held = getEvidence(buildDemoCase(NOW))
      .filter((item) => item.status === "added")
      .map((item) => item.id)
      .sort();
    expect(held).toEqual(["email_correspondence", "txn_screenshot"]);
  });

  it("reads identically on every device given the same moment", () => {
    expect(JSON.stringify(buildDemoCase(NOW))).toBe(JSON.stringify(buildDemoCase(NOW)));
    expect(buildDemoCase(NOW).id).toBe(DEMO_CASE_ID);
    expect(DEMO_CASE_PATH).toBe(`/case/${DEMO_CASE_ID}`);
  });
});
