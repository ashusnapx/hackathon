import "server-only";

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Shared plumbing for the Vaani routes. The browser is identified only by an
 * opaque, httpOnly cookie scoped to /api/vaani: every capability handed out is
 * bound to it, so a handle copied out of one browser is useless in another.
 */

export const VAANI_SESSION_COOKIE = "kavach_vaani_session";
export const VAANI_SESSION_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface BrowserSession {
  id: string;
  secure: boolean;
}

export function readBrowserSessionId(req: Request): string | null {
  const value = (req.headers.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${VAANI_SESSION_COOKIE}=`))
    ?.slice(VAANI_SESSION_COOKIE.length + 1);
  return value && VAANI_SESSION_PATTERN.test(value) ? value : null;
}

export function getOrCreateBrowserSession(req: Request): BrowserSession {
  const secure = process.env.NODE_ENV === "production" || new URL(req.url).protocol === "https:";
  return { id: readBrowserSessionId(req) || randomBytes(32).toString("base64url"), secure };
}

export function clientIp(req: Request): string {
  // Trustworthy only behind a proxy that overwrites them. A prototype guard,
  // not a production abuse-control boundary.
  return req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown-client";
}

export function json(payload: object, status: number, headers?: Record<string, string>) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", ...headers },
  });
}

export function jsonWithSession(
  payload: object,
  status: number,
  session: BrowserSession,
  headers?: Record<string, string>,
) {
  const response = json(payload, status, headers);
  response.cookies.set({
    name: VAANI_SESSION_COOKIE,
    value: session.id,
    httpOnly: true,
    sameSite: "strict",
    secure: session.secure,
    path: "/api/vaani",
    maxAge: 60 * 60,
  });
  return response;
}
