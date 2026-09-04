import { describe, expect, it } from "vitest";
import { evidenceCaseLockName, evidenceStorageKey, sha256Hex } from "../evidence-store";

describe("local evidence storage primitives", () => {
  it("uses a deterministic per-case, per-checklist key", () => {
    expect(evidenceStorageKey("case-123", "bank_statement", "version-1")).toBe("case-123:bank_statement:version-1");
    expect(evidenceStorageKey("case-123", "bank_statement", "version-2"))
      .not.toBe(evidenceStorageKey("case-123", "bank_statement", "version-1"));
  });

  it("scopes the cross-tab evidence lock to one case", () => {
    expect(evidenceCaseLockName("case-123")).toBe("kavach:evidence:case-123");
    expect(evidenceCaseLockName("case-123")).not.toBe(evidenceCaseLockName("case-456"));
  });

  it("creates the standard SHA-256 fingerprint for the exact bytes", async () => {
    const bytes = new TextEncoder().encode("abc").buffer;
    await expect(sha256Hex(bytes)).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
