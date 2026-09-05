"use client";

import { useId, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface BaseProps {
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  className?: string;
}

const inputCls =
  "w-full h-12 px-3.5 bg-raised border border-rule-strong rounded-ctl text-ink " +
  "placeholder:text-ink-3/70 transition-colors " +
  "hover:border-ink-3 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink";

export function Field({
  label, hint, optional, error, className, mono, reveal, type, ...rest
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement> & {
  mono?: boolean;
  /**
   * Offer to show what has been typed.
   *
   * A password field is a row of dots on a phone keyboard that has just
   * autocorrected something, and the usual result is a person locked out of
   * their own account by a typo they cannot see. The eye is opt-in rather than
   * automatic on every password field, because a field somebody fills in at a
   * bank counter or on a shared screen should not offer to shout it.
   */
  reveal?: boolean;
}) {
  const t = useT();
  const id = useId();
  const hintId = `${id}-hint`;
  const [shown, setShown] = useState(false);
  // Only a password can be revealed, and only when asked for.
  const revealable = reveal && type === "password";

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-medium">
        <span>{label}</span>
        {optional && <span className="label !tracking-wider">optional</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={revealable && shown ? "text" : type}
          aria-describedby={hint || error ? hintId : undefined}
          aria-invalid={!!error}
          className={cn(
            inputCls,
            mono && "font-mono tabular-nums",
            error && "border-urgent",
            // Room for the eye, on whichever side the script ends on.
            revealable && "pe-12",
          )}
          {...rest}
        />
        {revealable && (
          <button
            type="button"
            // Not a submit: this sits inside a form, and a bare button in a
            // form submits it.
            onClick={() => setShown((was) => !was)}
            aria-pressed={shown}
            aria-controls={id}
            aria-label={shown ? t("field.hidePassword") : t("field.showPassword")}
            className={cn(
              "absolute inset-y-0 end-0 grid place-items-center w-12 rounded-e-ctl",
              "text-ink-3 hover:text-ink focus-visible:outline-none",
              "focus-visible:ring-1 focus-visible:ring-ink",
            )}
          >
            {shown ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {(hint || error) && (
        <p id={hintId} className={cn("text-sm leading-snug", error ? "text-urgent" : "text-ink-3")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 7 10 7a17.9 17.9 0 0 1-3.1 4M6.3 7.4A17.6 17.6 0 0 0 2 13s3.6 7 10 7a9.7 9.7 0 0 0 4.3-1" />
      <path d="M9.9 10.1a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

export function TextArea({
  label, hint, optional, error, className, rows = 5, ...rest
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-medium">
        <span>{label}</span>
        {optional && <span className="label !tracking-wider">optional</span>}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-describedby={hint || error ? hintId : undefined}
        className={cn(inputCls, "h-auto py-3 leading-relaxed resize-y", error && "border-urgent")}
        {...rest}
      />
      {(hint || error) && (
        <p id={hintId} className={cn("text-sm leading-snug", error ? "text-urgent" : "text-ink-3")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
