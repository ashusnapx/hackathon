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
    // The whole interview, not just its front door. Opening the page but not
    // the endpoints it calls renders a screen that cannot do anything — which
    // is how this was shipped once already.
    for (const path of [
      "/start", "/assist", "/say", "/say/questions",
      "/api/ai/triage", "/api/ai/transcribe", "/api/whatsapp/claim",
    ]) {
      expect(isPublicPath(path), path).toBe(true);
    }
    expect(isPublicPath("/api/vaani/webhook")).toBe(true);
    // Meta cannot present a session cookie. Behind the gate the subscription
    // handshake gets a 401 and the webhook can never be registered.
    expect(isPublicPath("/api/whatsapp/webhook")).toBe(true);
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
      "/cases", "/report", "/check", "/compare", "/account",
      "/case/9f0b1e2c-1111-2222-3333-444455556666",
      "/api/ai/draft", "/api/cases/fetch", "/api/cases/sync",
      "/api/vaani/session", "/api/vaani/transcript", "/api/email/case-created",
    ]) {
      expect(isPublicPath(path), path).toBe(false);
    }
  });

  it("opening the interview does not open the case store behind it", () => {
    // `/assist` is public so somebody can start before they have an account.
    // Everything that reads or writes a stored case still demands one, and the
    // case key is still checked on top of that.
    expect(isPublicPath("/assist")).toBe(true);
    expect(isPublicPath("/say")).toBe(true);
    for (const path of ["/api/cases/sync", "/api/cases/fetch", "/api/cases/mine", "/api/cases/delete"]) {
      expect(isPublicPath(path), path).toBe(false);
    }
    // And the prefix is not a hole.
    expect(isPublicPath("/assistant")).toBe(false);
    expect(isPublicPath("/assist/../cases")).toBe(false);
    expect(isPublicPath("/sayings")).toBe(false);
    expect(isPublicPath("/api/ai/draft")).toBe(false);
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
    expect(isPublicPath("//assist")).toBe(true);
    expect(isPublicPath("//cases")).toBe(false);
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

describe("the sample case's own screens", () => {
  // Its doors became separate pages. Allowlisting only the home would put the
  // one thing somebody can open without an account back behind the wall.
  it.each(["steps", "money", "evidence", "papers", "recording", "ask", "manage"])(
    "keeps /case/demo-vaani-call/%s public",
    (door) => {
      expect(isPublicPath(`/case/demo-vaani-call/${door}`)).toBe(true);
    },
  );

  it("does not open anybody else's case", () => {
    expect(isPublicPath("/case/KVC-5DLK-3XPL/money")).toBe(false);
    expect(isPublicPath("/case/9f0b1e2c-1111-2222-3333-444455556666/steps")).toBe(false);
    // A path that merely begins with the same characters is not the sample.
    expect(isPublicPath("/case/demo-vaani-call-other/steps")).toBe(false);
  });
});
