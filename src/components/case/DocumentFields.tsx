"use client";

import { findPlaceholders, remainingGaps, type PlaceholderField } from "@/lib/case/placeholders";
import type { CaseFile } from "@/lib/case/types";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * The gaps in the letter, as a form beside the letter.
 *
 * A draft with `[your full name]` in it is not a document, it is homework. This
 * puts the homework next to the answer: type a name here and it appears in the
 * text on the left as you type — and in every other letter that asked for it,
 * because these write to the case rather than to one document.
 *
 * It only ever offers gaps that this document actually has. The count at the
 * top is the honest one: it includes the instructions a draft addresses to the
 * reader, which no form can answer and which still have to be dealt with before
 * anything is handed over a counter.
 */
export function DocumentFields({
  caseFile,
  body,
  update,
}: {
  caseFile: CaseFile;
  body: string;
  update: (patch: (c: CaseFile) => Partial<CaseFile>) => void;
}) {
  const t = useT();
  const fields = findPlaceholders(body);
  const gaps = remainingGaps(body, caseFile);
  const notes = gaps.filter((gap) => gap.kind === "note");

  if (!fields.length && !gaps.length) {
    return (
      <aside className="sheet px-4 py-4">
        <p className="label">{t("fill.title")}</p>
        <p className="mt-2 text-sm leading-[1.55] text-done">{t("fill.none")}</p>
      </aside>
    );
  }

  return (
    <aside className="sheet px-4 py-4">
      <p className="label">{t("fill.title")}</p>
      <p
        className={cn("mt-2 text-sm leading-[1.55]", gaps.length ? "text-ink-2" : "text-done")}
        role="status"
        aria-live="polite"
      >
        {gaps.length
          ? `${gaps.length} ${gaps.length === 1 ? t("fill.gapOne") : t("fill.gapMany")}`
          : t("fill.complete")}
      </p>

      {fields.length > 0 && (
        <div className="mt-4 space-y-4">
          {fields.map((field) => (
            <Field key={field.id} field={field} caseFile={caseFile} update={update} />
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-5 rounded-ctl border border-wait/35 bg-wait-soft px-3 py-2.5">
          <p className="text-xs leading-[1.6] text-ink-2">{t("fill.readerGaps")}</p>
          <ul className="mt-2 space-y-1.5">
            {notes.map((note) => (
              <li key={note.text} className="text-xs leading-[1.5] text-ink-3">{note.text}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function Field({
  field,
  caseFile,
  update,
}: {
  field: PlaceholderField;
  caseFile: CaseFile;
  update: (patch: (c: CaseFile) => Partial<CaseFile>) => void;
}) {
  const t = useT();
  const value = field.read(caseFile);
  const id = `fill-${field.id}`;
  const shared = {
    id,
    value,
    // Straight through to the case: the preview on the left is rendered from
    // the same state, so it moves with the keystroke.
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update((current) => field.write(event.target.value, current)),
    className: cn(
      "mt-1.5 w-full rounded-ctl border bg-raised px-3 py-2 text-sm",
      value.trim() ? "border-rule" : "border-wait/50",
    ),
  };

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {field.labelText ?? (field.label ? t(field.label) : field.id)}
      </label>
      {field.hint && <p className="mt-0.5 text-xs leading-[1.5] text-ink-3">{t(field.hint)}</p>}
      {field.kind === "textarea"
        ? <textarea {...shared} rows={3} />
        : (
          <input
            {...shared}
            type={field.kind === "date" ? "date" : field.kind === "datetime" ? "datetime-local" : field.kind === "tel" ? "tel" : "text"}
            inputMode={field.kind === "tel" ? "tel" : undefined}
          />
        )}
    </div>
  );
}
