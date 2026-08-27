"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import type { CaseFile } from "@/lib/case/types";

interface Turn {
  q: string;
  a: string | null;
  pending?: boolean;
}

const SUGGESTIONS = ["ask.s1", "ask.s2", "ask.s3", "ask.s4"] as const;

export function AskPanel({ caseFile }: { caseFile: CaseFile }) {
  const { t, lang } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQ("");
    setTurns((ts) => [...ts, { q: question, a: null, pending: true }]);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, caseFile, lang: lang.code }),
      });
      const data = await res.json();
      setTurns((ts) =>
        ts.map((turn, i) =>
          i === ts.length - 1 ? { ...turn, pending: false, a: data.answer ?? data.fallback ?? null } : turn,
        ),
      );
    } catch {
      setTurns((ts) => ts.map((turn, i) => (i === ts.length - 1 ? { ...turn, pending: false, a: null } : turn)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="text-2xl">{t("ask.t")}</h2>
      <p className="mt-1.5 text-[0.9375rem] text-ink-2">{t("ask.b")}</p>

      {turns.length === 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {SUGGESTIONS.map((k) => (
            <button
              key={k}
              onClick={() => ask(t(k))}
              className="text-start text-sm px-3 py-2 border border-rule rounded-[3px] bg-raised hover:border-ink hover:bg-sunk transition-colors"
            >
              {t(k)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-5">
        {turns.map((turn, i) => (
          <div key={i} className="rise">
            <p className="text-[0.9375rem] font-medium">{turn.q}</p>
            {turn.pending ? (
              <p className="mt-2 text-[0.9375rem] text-ink-3">{t("ask.thinking")}…</p>
            ) : turn.a ? (
              <p className="mt-2 text-[0.9375rem] leading-[1.7] text-ink-2 border-s-2 border-rule-strong ps-4">
                {turn.a}
              </p>
            ) : (
              <p className="mt-2 text-[0.9375rem] text-urgent">{t("start.error")}</p>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="mt-8 flex gap-2"
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("ask.ph")}
          className="flex-1 h-12 px-3.5 bg-raised border border-rule-strong rounded-[3px] focus:outline-none focus:border-ink"
        />
        <Button type="submit" disabled={busy || !q.trim()}>{t("ask.send")}</Button>
      </form>
    </section>
  );
}
