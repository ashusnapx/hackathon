import { describe, expect, it } from "vitest";
import type { Session, User } from "@supabase/supabase-js";

import { accountFacts, relativeTime } from "../account";

const NOW = Date.parse("2026-09-05T12:00:00.000Z");

const user = (over: Partial<User> = {}): User => ({
  id: "9f0b1e2c-1111-2222-3333-444455556666",
  aud: "authenticated",
  role: "authenticated",
  email: "meera@example.com",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: "2026-08-01T09:30:00.000Z",
  last_sign_in_at: "2026-09-05T11:57:00.000Z",
  email_confirmed_at: "2026-08-01T09:31:00.000Z",
  ...over,
} as User);

const session = (expiresAt: number | undefined): Session => ({
  access_token: "x", refresh_token: "y", token_type: "bearer",
  expires_in: 3_600, expires_at: expiresAt, user: user(),
} as Session);

const row = (u: User, s: Session | null, key: string) =>
  accountFacts(u, s, NOW, "en").rows.find((r) => r.key === key)!;

describe("what the account panel can say", () => {
  it("reports a confirmed address as confirmed", () => {
    expect(accountFacts(user(), null, NOW).verified).toBe(true);
    expect(accountFacts(user({ email_confirmed_at: undefined }), null, NOW).verified).toBe(false);
  });

  it("says when they last signed in, and keeps the exact moment for the tooltip", () => {
    const last = row(user(), null, "account.lastSignIn");
    expect(last.value).toBe("3 minutes ago");
    // A relative phrase on its own throws away the timestamp, which is the one
    // thing somebody checking for a break-in actually needs.
    expect(last.title).toContain("2026");
  });

  it("counts back in whole units a person would use", () => {
    expect(relativeTime("2026-08-01T09:30:00.000Z", NOW)).toBe("last month");
    expect(relativeTime("2026-09-04T12:00:00.000Z", NOW)).toBe("yesterday");
    expect(relativeTime("2026-09-05T11:00:00.000Z", NOW)).toBe("1 hour ago");
  });

  it("looks forward for a session that has not run out yet", () => {
    const ends = row(user(), session(Math.floor(NOW / 1_000) + 3_540), "account.sessionEnds");
    expect(ends.value).toBe("in 59 minutes");
  });

  it("names how the account signs in, as a sentence rather than a slug", () => {
    expect(row(user(), null, "account.method").valueKey).toBe("account.methodPassword");
    const google = user({ app_metadata: { provider: "google", providers: ["google"] } });
    expect(row(google, null, "account.method").valueKey).toBe("account.methodOther");
  });

  it("leaves out the sign-in method when the provider did not say", () => {
    const bare = user({ app_metadata: {} });
    expect(accountFacts(bare, null, NOW).rows.some((r) => r.key === "account.method")).toBe(false);
  });

  it("says a field is unknown rather than inventing one", () => {
    const fresh = user({ last_sign_in_at: undefined, email_confirmed_at: undefined });
    expect(row(fresh, null, "account.lastSignIn").value).toBeNull();
    expect(row(fresh, null, "account.confirmedOn").value).toBeNull();
    expect(row(fresh, null, "account.sessionEnds").value).toBeNull();
  });

  it("does not fall over on a locale the browser has never heard of", () => {
    // Several of the twenty-two languages here have no relative-time data, and
    // a throw would take the whole panel down rather than one line of it.
    expect(relativeTime("2026-09-05T11:57:00.000Z", NOW, "sat-Olck")).toBeTruthy();
    expect(relativeTime("not a date", NOW)).toBeNull();
  });
});
