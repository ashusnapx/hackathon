"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/browser";
import { safeRedirect } from "@/lib/auth/routes";
import { useT } from "@/lib/i18n/context";

type Mode = "in" | "up";

/**
 * Email and password, and nothing else.
 *
 * No magic link, no OTP, no provider buttons: one form that either signs you in
 * or makes the account, because the point of the gate is to know who is here,
 * not to run an identity product.
 *
 * Two things it refuses to do. It does not tell a stranger which addresses have
 * accounts — a wrong password and an unknown email get the same sentence, which
 * is why the message is ours and not the provider's. And it does not claim to
 * have signed somebody up when the project is set to confirm addresses by
 * email: sign-up there returns a user with no session, and saying "check your
 * inbox" is the only honest reading of that.
 */
export function SignInForm({ configured }: { configured: boolean }) {
  const t = useT();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const next = safeRedirect(params.get("next"));
  const short = password.length > 0 && password.length < 8;
  const ready = email.trim().length > 3 && password.length >= 8 && !busy;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    setConfirm(false);
    try {
      const supabase = authClient();
      const credentials = { email: email.trim(), password };
      const { data, error: failed } = mode === "in"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

      if (failed) {
        // One sentence for every rejection the provider can give, so that this
        // form cannot be used to find out who has an account here.
        setError(mode === "in" ? t("auth.wrong") : t("auth.cannotCreate"));
        return;
      }
      if (!data.session) {
        // Sign-up with email confirmation switched on in the project.
        setConfirm(true);
        return;
      }
      // A full navigation, not a client push: the middleware has to see the new
      // cookies before the page it is protecting renders.
      // A router push would not do: the session lives in a cookie, and only a
      // real request lets the middleware read the new one.
      window.location.assign(next);
    } catch {
      setError(t("auth.unavailable"));
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <p role="alert" className="rounded-card border border-urgent/35 bg-urgent-soft px-4 py-3 text-sm leading-[1.55] text-urgent-ink">
        {t("auth.notConfigured")}
      </p>
    );
  }

  if (confirm) {
    return (
      <div className="rounded-card border border-rule-strong bg-raised px-5 py-5">
        <h2 className="!font-sans !text-lg !font-semibold !tracking-normal !leading-snug">{t("auth.checkInbox")}</h2>
        <p className="mt-2 text-[0.9375rem] leading-[1.6] text-ink-2">{t("auth.checkInboxBody")}</p>
        <Button onClick={() => { setConfirm(false); setMode("in"); }} variant="secondary" size="md" className="mt-4">
          {t("auth.backToSignIn")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
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
      <Button type="submit" disabled={!ready} size="lg" full>
        {busy ? `${t("auth.working")}…` : mode === "in" ? t("auth.signIn") : t("auth.createAccount")}
      </Button>
      <button
        type="button"
        onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }}
        className="w-full text-sm text-ink-3 underline underline-offset-4 hover:text-ink"
      >
        {mode === "in" ? t("auth.needAccount") : t("auth.haveAccount")}
      </button>
    </form>
  );
}
