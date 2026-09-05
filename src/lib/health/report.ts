/**
 * The shape of the status board, and the two decisions it makes.
 *
 * Kept apart from the probes themselves so that the summary can be tested
 * without a database, an SMTP handshake and two provider keys — and so the
 * browser can import the types without pulling a server-only module with them.
 */

export type ServiceId = "database" | "ai" | "voice" | "email" | "auth";
export type ServiceState = "up" | "down" | "off";

export interface ServiceHealth {
  id: ServiceId;
  state: ServiceState;
  /** Round trip in milliseconds, for the ones that made a call. */
  ms: number | null;
}

export interface HealthReport {
  checkedAt: string;
  services: ServiceHealth[];
}

export type HealthSummary = "up" | "degraded" | "down" | "idle";

/** A status board that re-probes on every page view is its own outage. */
export const HEALTH_CACHE_TTL_MS = 30_000;

export function isFresh(cachedAt: number, now = Date.now(), ttl = HEALTH_CACHE_TTL_MS): boolean {
  return now - cachedAt >= 0 && now - cachedAt < ttl;
}

/**
 * One word for the whole board.
 *
 * A service nobody configured is not an outage — a build with no email set up
 * is a working build — so "off" never counts against the summary. Nor does an
 * empty board get to call itself healthy: with nothing configured there is
 * nothing to be operational, and saying otherwise is the one answer a status
 * board must never give.
 */
export function summarise(services: ServiceHealth[]): HealthSummary {
  const live = services.filter((service) => service.state !== "off");
  if (!live.length) return "idle";
  const down = live.filter((service) => service.state === "down").length;
  if (!down) return "up";
  return down === live.length ? "down" : "degraded";
}
