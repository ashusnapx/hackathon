"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/browser";
import { afterSignIn, afterSignUp, type SignUpNext } from "@/lib/auth/attempt";
import { AUTH_CALLBACK_PATH, safeRedirect } from "@/lib/auth/routes";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type Mode = "in" | "up";

/** A screen that has replaced the form, because the form is finished with. */
type Settled =
  | { kind: "confirm" }
  /** Signed in on an account we made for them without being asked to. */
  | { kind: "created"; email: string };

/**
 * Email and password, and nothing else.
 *
 * No magic link, no OTP, no provider buttons: one form that either signs you in
 * or makes the account, because the point of the gate is to know who is here,
 * not to run an identity product.
 *
 * Signing in with an address that has no account **creates one**. Supabase will
 * not say whether an address is registered — a wrong password and an unknown
 * address are the same rejection — so there is no way to ask first, and the
 * honest options were a dead end reading "no such account" or this. For someone
 * midway through losing money, a dead end is the wrong answer.
 *
 * The cost is deliberate and worth stating: because a new address now succeeds
 * where a known one fails, this form no longer hides which addresses have
 * accounts. That property was worth more before it stood between a victim and
 * their case file. What survives is the messaging — every genuine refusal still
 * gets one sentence, so nothing here narrates *why* it said no.
 */
export function SignInForm({ configured }: { configured: boolean }) {
  const t = useT();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // A confirmation link that did not work says so here rather than dumping
  // somebody on an ordinary sign-in page wondering what happened to the email
  // they just opened. Typing clears it, like any other error.
  const [error, setError] = useState<string | null>(() =>
    params.get("error") === "link" ? t("auth.linkFailed") : null,
  );
  const [settled, setSettled] = useState<Settled | null>(null);

  const next = safeRedirect(params.get("next"));
  const short = password.length > 0 && password.length < 8;
  const ready = email.trim().length > 3 && password.length >= 8 && !busy;

  // A full navigation, not a router push: the session lives in a cookie, and
  // only a real request lets the middleware read the new one.
  const go = () => window.location.assign(next);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = authClient();
      const address = email.trim();
      const credentials = { email: address, password };
      const options = {
        // Without this, Supabase falls back to the project's Site URL —
        // `http://localhost:3000` in a new project — and mails a fraud victim a
        // link to a server on our own laptop. Reading the origin off the browser
        // means the link points wherever they actually signed up.
        emailRedirectTo:
          `${window.location.origin}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`,
      };

      const create = async (from: Mode) => {
        const { data, error: failed } = await supabase.auth.signUp({ ...credentials, options });
        settle(afterSignUp(failed, data), address, from);
      };

      if (mode === "up") {
        await create("up");
        return;
      }

      const { error: failed } = await supabase.auth.signInWithPassword(credentials);
      switch (afterSignIn(failed)) {
        case "in": go(); return;
        case "confirm": setSettled({ kind: "confirm" }); return;
        case "unavailable": setError(t("auth.unavailable")); return;
        // Nothing matched, so as far as anyone can tell they are new. Make the
        // account they came here expecting to already have.
        case "sign-up": await create("in"); return;
      }
    } catch {
      setError(t("auth.unavailable"));
    } finally {
      setBusy(false);
    }
  };

  const settle = (outcome: SignUpNext, address: string, from: Mode) => {
    switch (outcome) {
      case "created":
        // Asked for on the sign-up tab, so just go. Reached from the sign-in
        // tab it is something we decided to do, and a person whose address has
        // a typo in it needs to catch that now — before a case file is attached
        // to an inbox they cannot open.
        if (from === "up") go();
        else setSettled({ kind: "created", email: address });
        return;
      case "confirm": setSettled({ kind: "confirm" }); return;
      // The address is taken, which — after a sign-in that already failed —
      // means the password was what did not match.
      case "wrong": setError(t("auth.wrong")); return;
      case "weak": setError(t("auth.passwordShort")); return;
      case "rate": setError(t("auth.tooMany")); return;
      case "cannot": setError(t("auth.cannotCreate")); return;
    }
  };

  const startOver = async () => {
    // They are signed in on the account we just made. Undo that before handing
    // the form back, or the gate would wave them through on the wrong address.
    try { await authClient().auth.signOut(); } catch { /* Nothing to undo. */ }
    setSettled(null);
    setPassword("");
  };

  if (!configured) {
    return (
      <p role="alert" className="rounded-card border border-urgent/35 bg-urgent-soft px-4 py-3 text-sm leading-[1.55] text-urgent-ink">
        {t("auth.notConfigured")}
      </p>
    );
  }

  if (settled?.kind === "confirm") {
    return (
      <Panel title={t("auth.checkInbox")} body={t("auth.checkInboxBody")}>
        <Button onClick={() => setSettled(null)} variant="secondary" size="md">
          {t("auth.backToSignIn")}
        </Button>
      </Panel>
    );
  }

  if (settled?.kind === "created") {
    return (
      <Panel title={t("auth.created")} body={t("auth.createdBody")}>
        <p className="mb-4 -mt-1 break-all font-mono text-[0.9375rem] text-ink">{settled.email}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={go} size="md">{t("auth.continue")}</Button>
          <Button onClick={startOver} variant="secondary" size="md">{t("auth.wrongAddress")}</Button>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <div role="group" aria-label={t("auth.chooseMode")} className="grid grid-cols-2 gap-1 rounded-ctl border border-rule-strong bg-sunk p-1">
        {(["in", "up"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => { setMode(option); setError(null); }}
            className={cn(
              // The label is a translation, and "Create account" is short only
              // in English. Truncating beats a control that grows a second line
              // and shunts the email field down the page.
              "h-10 min-w-0 truncate px-2 rounded-[7px] font-semibold transition-colors",
              "text-[0.875rem] sm:text-[0.9375rem]",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink",
              mode === option
                ? "bg-raised text-ink shadow-[0_1px_3px_rgba(26,26,26,0.16)]"
                : "text-ink-3 hover:text-ink",
            )}
          >
            {t(option === "in" ? "auth.tabIn" : "auth.tabUp")}
          </button>
        ))}
      </div>

      {/* Sized to a laptop rather than to a poster. The whole column has to
          clear a 1280×720 viewport without scrolling, and the display face is
          the cheapest place to buy that back — it is still the largest thing
          on the page. */}
      <h1 className="mt-6 text-[1.75rem] sm:text-[2rem] leading-[1.1]">
        {t(mode === "in" ? "auth.title" : "auth.titleUp")}
      </h1>
      <p className="mt-2 text-base leading-[1.55] text-ink-2">
        {t(mode === "in" ? "auth.sub" : "auth.subUp")}
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3.5" noValidate>
        <Field
          label={t("auth.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => { setEmail(event.target.value); setError(null); }}
          placeholder="you@example.com"
        />
        <Field
          label={t("auth.password")}
          type="password"
          reveal
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => { setPassword(event.target.value); setError(null); }}
          hint={mode === "up" ? t("auth.passwordHint") : undefined}
          error={short ? t("auth.passwordShort") : undefined}
        />
        {error && <p role="alert" className="text-sm leading-snug text-urgent-ink">{error}</p>}
        {/* Full height on a phone, where it is the only thing a thumb is
            aiming at; one notch down on a laptop, where the column has a
            viewport to fit inside. Still 48px, well over the touch floor. */}
        <Button type="submit" disabled={!ready} size="lg" full className="lg:h-12">
          {busy ? `${t("auth.working")}…` : t(mode === "in" ? "auth.signIn" : "auth.createAccount")}
        </Button>
      </form>

      {/* Said out loud on the sign-in tab, because it is a thing this page does
          that no other sign-in page does. */}
      <p className="mt-3 text-sm leading-[1.6] text-ink-3">
        {t(mode === "in" ? "auth.autoNote" : "auth.upNote")}
      </p>
    </>
  );
}

function Panel({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-rule-strong bg-raised px-5 py-6">
      <h1 className="!font-sans !text-xl !font-semibold !tracking-normal !leading-snug">{title}</h1>
      <p className="mt-2 mb-4 text-[0.9375rem] leading-[1.6] text-ink-2">{body}</p>
      {children}
    </div>
  );
}
