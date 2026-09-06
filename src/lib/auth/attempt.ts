/**
 * What to do next, given what Supabase just said.
 *
 * Kept apart from the form on purpose. The rules below are the whole of the
 * sign-in behaviour — including the one that creates an account for somebody
 * who came here to sign in — and they are the kind of thing that has to be
 * argued with in a test rather than discovered in production by a person who
 * has just lost money.
 *
 * Supabase deliberately refuses to say whether an address has an account: a
 * wrong password and an unknown address both come back as `invalid_credentials`.
 * That is why the flow is *try, then try again* rather than *ask, then decide* —
 * there is nothing to ask.
 */

/** The shape of `AuthError` we actually depend on, so tests need no SDK. */
export type AuthFailure = { code?: string | null; message?: string | null } | null | undefined;

/** A user as returned by sign-up, narrowed to the field that matters. */
export type MaybeUser = { identities?: unknown[] | null } | null | undefined;

const codeOf = (error: AuthFailure) => (error?.code ?? "").toLowerCase();
const textOf = (error: AuthFailure) => (error?.message ?? "").toLowerCase();

/**
 * Matching on `code` first and the message only as a fallback.
 *
 * `code` is stable and `message` is prose that the provider is free to reword,
 * but older projects and some self-hosted versions still send no code at all,
 * and a sign-in that breaks on an upgrade is worse than a redundant check.
 */
export function isInvalidCredentials(error: AuthFailure): boolean {
  return codeOf(error) === "invalid_credentials" || textOf(error).includes("invalid login credentials");
}

/** The account exists but the address was never confirmed. */
export function isUnconfirmed(error: AuthFailure): boolean {
  return codeOf(error) === "email_not_confirmed" || textOf(error).includes("email not confirmed");
}

export function isAlreadyRegistered(error: AuthFailure): boolean {
  const code = codeOf(error);
  if (code === "user_already_exists" || code === "email_exists") return true;
  const text = textOf(error);
  return text.includes("already registered") || text.includes("already been registered");
}

export function isWeakPassword(error: AuthFailure): boolean {
  return codeOf(error) === "weak_password" || textOf(error).includes("password should be at least");
}

export function isRateLimited(error: AuthFailure): boolean {
  const code = codeOf(error);
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return true;
  return textOf(error).includes("rate limit") || textOf(error).includes("too many requests");
}

/**
 * Sign-up succeeded, and the address already had an account.
 *
 * With email confirmation switched on, signing up an existing address does not
 * fail: Supabase returns a hollow user with an empty `identities` array, so
 * that a stranger cannot use the sign-up form to find out who banks here. If
 * this is not checked, that hollow success is read as "new account" and the
 * person is told to check an inbox for a letter that will never arrive — when
 * what actually happened is that they mistyped their password.
 */
export function alreadyRegistered(user: MaybeUser): boolean {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}

export type SignInNext =
  /** Signed in; go where they were headed. */
  | "in"
  /** No account matched. Make one — that is the point of this flow. */
  | "sign-up"
  /** The account exists and is waiting on its confirmation link. */
  | "confirm"
  /** The provider said something we did not plan for. */
  | "unavailable";

export function afterSignIn(error: AuthFailure): SignInNext {
  if (!error) return "in";
  if (isUnconfirmed(error)) return "confirm";
  // Anything else — a disabled provider, an unreachable project, a malformed
  // address — must not fall through into creating an account.
  return isInvalidCredentials(error) ? "sign-up" : "unavailable";
}

export type SignUpNext =
  /** Account made and a session issued: they are in. */
  | "created"
  /** Account made, confirmation required before a session exists. */
  | "confirm"
  /** The address is taken, so the password was the problem. */
  | "wrong"
  | "weak"
  | "rate"
  | "cannot";

export function afterSignUp(
  error: AuthFailure,
  result?: { session?: unknown; user?: MaybeUser } | null,
): SignUpNext {
  if (error) {
    if (isAlreadyRegistered(error)) return "wrong";
    if (isWeakPassword(error)) return "weak";
    if (isRateLimited(error)) return "rate";
    return "cannot";
  }
  if (alreadyRegistered(result?.user)) return "wrong";
  return result?.session ? "created" : "confirm";
}
