"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface BaseProps {
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  className?: string;
}

const inputCls =
  "w-full h-12 px-3.5 bg-raised border border-rule-strong rounded-[3px] text-ink " +
  "placeholder:text-ink-3/70 transition-colors " +
  "hover:border-ink-3 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink";

export function Field({
  label, hint, optional, error, className, mono, ...rest
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-medium">
        <span>{label}</span>
        {optional && <span className="label !tracking-wider">optional</span>}
      </label>
      <input
        id={id}
        aria-describedby={hint || error ? hintId : undefined}
        aria-invalid={!!error}
        className={cn(inputCls, mono && "font-mono tabular-nums", error && "border-urgent")}
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
