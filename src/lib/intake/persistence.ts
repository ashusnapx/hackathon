import { emptyIntake, type IntakeDraft } from "./interview";

export const INTAKE_STORAGE_KEY = "kavach.intake.v1";

type IntakeStorage = Pick<Storage, "getItem" | "setItem">;

export function loadIntakeDraft(storage: IntakeStorage): { available: boolean; draft: IntakeDraft | null } {
  let raw: string | null;
  try {
    raw = storage.getItem(INTAKE_STORAGE_KEY);
  } catch {
    return { available: false, draft: null };
  }
  if (!raw) return { available: true, draft: null };
  try {
    const saved = JSON.parse(raw) as IntakeDraft;
    if (saved?.version !== 1 || typeof saved.narrative !== "string") {
      return { available: true, draft: null };
    }
    return {
      available: true,
      draft: { ...emptyIntake(saved.channel), ...saved },
    };
  } catch {
    // Corrupt old data does not mean new writes are unavailable.
    return { available: true, draft: null };
  }
}

export function saveIntakeDraft(storage: IntakeStorage, draft: IntakeDraft): boolean {
  try {
    storage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Acquire the browser storage object inside the try: its getter can throw in an opaque origin. */
export function loadBrowserIntakeDraft(): { available: boolean; draft: IntakeDraft | null } {
  try {
    return loadIntakeDraft(globalThis.localStorage);
  } catch {
    return { available: false, draft: null };
  }
}

export function saveBrowserIntakeDraft(draft: IntakeDraft): boolean {
  try {
    return saveIntakeDraft(globalThis.localStorage, draft);
  } catch {
    return false;
  }
}
