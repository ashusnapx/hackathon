import { describe, expect, it } from "vitest";

import { STEP_SPLIT } from "../StepText";

/**
 * The splitter decides what becomes a link, what becomes a button, and what
 * stays as prose.
 *
 * It imports the real expression rather than rebuilding it. The first version
 * of this file wrote its own copy of the regex, passed every assertion, and
 * missed that the component's had one backslash too many in every escape — so
 * every step on screen showed a literal `**bold**` and `[[doc]]` while the
 * suite stayed green.
 */
const parts = (text: string) => text.split(STEP_SPLIT).filter((p) => p !== "");

describe("what a step turns into", () => {
  it("pulls out a government address so it can be a link", () => {
    expect(parts("Open cybercrime.gov.in and start a new complaint."))
      .toEqual(["Open ", "cybercrime.gov.in", " and start a new complaint."]);
  });

  it("pulls out the emphasis so it can be bolded", () => {
    expect(parts("Choose the **financial fraud** category"))
      .toEqual(["Choose the ", "**financial fraud**", " category"]);
  });

  it("pulls out the document marker so it can be a button", () => {
    expect(parts("Copy **the letter we wrote** for your bank: [[doc]]"))
      .toEqual(["Copy ", "**the letter we wrote**", " for your bank: ", "[[doc]]"]);
  });

  it("does not linkify a domain nobody was told to visit", () => {
    // The allowlist is the point. Auto-linking anything domain-shaped in a
    // string a third party will translate is how somebody else's link ends up
    // rendered inside our own instructions.
    expect(parts("Never go to attacker.example.com")).toEqual(["Never go to attacker.example.com"]);
  });

  it("does not treat a dot as a wildcard", () => {
    // "cybercrimeXgovXin" must not match. An unescaped dot in the domain list
    // would linkify a lookalike, on a screen whose whole job is telling people
    // which sites are the real ones.
    expect(parts("beware cybercrimeXgovXin")).toEqual(["beware cybercrimeXgovXin"]);
  });

  it("leaves an ordinary sentence alone", () => {
    expect(parts("Ask for a free copy of the FIR.")).toEqual(["Ask for a free copy of the FIR."]);
  });
});
