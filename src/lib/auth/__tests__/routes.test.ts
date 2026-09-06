import { describe, expect, it } from "vitest";

import { AUTH_CALLBACK_PATH, isPublicPath, normalisePath, safeRedirect, SIGN_IN_PATH } from "../routes";

describe("what a signed-out stranger may reach", () => {
  it("lets them read the landing page, sign in, and see the sample case", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath(SIGN_IN_PATH)).toBe(true);
    // Linked from the landing page as the proof any of this works, and it holds
    // one call committed to this repository rather than a real person's case.
    expect(isPublicPath("/case/demo-vaani-call")).toBe(true);
  });

  it("keeps the footer's status line working for them", () => {
    expect(isPublicPath("/api/health")).toBe(true);
  });

  it("lets the provider's own webhook through, which has no session to present", () => {
    expect(isPublicPath("/api/vaani/webhook")).toBe(true);
  });

  it("lets a confirmation link land, since a session is what it is coming to collect", () => {
    // Gating this is self-defeating: the gate would bounce somebody holding a
    // valid one-time code to sign-in, where the code is worth nothing.
    expect(isPublicPath(AUTH_CALLBACK_PATH)).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    // But only that one path. The prefix is not a hole.
    expect(isPublicPath("/auth")).toBe(false);
    expect(isPublicPath("/auth/callback/../../start")).toBe(false);
  });

  it("shuts everything else", () => {
    for (const path of [
      "/start", "/assist", "/cases", "/report", "/check", "/compare",
      "/case/9f0b1e2c-1111-2222-3333-444455556666",
      "/api/ai/triage", "/api/ai/draft", "/api/cases/fetch", "/api/cases/sync",
      "/api/vaani/session", "/api/vaani/transcript", "/api/email/case-created",
    ]) {
      expect(isPublicPath(path), path).toBe(false);
    }
  });

  it("is not fooled by a path dressed up to look like a public one", () => {
    // The bug this guards against is a prefix match: "/api/healthy" is not the
    // health endpoint, and a case id is not the sample because it starts alike.
    expect(isPublicPath("/api/healthy")).toBe(false);
    expect(isPublicPath("/api/health/../ai/triage")).toBe(false);
    expect(isPublicPath("/case/demo-vaani-call-2")).toBe(false);
    expect(isPublicPath("/signin/../assist")).toBe(false);
  });

  it("treats a trailing slash, a doubled slash and odd casing as the same path", () => {
    expect(normalisePath("/start/")).toBe("/start");
    expect(normalisePath("//start//")).toBe("/start");
    expect(normalisePath("/START")).toBe("/start");
    expect(isPublicPath("/API/HEALTH")).toBe(true);
    expect(isPublicPath("//assist")).toBe(false);
  });

  it("does not gate what Next.js serves itself", () => {
    expect(isPublicPath("/_next/static/chunks/main.js")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
  });
});

describe("where somebody lands after signing in", () => {
  it("returns them to the page they were stopped on", () => {
    expect(safeRedirect("/assist")).toBe("/assist");
    expect(safeRedirect("/case/abc?tab=documents")).toBe("/case/abc?tab=documents");
  });

  it("refuses to bounce them off this site", () => {
    // Our own login turning into somebody else's phishing page is the thing an
    // open redirect actually buys an attacker.
    expect(safeRedirect("https://evil.example.com")).toBe("/start");
    expect(safeRedirect("//evil.example.com")).toBe("/start");
    expect(safeRedirect("/\\evil.example.com")).toBe("/start");
    expect(safeRedirect("javascript:alert(1)")).toBe("/start");
  });

  it("never loops back to the sign-in page", () => {
    expect(safeRedirect(SIGN_IN_PATH)).toBe("/start");
    expect(safeRedirect("/signin/")).toBe("/start");
  });

  it("has somewhere to go when it was given nothing", () => {
    expect(safeRedirect(null)).toBe("/start");
    expect(safeRedirect("")).toBe("/start");
  });
});
