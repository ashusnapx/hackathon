import { describe, expect, it } from "vitest";
import { emptyIntake } from "../interview";
import { INTAKE_STORAGE_KEY, loadIntakeDraft, saveIntakeDraft } from "../persistence";

describe("guided intake persistence", () => {
  it("reports an unavailable store instead of claiming the interview was saved", () => {
    const unavailable = {
      getItem() { throw new DOMException("blocked", "SecurityError"); },
      setItem() { throw new DOMException("full", "QuotaExceededError"); },
    };
    expect(loadIntakeDraft(unavailable)).toEqual({ available: false, draft: null });
    expect(saveIntakeDraft(unavailable, emptyIntake())).toBe(false);
  });

  it("round-trips a valid draft and ignores corrupt old JSON", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem(key: string) { return values.get(key) ?? null; },
      setItem(key: string, value: string) { values.set(key, value); },
    };
    const draft = { ...emptyIntake("voice"), narrative: "A reviewed account" };
    expect(saveIntakeDraft(storage, draft)).toBe(true);
    expect(loadIntakeDraft(storage).draft).toMatchObject({ channel: "voice", narrative: "A reviewed account" });

    values.set(INTAKE_STORAGE_KEY, "{broken");
    expect(loadIntakeDraft(storage)).toEqual({ available: true, draft: null });
  });
});
