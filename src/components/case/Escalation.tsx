"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OFFICERS, OFFICERS_CAPTURED_ON, OFFICERS_SOURCE, findOfficers } from "@/lib/case/officers";
import { liveTracks } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import type { CaseFile } from "@/lib/case/types";
import { fmtDate } from "@/lib/utils";

/**
 * What to do when nothing happens.
 *
 * Filing is the part everybody writes about. Being ignored afterwards is the
 * part every victim actually experiences, and the escalation path — a named
 * Nodal Officer and a named Grievance Officer in every state — is published
 * but never put in front of the person who needs it. This turns that table
 * into two buttons.
 */

/** A letter is only worth sending if it carries the numbers that identify the case. */
function escalationLetter(c: CaseFile, officer: string): string {
  const filed = c.tracks.find((t) => t.id === "ncrp")?.doneAt;
  const days = filed
    ? Math.max(0, Math.floor((Date.now() - new Date(filed).getTime()) / 86_400_000))
    : null;

  return `Respected ${officer},

I am a victim of cybercrime and I am writing because my complaint has not moved.

Complainant: ${c.victim.name || "[your full name]"}
Mobile: ${c.victim.phone || "[your mobile]"}
District and State: ${[c.victim.district, c.victim.state].filter(Boolean).join(", ") || "[district, state]"}
NCRP acknowledgement number: [your 14-digit number]
Date of incident: ${fmtDate(c.incidentAt || c.createdAt)}
${c.amount ? `Amount lost: Rs. ${c.amount.toLocaleString("en-IN")}\n` : ""}${filed ? `Complaint filed on NCRP: ${fmtDate(filed)}${days !== null ? ` (${days} days ago)` : ""}\n` : ""}
I have received no communication about the progress of my complaint, and I have not been told the name of the Investigating Officer handling it.

I request that you kindly:
1. inform me of the status of my complaint and the officer to whom it has been assigned;
2. direct that the beneficiary account be traced and the amount held be restored to me through the Money Restoration Module;
3. direct registration of an FIR if one has not already been registered.

I am willing to provide every document and to appear before the Investigating Officer as required.

Yours faithfully,
${c.victim.name || "[your full name]"}
${c.victim.phone || "[your mobile]"}`;
}

export function Escalation({ caseFile }: { caseFile: CaseFile }) {
  const t = useT();
  const matched = findOfficers(caseFile.victim.state);
  const [override, setOverride] = useState<string>("");

  const officers = useMemo(
    () => (override ? findOfficers(override) : matched),
    [override, matched],
  );

  // Escalating before anything has been filed is not escalation, it is noise.
  const filedAnything = liveTracks(caseFile).some((x) => x.state === "done");

  const mailto = (email: string, who: string) =>
    `mailto:${email}?subject=${encodeURIComponent(
      `Cyber fraud complaint - no progress - ${caseFile.victim.name || "complainant"}`,
    )}&body=${encodeURIComponent(escalationLetter(caseFile, who))}`;

  return (
    <section className="sheet overflow-hidden">
      <div className="px-5 py-4 border-b border-rule bg-sunk">
        <p className="label">{t("esc.kicker")}</p>
        <h3 className="mt-1.5 text-2xl">{t("esc.title")}</h3>
        <p className="mt-2 text-[0.9375rem] leading-snug text-ink-2 max-w-xl">{t("esc.sub")}</p>
      </div>

      <ol className="divide-y divide-rule">
        <Rung n="1" title={t("esc.io.t")} body={t("esc.io.b")} />

        <li className="px-5 py-4">
          <div className="flex items-start gap-4">
            <span className="num text-sm text-ink-3 w-4 shrink-0 pt-1" aria-hidden>2</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg leading-snug">{t("esc.nodal.t")}</p>
              <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-ink-2">{t("esc.nodal.b")}</p>

              {officers ? (
                <div className="mt-3">
                  <p className="num text-sm">
                    {officers.nodal.rank} · {officers.state}
                  </p>
                  <p className="num text-sm text-ink-3 break-all">{officers.nodal.email}</p>
                  <p className="mt-1 text-xs text-ink-3">
                    {t("esc.listedAs")} {officers.nodal.name} · {t("esc.capturedOn")}{" "}
                    <span className="num">{OFFICERS_CAPTURED_ON}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      href={mailto(officers.nodal.email, `${officers.nodal.rank}, Cyber Nodal Officer`)}
                      size="sm"
                      variant="secondary"
                    >
                      {t("esc.writeNodal")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-3">{t("esc.pickState")}</p>
              )}
            </div>
          </div>
        </li>

        <li className="px-5 py-4">
          <div className="flex items-start gap-4">
            <span className="num text-sm text-ink-3 w-4 shrink-0 pt-1" aria-hidden>3</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg leading-snug">{t("esc.griev.t")}</p>
              <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-ink-2">{t("esc.griev.b")}</p>

              {officers && (
                <div className="mt-3">
                  <p className="num text-sm">{officers.grievance.phone}</p>
                  <p className="num text-sm text-ink-3 break-all">{officers.grievance.email}</p>
                  <p className="mt-1 text-xs text-ink-3">
                    {t("esc.listedAs")} {officers.grievance.name}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button href={`tel:${officers.grievance.phone.replace(/[^\d+]/g, "")}`} size="sm" variant="urgent">
                      {t("esc.call")}
                    </Button>
                    <Button
                      href={mailto(officers.grievance.email, "Grievance Officer")}
                      size="sm"
                      variant="secondary"
                    >
                      {t("esc.writeGriev")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </li>

        <Rung n="4" title={t("esc.court.t")} body={t("esc.court.b")} />
      </ol>

      <div className="px-5 py-4 border-t border-rule bg-sunk space-y-3">
        <label className="block">
          <span className="label">{t("esc.state")}</span>
          <select
            value={override || officers?.state || ""}
            onChange={(e) => setOverride(e.target.value)}
            className="mt-1.5 w-full max-w-sm h-11 px-3 bg-raised border border-rule-strong rounded-ctl text-sm focus:outline-none focus:border-ink"
          >
            <option value="">{t("esc.pickState")}</option>
            {OFFICERS.map((o) => (
              <option key={o.state} value={o.state}>
                {o.state}
              </option>
            ))}
          </select>
        </label>

        <p className="text-xs leading-relaxed text-ink-3">
          {t("esc.source")}{" "}
          <a href={OFFICERS_SOURCE} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            mrm-ncrp.mha.gov.in
          </a>
          {!filedAnything && <> · {t("esc.fileFirst")}</>}
        </p>
      </div>
    </section>
  );
}

function Rung({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-4">
        <span className="num text-sm text-ink-3 w-4 shrink-0 pt-1" aria-hidden>
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg leading-snug">{title}</p>
          <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-ink-2">{body}</p>
        </div>
      </div>
    </li>
  );
}
