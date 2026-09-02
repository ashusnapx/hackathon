"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { VoiceInput } from "@/components/start/VoiceInput";
import { CATEGORIES, findCategory } from "@/lib/case/categories";
import { OFFICERS, findOfficers } from "@/lib/case/officers";
import { compressImage, formatBytes } from "@/lib/report/compress";
import type { ReportDraft, SuspectId } from "@/lib/report/draft";
import { useT } from "@/lib/i18n/context";

type Patch = (p: Partial<ReportDraft>) => void;
interface StageProps {
  draft: ReportDraft;
  patch: Patch;
  lang: string;
}

/** A question mark that explains why a question is being asked, on demand. */
function Why({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-sm text-ink-3 underline underline-offset-4 hover:text-ink"
      >
        {open ? t("rep.hideWhy") : t("rep.why")}
      </button>
      {open && <p className="mt-2 text-sm leading-[1.6] text-ink-2 max-w-prose">{text}</p>}
    </>
  );
}

/** Marks a field the live portal refuses to proceed without. */
function PortalDemands({ children }: { children: React.ReactNode }) {
  return (
    <span className="num text-[0.6875rem] uppercase tracking-wider px-1.5 py-0.5 rounded-ctl border border-rule-strong bg-sunk text-ink-3">
      {children}
    </span>
  );
}

// ── 1. Incident ─────────────────────────────────────────────────────────────

export function StageIncident({ draft, patch, lang }: StageProps) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const cat = findCategory(draft.categoryId);

  const understand = useCallback(async () => {
    if (draft.narrative.trim().length < 25) return;
    setBusy(true);
    try {
      const r = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.narrative, lang }),
      });
      const d = await r.json();
      if (d?.triage) {
        patch({
          categoryId: d.triage.categoryId,
          subcategoryId: d.triage.subcategoryId,
          incidentAt: d.triage.incidentAt ?? draft.incidentAt,
          amount: d.triage.amount ?? draft.amount,
          inferred: {
            categoryId: d.triage.categoryId,
            subcategoryId: d.triage.subcategoryId,
            incidentAt: d.triage.incidentAt,
            amount: d.triage.amount,
            confidence: d.triage.confidence,
          },
        });
      }
    } finally {
      setBusy(false);
    }
  }, [draft.narrative, draft.incidentAt, draft.amount, lang, patch]);

  /**
   * Read what they wrote without being asked.
   *
   * Working out the category, the time and the amount is the tool's job, not a
   * button the citizen has to discover. It fires once they stop typing, only
   * when there is enough to go on, and never a second time for text it has
   * already read — so correcting a category by hand does not get overwritten.
   */
  const readFor = useRef<string | null>(null);
  useEffect(() => {
    const text = draft.narrative.trim();
    if (text.length < 40 || readFor.current === text || busy) return;
    if (draft.categoryId && readFor.current !== null) return;
    const id = setTimeout(() => {
      readFor.current = text;
      void understand();
    }, 900);
    return () => clearTimeout(id);
  }, [draft.narrative, draft.categoryId, busy, understand]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl">{t("rep.i.h")}</h2>
        <p className="mt-2 text-[1.0625rem] leading-[1.6] text-ink-2 max-w-prose">{t("rep.i.sub")}</p>
      </div>

      <div className="flex justify-center py-2">
        <VoiceInput onResult={(chunk) => patch({ narrative: (draft.narrative ? `${draft.narrative.trim()} ` : "") + chunk })} />
      </div>

      <TextArea
        label={t("rep.i.label")}
        rows={8}
        value={draft.narrative}
        onChange={(e) => patch({ narrative: e.target.value })}
        placeholder={t("start.placeholder")}
        hint={t("rep.i.hint")}
      />

      <div className="flex flex-wrap items-center gap-3">
        {busy ? (
          <p className="text-[0.9375rem] text-ink-2 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-3 animate-pulse" aria-hidden />
            {t("rep.i.reading")}…
          </p>
        ) : (
          draft.categoryId && (
            <button
              onClick={() => { readFor.current = draft.narrative.trim(); void understand(); }}
              className="text-sm text-ink-3 hover:text-ink underline underline-offset-4"
            >
              {t("rep.i.reread")}
            </button>
          )
        )}
        <Why text={t("f.narrative.why")} />
      </div>

      {draft.categoryId && (
        <div className="sheet px-5 py-5 space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="label">{t("rep.i.understood")}</p>
            {draft.inferred?.confidence !== undefined && (
              <p className="num text-sm text-ink-3">
                {Math.round(draft.inferred.confidence * 100)}% {t("rep.i.confident")}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <label className="space-y-1.5">
              <span className="block text-[0.9375rem] font-medium">{t("f.category")}</span>
              <select
                value={draft.categoryId ?? ""}
                onChange={(e) => patch({ categoryId: e.target.value, subcategoryId: undefined })}
                className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl focus:outline-none focus:border-ink"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[0.9375rem] font-medium">{t("f.subcategory")}</span>
              <select
                value={draft.subcategoryId ?? ""}
                onChange={(e) => patch({ subcategoryId: e.target.value })}
                className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl focus:outline-none focus:border-ink"
              >
                <option value="">—</option>
                {cat?.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>

            <Field
              label={t("f.incidentAt")}
              type="datetime-local"
              value={toLocalInput(draft.incidentAt)}
              onChange={(e) => patch({ incidentAt: fromLocalInput(e.target.value) })}
              mono
            />

            <Field
              label={t("f.amount")}
              type="number"
              inputMode="numeric"
              optional
              value={draft.amount ?? ""}
              onChange={(e) => patch({ amount: e.target.value ? Number(e.target.value) : undefined })}
              mono
            />
          </div>

          <p className="text-sm leading-[1.6] text-ink-3 max-w-prose">{t("rep.i.correct")}</p>
        </div>
      )}

      <details className="border-t border-rule pt-5">
        <summary className="cursor-pointer text-[0.9375rem] text-ink-2 hover:text-ink">
          {t("rep.i.delayQ")}
        </summary>
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-[1.6] text-ink-2 max-w-prose">{t("f.delayReason.was")}</p>
          <TextArea
            label={t("f.delayReason")}
            optional
            rows={3}
            value={draft.delayReason ?? ""}
            onChange={(e) => patch({ delayReason: e.target.value })}
          />
        </div>
      </details>
    </div>
  );
}

// ── 2. Evidence ─────────────────────────────────────────────────────────────

export function StageEvidence({ draft, patch }: StageProps) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readPaste = useCallback(async () => {
    if (!draft.pastedText.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.pastedText }),
      });
      const d = await r.json();
      const ids: SuspectId[] = [
        ...(d?.suspect?.upiIds ?? []).map((v: string) => ({ kind: "upi", value: v })),
        ...(d?.suspect?.phones ?? []).map((v: string) => ({ kind: "phone", value: v })),
        ...(d?.suspect?.accounts ?? []).map((v: string) => ({ kind: "account", value: v })),
        ...(d?.suspect?.urls ?? []).map((v: string) => ({ kind: "url", value: v })),
        ...(d?.refs ?? []).map((v: string) => ({ kind: "ref", value: v })),
      ];
      const merged = dedupe([...draft.suspectIds, ...ids]);
      patch({ suspectIds: merged, amount: draft.amount ?? d?.amount ?? undefined });
      setFound(ids.map((i) => i.value));
    } finally {
      setBusy(false);
    }
  }, [draft.pastedText, draft.suspectIds, draft.amount, patch]);

  const addFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setBusy(true);
      try {
        const added = [];
        for (const f of Array.from(list)) {
          const r = await compressImage(f);
          added.push({
            name: r.file.name,
            size: r.bytes,
            type: r.file.type,
            compressedFrom: r.changed ? r.originalBytes : undefined,
          });
        }
        patch({ files: [...draft.files, ...added] });
      } finally {
        setBusy(false);
      }
    },
    [draft.files, patch],
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl">{t("rep.e.h")}</h2>
        <p className="mt-2 text-[1.0625rem] leading-[1.6] text-ink-2 max-w-prose">{t("rep.e.sub")}</p>
      </div>

      <div className="space-y-3">
        <TextArea
          label={t("f.pastedText")}
          optional
          rows={6}
          value={draft.pastedText}
          onChange={(e) => patch({ pastedText: e.target.value })}
          placeholder={t("rep.e.pastePlaceholder")}
          hint={t("f.pastedText.why")}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={readPaste} disabled={busy || !draft.pastedText.trim()} size="sm" variant="secondary">
            {busy ? `${t("rep.e.reading")}…` : t("rep.e.readPaste")}
          </Button>
          {found && found.length > 0 && (
            <p className="text-sm text-done">{found.length} {t("rep.e.foundN")}</p>
          )}
          {found && found.length === 0 && <p className="text-sm text-ink-3">{t("rep.e.foundNone")}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-[0.9375rem] font-medium">{t("f.evidence")}</span>
          <PortalDemands>{t("rep.portalDemands")}</PortalDemands>
        </div>
        <p className="text-sm leading-[1.6] text-ink-2 max-w-prose">{t("f.evidence.was")}</p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => addFiles(e.target.files)}
          className="sr-only"
        />
        <Button onClick={() => inputRef.current?.click()} size="md" variant="secondary" disabled={busy}>
          {busy ? `${t("rep.e.processing")}…` : t("rep.e.addFiles")}
        </Button>

        {draft.files.length > 0 && (
          <ul className="divide-y divide-rule border-t border-rule">
            {draft.files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="py-3 flex items-start justify-between gap-4">
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] break-all">{f.name}</span>
                  <span className="num text-xs text-ink-3">
                    {f.compressedFrom
                      ? `${formatBytes(f.compressedFrom)} → ${formatBytes(f.size)}`
                      : formatBytes(f.size)}
                  </span>
                  {f.compressedFrom && (
                    <span className="mt-0.5 block text-xs text-done">{t("rep.e.compressed")}</span>
                  )}
                </span>
                <button
                  onClick={() => patch({ files: draft.files.filter((_, j) => j !== i) })}
                  className="text-sm text-ink-3 hover:text-urgent underline underline-offset-4 shrink-0"
                >
                  {t("rep.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── 3. Suspect ──────────────────────────────────────────────────────────────

const ID_KINDS = ["upi", "phone", "account", "url", "email", "handle", "ref"] as const;

export function StageSuspect({ draft, patch }: StageProps) {
  const t = useT();
  const [kind, setKind] = useState<string>("upi");
  const [value, setValue] = useState("");

  const add = () => {
    if (!value.trim()) return;
    patch({ suspectIds: dedupe([...draft.suspectIds, { kind, value: value.trim() }]) });
    setValue("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl">{t("rep.s.h")}</h2>
        <p className="mt-2 text-[1.0625rem] leading-[1.6] text-ink-2 max-w-prose">{t("rep.s.sub")}</p>
      </div>

      {draft.suspectIds.length > 0 ? (
        <div>
          <p className="label">{t("rep.s.found")}</p>
          <p className="mt-2 text-sm leading-[1.6] text-ink-2 max-w-prose">{t("f.suspectIds.why")}</p>
          <ul className="mt-4 divide-y divide-rule border-t border-rule">
            {draft.suspectIds.map((s, i) => (
              <li key={`${s.kind}-${s.value}-${i}`} className="py-3 flex items-center justify-between gap-4">
                <span className="min-w-0 flex items-baseline gap-3">
                  <span className="num text-[0.6875rem] uppercase tracking-wider text-ink-3 shrink-0 w-14">{s.kind}</span>
                  <span className="num text-[0.9375rem] break-all">{s.value}</span>
                </span>
                <button
                  onClick={() => patch({ suspectIds: draft.suspectIds.filter((_, j) => j !== i) })}
                  className="text-sm text-ink-3 hover:text-urgent underline underline-offset-4 shrink-0"
                >
                  {t("rep.notTheirs")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[0.9375rem] text-ink-2">{t("rep.s.none")}</p>
      )}

      <div className="sheet px-5 py-5 space-y-4">
        <p className="label">{t("rep.s.addOne")}</p>
        <div className="flex flex-wrap gap-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label={t("rep.s.idKind")}
            className="h-12 px-3 bg-raised border border-rule-strong rounded-ctl focus:outline-none focus:border-ink"
          >
            {ID_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder={t("rep.s.idValue")}
            aria-label={t("rep.s.idValue")}
            className="flex-1 min-w-[12rem] h-12 px-3.5 bg-raised border border-rule-strong rounded-ctl font-mono focus:outline-none focus:border-ink"
          />
          <Button onClick={add} size="md" variant="secondary">{t("rep.add")}</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field
          label={t("f.suspectName")}
          optional
          value={draft.suspectName ?? ""}
          onChange={(e) => patch({ suspectName: e.target.value })}
        />
        <Field
          label={t("f.suspectAddress")}
          optional
          value={draft.suspectAddress ?? ""}
          onChange={(e) => patch({ suspectAddress: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── 4. You ──────────────────────────────────────────────────────────────────

export function StageYou({ draft, patch }: StageProps) {
  const t = useT();
  const officers = findOfficers(draft.state);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl">{t("rep.y.h")}</h2>
        <p className="mt-2 text-[1.0625rem] leading-[1.6] text-ink-2 max-w-prose">{t("rep.y.sub")}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field
          label={t("f.name")}
          value={draft.name ?? ""}
          autoComplete="name"
          onChange={(e) => patch({ name: e.target.value })}
        />
        <Field
          label={t("f.mobile")}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          mono
          value={draft.mobile ?? ""}
          onChange={(e) => patch({ mobile: e.target.value.replace(/[^\d]/g, "").slice(0, 10) })}
          hint={t("f.mobile.why")}
        />
        <Field
          label={t("f.email")}
          type="email"
          optional
          autoComplete="email"
          value={draft.email ?? ""}
          onChange={(e) => patch({ email: e.target.value })}
        />
        <label className="space-y-1.5">
          <span className="block text-[0.9375rem] font-medium">{t("f.state")}</span>
          <select
            value={draft.state ?? ""}
            onChange={(e) => patch({ state: e.target.value })}
            className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl focus:outline-none focus:border-ink"
          >
            <option value="">—</option>
            {OFFICERS.map((o) => (
              <option key={o.state} value={o.state}>{o.state}</option>
            ))}
          </select>
          <span className="block text-sm text-ink-3">{t("f.state.why")}</span>
        </label>
        <Field
          label={t("f.district")}
          value={draft.district ?? ""}
          onChange={(e) => patch({ district: e.target.value })}
        />
        <Field
          label={t("f.pincode")}
          optional
          inputMode="numeric"
          mono
          value={draft.pincode ?? ""}
          onChange={(e) => patch({ pincode: e.target.value.replace(/[^\d]/g, "").slice(0, 6) })}
        />
      </div>

      {officers && (
        <p className="sheet px-4 py-3 text-sm leading-[1.6] text-ink-2">
          {t("f.policeStation.why")}{" "}
          <span className="num">{officers.nodal.rank} · {officers.state}</span>
        </p>
      )}

      {/* Everything the portal refuses to proceed without, and we do not. */}
      <details className="border-t border-rule pt-5">
        <summary className="cursor-pointer text-[0.9375rem] text-ink-2 hover:text-ink">
          {t("rep.y.alsoAsks")}
        </summary>
        <div className="mt-5 space-y-6">
          <p className="text-sm leading-[1.65] text-ink-2 max-w-prose">{t("rep.y.alsoBody")}</p>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field
              label={t("f.guardianName")}
              optional
              value={draft.guardianName ?? ""}
              onChange={(e) => patch({ guardianName: e.target.value })}
              hint={t("f.guardianName.was")}
            />
            <Field
              label={t("f.dob")}
              type="date"
              optional
              mono
              value={draft.dob ?? ""}
              onChange={(e) => patch({ dob: e.target.value })}
            />
            <label className="space-y-1.5">
              <span className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-medium">
                <span>{t("f.gender")}</span>
                <PortalDemands>{t("rep.portalDemands")}</PortalDemands>
              </span>
              <select
                value={draft.gender ?? ""}
                onChange={(e) => patch({ gender: e.target.value })}
                className="w-full h-12 px-3 bg-raised border border-rule-strong rounded-ctl focus:outline-none focus:border-ink"
              >
                <option value="">—</option>
                <option value="female">{t("rep.y.female")}</option>
                <option value="male">{t("rep.y.male")}</option>
                <option value="transgender">{t("rep.y.transgender")}</option>
              </select>
              <span className="block text-sm text-ink-3">{t("f.gender.was")}</span>
            </label>
            <Field
              label={t("f.relationship")}
              optional
              value={draft.relationship ?? ""}
              onChange={(e) => patch({ relationship: e.target.value })}
            />
          </div>

          <TextArea
            label={t("f.address")}
            optional
            rows={3}
            value={draft.address ?? ""}
            onChange={(e) => patch({ address: e.target.value })}
          />

          <div className="sheet px-4 py-3">
            <p className="text-[0.9375rem] font-medium">{t("f.nationalId")}</p>
            <p className="mt-1.5 text-sm leading-[1.6] text-ink-2 max-w-prose">{t("f.nationalId.why")}</p>
          </div>
        </div>
      </details>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function dedupe(ids: SuspectId[]): SuspectId[] {
  const seen = new Set<string>();
  return ids.filter((i) => {
    const k = `${i.kind}:${i.value.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
