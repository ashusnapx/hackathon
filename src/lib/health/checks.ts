import demoCall from "@/lib/demo/call.json";
import { verifyEmailTransport } from "@/lib/email/send";
import { database, databaseConfigured } from "@/lib/db/supabase";
import { authConfig } from "@/lib/auth/config";
import {
  HEALTH_CACHE_TTL_MS,
  isFresh,
  type HealthReport,
  type ServiceHealth,
  type ServiceReason,
} from "./report";

export * from "./report";

/**
 * Whether the things this product depends on are actually answering.
 *
 * Every one of these is checked by using it, not by asking whether a variable
 * is set. A key that is present and revoked looks identical to a working one
 * from the outside, and the moment that matters is a person describing a fraud
 * out loud — not the deploy that shipped the typo.
 *
 * Nothing here reports why something failed. The footer says a service is down
 * and that is all a visitor gets: a status board that leaks a hostname, a
 * provider's error text or which credential expired is reconnaissance.
 */

/**
 * Which of a service's variables did not arrive, and how they failed.
 *
 * The distinction is the whole point. A variable the runtime has never heard of
 * was never delivered — set on the wrong project, or on a shared scope that was
 * never linked, or added after the build that is running. A variable that
 * arrives empty was delivered and saved blank. Those are opposite fixes, and
 * "off" on its own sends people to look in the wrong place for an hour.
 */
function absentees(names: string[]): { name: string; reason: ServiceReason }[] {
  return names
    .map((name) => ({ name, value: process.env[name] }))
    .filter((entry) => !entry.value?.trim())
    .map(({ name, value }) => ({
      name,
      reason: value === undefined ? "absent" as const : "blank" as const,
    }));
}

/** Long enough for a slow provider, short enough that the footer still paints. */
const PROBE_TIMEOUT_MS = 4_000;

let cached: { at: number; report: HealthReport } | null = null;

async function timed(check: () => Promise<boolean>): Promise<{ ok: boolean; ms: number }> {
  const started = Date.now();
  try {
    return { ok: await check(), ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  }
}

function signal(): AbortSignal {
  return AbortSignal.timeout(PROBE_TIMEOUT_MS);
}

async function checkDatabase(): Promise<ServiceHealth> {
  if (!databaseConfigured()) {
    return { id: "database", state: "off", ms: null, missing: absentees(["SUPABASE_URL", "SUPABASE_SECRET_KEY"]) };
  }
  const { ok, ms } = await timed(async () => {
    // Counts rows without reading one: proves the connection, the credential
    // and the table, and returns nothing that belongs to anybody.
    const { error } = await database()
      .from("cases")
      .select("id", { count: "exact", head: true })
      .limit(1);
    return !error;
  });
  return { id: "database", state: ok ? "up" : "down", ms };
}

async function checkAi(): Promise<ServiceHealth> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  if (!key) return { id: "ai", state: "off", ms: null };
  const { ok, ms } = await timed(async () => {
    // Listing models costs no tokens and still exercises the key.
    const response = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: signal(),
      cache: "no-store",
    });
    return response.ok;
  });
  return { id: "ai", state: ok ? "up" : "down", ms };
}

async function checkVoice(): Promise<ServiceHealth> {
  const key = process.env.VAANI_API_KEY?.trim();
  if (!key) return { id: "voice", state: "off", ms: null, missing: absentees(["VAANI_API_KEY", "VAANI_AGENT_ID"]) };
  const { ok, ms } = await timed(async () => {
    // The provider publishes no health endpoint and no GET for an agent, so the
    // probe reads the details of the call already committed to this repository:
    // it is idempotent, costs nothing, and fails exactly when a real read would.
    const response = await fetch(
      `https://api.vaanivoice.ai/api/call_details/${encodeURIComponent(demoCall.callId)}`,
      { headers: { "X-API-Key": key }, signal: signal(), cache: "no-store" },
    );
    return response.ok;
  });
  return { id: "voice", state: ok ? "up" : "down", ms };
}

async function checkEmail(): Promise<ServiceHealth> {
  if (!process.env.GMAIL_USER?.trim() || !process.env.GMAIL_APP_PASSWORD?.trim()) {
    return { id: "email", state: "off", ms: null, missing: absentees(["GMAIL_USER", "GMAIL_APP_PASSWORD"]) };
  }
  const { ok, ms } = await timed(verifyEmailTransport);
  return { id: "email", state: ok ? "up" : "down", ms };
}

/**
 * Whether the gate in front of this app is actually standing.
 *
 * Checked by asking Supabase for its auth settings rather than by looking at a
 * variable, for the same reason as everything else here — but it matters more:
 * when this reads "off", the middleware is letting everybody through, and the
 * footer saying so is the difference between knowing that and assuming
 * otherwise.
 */
async function checkAuth(): Promise<ServiceHealth> {
  const config = authConfig();
  if (!config) {
    return {
      id: "auth",
      state: "off",
      ms: null,
      missing: absentees(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
    };
  }
  const { ok, ms } = await timed(async () => {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key },
      signal: signal(),
    });
    return response.ok;
  });
  return { id: "auth", state: ok ? "up" : "down", ms };
}

export async function getHealth(force = false): Promise<HealthReport> {
  if (!force && cached && isFresh(cached.at, Date.now(), HEALTH_CACHE_TTL_MS)) return cached.report;

  // In parallel: the board is only as slow as its slowest dependency, not the
  // sum of them.
  const services = await Promise.all([
    checkDatabase(),
    checkAi(),
    checkVoice(),
    checkEmail(),
    checkAuth(),
  ]);

  const report: HealthReport = { checkedAt: new Date().toISOString(), services };
  cached = { at: Date.now(), report };
  return report;
}

/** Tests only: the cache is process-local and otherwise never cleared. */
export function resetHealthCacheForTests(): void {
  cached = null;
}
