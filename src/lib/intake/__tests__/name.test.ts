import { describe, expect, it } from "vitest";

import { firstName, properName } from "../name";

describe("writing a name the way somebody would write it", () => {
  it("fixes the case a phone keyboard left behind", () => {
    expect(properName("ashutosh kumar")).toBe("Ashutosh Kumar");
    expect(properName("MEERA NAIR")).toBe("Meera Nair");
    expect(properName("  rajesh   verma  ")).toBe("Rajesh Verma");
  });

  it("leaves initials alone", () => {
    // "Rk Nair" is not a name anybody has. South Indian names carry initials
    // far more often than Western ones, so this is not an edge case here.
    expect(properName("RK Nair")).toBe("RK Nair");
    expect(properName("K. Ashutosh")).toBe("K. Ashutosh");
    expect(properName("A P J Abdul Kalam")).toBe("A P J Abdul Kalam");
  });

  it("treats a hyphen or an apostrophe as the start of a word", () => {
    expect(properName("ram-kumar")).toBe("Ram-Kumar");
    expect(properName("d'souza")).toBe("D'Souza");
  });

  it("does not touch a script that has no case", () => {
    expect(properName("अशुतोष कुमार")).toBe("अशुतोष कुमार");
    expect(properName("மீரா")).toBe("மீரா");
  });
});

describe("what to call somebody", () => {
  it("uses the given name", () => {
    expect(firstName("ashutosh kumar")).toBe("Ashutosh");
    expect(firstName("MEERA NAIR")).toBe("Meera");
  });

  it("skips a leading initial rather than greeting somebody as 'K.'", () => {
    expect(firstName("K. Ashutosh")).toBe("Ashutosh");
    expect(firstName("A P J Abdul Kalam")).toBe("Abdul");
  });

  it("falls back to the first part when every part is an initial", () => {
    expect(firstName("R K")).toBe("R");
  });

  it("has nothing to say about an empty name", () => {
    expect(firstName("   ")).toBe("");
  });
});
