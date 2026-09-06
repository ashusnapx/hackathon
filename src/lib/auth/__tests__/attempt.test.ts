import { describe, expect, it } from "vitest";

import {
  afterSignIn,
  afterSignUp,
  alreadyRegistered,
  isAlreadyRegistered,
  isInvalidCredentials,
  isRateLimited,
  isUnconfirmed,
  isWeakPassword,
} from "../attempt";

describe("reading what the provider said", () => {
  it("recognises a rejection by code", () => {
    expect(isInvalidCredentials({ code: "invalid_credentials" })).toBe(true);
    expect(isUnconfirmed({ code: "email_not_confirmed" })).toBe(true);
    expect(isAlreadyRegistered({ code: "user_already_exists" })).toBe(true);
    expect(isAlreadyRegistered({ code: "email_exists" })).toBe(true);
    expect(isWeakPassword({ code: "weak_password" })).toBe(true);
    expect(isRateLimited({ code: "over_email_send_rate_limit" })).toBe(true);
  });

  it("still recognises it from the message alone, for projects that send no code", () => {
    expect(isInvalidCredentials({ message: "Invalid login credentials" })).toBe(true);
    expect(isAlreadyRegistered({ message: "User already registered" })).toBe(true);
    expect(isWeakPassword({ message: "Password should be at least 6 characters" })).toBe(true);
    expect(isRateLimited({ message: "Email rate limit exceeded" })).toBe(true);
  });

  it("does not see a rejection in something else", () => {
    expect(isInvalidCredentials({ code: "signup_disabled" })).toBe(false);
    expect(isInvalidCredentials(null)).toBe(false);
    expect(isAlreadyRegistered({ message: "Unable to validate email address" })).toBe(false);
  });
});

describe("after an attempt to sign in", () => {
  it("goes on through when it worked", () => {
    expect(afterSignIn(null)).toBe("in");
  });

  it("makes an account when nothing matched, which is the whole point", () => {
    // Supabase will not say whether the address exists, so "no match" is the
    // only signal there is that somebody is new.
    expect(afterSignIn({ code: "invalid_credentials" })).toBe("sign-up");
  });

  it("does not make an account for an address that is only unconfirmed", () => {
    expect(afterSignIn({ code: "email_not_confirmed" })).toBe("confirm");
  });

  it("does not make an account when the provider failed for some other reason", () => {
    // A disabled provider or an unreachable project must not be read as "new
    // person": that would answer an outage by creating accounts.
    expect(afterSignIn({ code: "signup_disabled" })).toBe("unavailable");
    expect(afterSignIn({ code: "validation_failed" })).toBe("unavailable");
    expect(afterSignIn({ message: "fetch failed" })).toBe("unavailable");
  });
});

describe("after an attempt to sign up", () => {
  it("signs them in when a session came back", () => {
    expect(afterSignUp(null, { session: { access_token: "x" }, user: { identities: [{}] } })).toBe("created");
  });

  it("asks them to confirm when the project requires it", () => {
    expect(afterSignUp(null, { session: null, user: { identities: [{}] } })).toBe("confirm");
  });

  it("reads a hollow success as a wrong password, not a new account", () => {
    // With confirmation on, signing up an existing address succeeds with an
    // empty `identities` so the form cannot be used to enumerate customers.
    // Believing it would tell somebody to wait for an email nobody sent.
    expect(alreadyRegistered({ identities: [] })).toBe(true);
    expect(afterSignUp(null, { session: null, user: { identities: [] } })).toBe("wrong");
  });

  it("reads a taken address as a wrong password", () => {
    // Reached only after a sign-in already failed, so the address existing
    // means the password was what did not match.
    expect(afterSignUp({ code: "user_already_exists" })).toBe("wrong");
  });

  it("says which of the remaining refusals it was", () => {
    expect(afterSignUp({ code: "weak_password" })).toBe("weak");
    expect(afterSignUp({ code: "over_email_send_rate_limit" })).toBe("rate");
    expect(afterSignUp({ code: "email_address_invalid" })).toBe("cannot");
  });

  it("treats a real user with identities as genuinely new", () => {
    expect(alreadyRegistered({ identities: [{ id: "1" }] })).toBe(false);
    expect(alreadyRegistered(null)).toBe(false);
    // No `identities` field at all is not evidence of anything.
    expect(alreadyRegistered({})).toBe(false);
  });
});
