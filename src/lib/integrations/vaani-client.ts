/**
 * Browser-side handle to a voice call.
 *
 * The intake page opens the call; the case page shows what came back. Both need
 * the same capability, so the key and its shape live here rather than being
 * spelled out twice. Only an opaque, server-issued token is stored — never a
 * provider id, a room name, or anything a caller said.
 */

export const VAANI_SESSION_KEY = "kavach.vaani.request.v1";

export type StoredVaaniSession = {
  version: 1;
  requestId: string;
  state: "calling" | "requested" | "unknown" | "accepted" | "blocked";
  transcriptToken?: string;
  createdAt: string;
};

export function readStoredVaaniSession(): StoredVaaniSession | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(VAANI_SESSION_KEY) || "null") as Partial<StoredVaaniSession> | null;
    if (
      parsed?.version !== 1
      || typeof parsed.requestId !== "string"
      || !["calling", "requested", "unknown", "accepted", "blocked"].includes(parsed.state || "")
      || typeof parsed.createdAt !== "string"
      || (parsed.transcriptToken !== undefined && typeof parsed.transcriptToken !== "string")
    ) {
      return null;
    }
    return parsed as StoredVaaniSession;
  } catch {
    return null;
  }
}

export function canPersistVaaniSession(): boolean {
  if (typeof window === "undefined") return false;
  const probe = `${VAANI_SESSION_KEY}.probe`;
  try {
    sessionStorage.setItem(probe, "1");
    sessionStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function writeStoredVaaniSession(session: StoredVaaniSession): boolean {
  try {
    sessionStorage.setItem(VAANI_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredVaaniSession(): void {
  try {
    sessionStorage.removeItem(VAANI_SESSION_KEY);
  } catch {
    // Storage may be disabled; there is nothing else to clear in the browser.
  }
}
