/**
 * The key that unlocks one case, and nothing else.
 *
 * Kavach has no accounts on purpose: somebody in the middle of losing money
 * should not have to invent a password before they can describe it. So a case
 * is not owned by a user, it is held by whoever has its key — 256 bits made in
 * the browser, kept beside the case, and put in the share link's fragment so it
 * never travels in a request line or a referrer.
 *
 * The server stores only the SHA-256 of that key. It can therefore check a
 * claim without ever being able to make one, and a copy of the database is a
 * list of hashes rather than a set of case files anybody can open.
 */

export const CASE_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const CASE_KEY_HASH_PATTERN = /^[0-9a-f]{64}$/;

const KEY_STORE = "kavach.case-keys.v1";

export function newCaseKey(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

/** Runs in the browser and on the server; both have WebCrypto. */
export async function caseKeyHash(key: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function readAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY_STORE) || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string" && CASE_KEY_PATTERN.test(value)),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeAll(keys: Record<string, string>): void {
  try {
    localStorage.setItem(KEY_STORE, JSON.stringify(keys));
  } catch {
    // Without storage the case still works on this screen; it just cannot be
    // reopened elsewhere, which is what the sync status tells the person.
  }
}

export function readCaseKey(id: string): string | null {
  return readAll()[id] ?? null;
}

export function rememberCaseKey(id: string, key: string): void {
  if (!CASE_KEY_PATTERN.test(key)) return;
  writeAll({ ...readAll(), [id]: key });
}

/** The key for this case, made once and kept. */
export function ensureCaseKey(id: string): string {
  const existing = readCaseKey(id);
  if (existing) return existing;
  const key = newCaseKey();
  rememberCaseKey(id, key);
  return key;
}

export function forgetCaseKey(id: string): void {
  const keys = readAll();
  if (!(id in keys)) return;
  delete keys[id];
  writeAll(keys);
}

/**
 * The link a person can send themselves.
 *
 * The key rides in the fragment, which browsers never put on the wire: it does
 * not reach our logs, the CDN's, or whatever site they clicked away to.
 */
export function caseShareLink(origin: string, id: string, key: string): string {
  return `${origin}/case/${encodeURIComponent(id)}#k=${key}`;
}

/**
 * Take the key out of the address bar once it has been stored.
 *
 * Leaving it there means it turns up in a screenshot of the browser, in a
 * bookmark, or in the tab title read aloud over a shared screen.
 */
export function takeKeyFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/(?:^#|&)k=([A-Za-z0-9_-]{43})(?:&|$)/);
  if (!match) return null;
  const key = match[1];
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch {
    // Not fatal: the key is already in hand.
  }
  return key;
}
