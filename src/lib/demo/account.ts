/**
 * The shared account judges sign in with.
 *
 * The sample case at `/case/demo-vaani-call` shows a finished case and nothing
 * else — it is a document, not the product. Somebody evaluating this needs to
 * *use* it: start an intake, run the checker, watch a case being built. All of
 * that sits behind the gate, and asking a judge to invent a password and go
 * find a confirmation email is how an evaluation ends early.
 *
 * So the landing page's demo button hands them a working account instead, with
 * both fields already filled. One click from the landing page to a live app.
 *
 * The account is a real Supabase user, created by `scripts/seed-demo.mjs`
 * rather than special-cased anywhere in the app: it signs in through the same
 * form, hits the same gate, and gets the same session as anybody else. There is
 * no demo mode inside Kavach — only a demo *account* — so what a judge exercises
 * is the actual product, not a rehearsal of it.
 *
 * `NEXT_PUBLIC_` is correct for the overrides and is not a leak: these
 * credentials are meant to be read by anybody who opens the page. That is also
 * why the account must hold nothing real — it is a shared sandbox, everybody
 * who signs in with it sees the same cases, and anything typed into it is
 * public. Setting either variable to an empty string turns the demo off, and
 * every entry point falls back to the sample case.
 */

export interface DemoAccount {
  email: string;
  password: string;
}

/**
 * The identity the seed script creates and the sign-in form types in.
 *
 * Committed rather than kept in an environment variable, because it is not a
 * secret in any useful sense: it is printed on the sign-in page, typed into a
 * visible form, and meant to be used by strangers. Hiding it in an env var
 * would buy nothing and would mean the demo button silently stops working on
 * any deployment that forgot to set it.
 *
 * What follows from that is the rule the banner states: the account holds
 * nothing real. Everyone who tries the demo shares it and sees the same cases.
 *
 * Plus-addressed off the project's own mailbox so the address is genuinely
 * deliverable — Supabase will send a password-reset or confirmation there if it
 * ever needs to, rather than bouncing into a domain nobody owns.
 *
 * The overrides below are read as two literal `process.env.X` expressions on
 * purpose: Next inlines `NEXT_PUBLIC_` variables by substituting the exact text
 * at build time, and a dynamic lookup would come back undefined in the browser.
 */
const DEFAULT_EMAIL = "skillbarterapp+demo@gmail.com";
const DEFAULT_PASSWORD = "KavachDemo2026!";

export function demoAccount(): DemoAccount | null {
  // Env wins, so a deployment can point the demo at a different account —
  // or disable it entirely by setting either one to a blank string.
  const email = process.env.NEXT_PUBLIC_DEMO_EMAIL?.trim() ?? DEFAULT_EMAIL;
  const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD?.trim() ?? DEFAULT_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function demoAccountConfigured(): boolean {
  return demoAccount() !== null;
}

/** Sign-in, in demo mode: both fields filled, and told why. */
export const DEMO_SIGNIN_PATH = "/signin?demo=1";

/** The query the sign-in form looks for. */
export const DEMO_PARAM = "demo";
