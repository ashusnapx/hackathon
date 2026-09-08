"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Emphasis } from "@/components/ui/Emphasis";
import { StepText } from "@/components/ui/StepText";
import { daysLeftFor, type DaysLeftTone } from "@/lib/case/days-left";
import { BankDesk } from "@/components/case/BankDesk";
import { DocModal } from "@/components/case/DocModal";
import { Countdown } from "./Countdown";
import { costOfDelay } from "@/lib/case/cost-of-delay";
import { liveTracks, type LiveTrack } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import type { CaseFile, TrackId, TrackState } from "@/lib/case/types";
import type { DictKey } from "@/lib/i18n/dict/en";
import { parseBankNoticeDate, toLocalDateTimeInput } from "@/lib/case/bank-notice";
import { cn, fmtDate } from "@/lib/utils";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const NA_REASON: Record<NonNullable<LiveTrack["naReason"]>, DictKey> = {
  "not-financial": "track.na.notFinancial",
  "other-category": "track.na.otherCategory",
  "not-unauthorised": "track.na.notUnauthorised",
};

const COUNT_STYLE: Record<DaysLeftTone, string> = {
  gone: "bg-urgent-soft text-urgent-ink border-urgent/40",
  today: "bg-urgent-soft text-urgent-ink border-urgent/40",
  urgent: "bg-urgent-soft text-urgent-ink border-urgent/30",
  soon: "bg-wait-soft text-ink-2 border-wait/30",
  later: "bg-sunk text-ink-3 border-rule",
};

/** "3 working days left", "Today", "2 days late". */
function countLabel(left: ReturnType<typeof daysLeftFor>, t: ReturnType<typeof useT>): string {
  if (!left) return "";
  if (left.tone === "gone") {
    return t("track.nLate").replace("{n}", String(Math.max(1, Math.abs(left.days))));
  }
  if (left.days === 0) return t("track.today");
  const key = left.working ? "track.nWorkingLeft" : "track.nLeft";
  return t(key).replace("{n}", String(left.days));
}

const STATE_LABEL: Record<TrackState, Parameters<ReturnType<typeof useT>>[0]> = {
  due: "track.status.due",
  upcoming: "track.status.upcoming",
  done: "track.status.done",
  missed: "track.status.missed",
  na: "track.status.na",
};

const STATE_STYLE: Record<TrackState, string> = {
  due: "bg-urgent-soft text-urgent-ink border-urgent/30",
  upcoming: "bg-sunk text-ink-3 border-rule",
  done: "bg-done-soft text-done border-done/25",
  missed: "bg-urgent-soft text-urgent-ink border-urgent/40",
  na: "bg-sunk text-ink-3 border-rule",
};

interface Props {
  caseFile: CaseFile;
  toggleTrack: (id: TrackId, done: boolean, extra?: { ref?: string; doneAt?: string }) => void;
  updateBank: (patch: Partial<CaseFile["bank"]>) => void;
  onGoToDocs: () => void;
  /** Writes the picked bank and anything the letter modal changes. */
  update: (patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => void;
}

export function TrackList({ caseFile, toggleTrack, updateBank, onGoToDocs, update }: Props) {
  const t = useT();
  const tracks = liveTracks(caseFile);
  const [open, setOpen] = useState<TrackId | null>(tracks.find((x) => x.state === "due")?.def.id ?? null);

  const doneCount = tracks.filter((x) => x.state === "done").length;
  const applicable = tracks.filter((x) => x.state !== "na").length;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">{t("case.tracksTitle")}</h2>
          <p className="mt-1.5 text-[0.9375rem] text-ink-2">{t("case.tracksSub")}</p>
        </div>
        <p className="num text-sm text-ink-3">
          {doneCount} / {applicable}
        </p>
      </div>

      <ol className="mt-6 border-t border-rule-strong">
        {tracks.map((track, i) => (
          <TrackRow
            key={track.def.id}
            track={track}
            roman={ROMAN[i]}
            open={open === track.def.id}
            onToggleOpen={() => setOpen((o) => (o === track.def.id ? null : track.def.id))}
            onMark={(done, extra) => toggleTrack(track.def.id, done, extra)}
            bank={caseFile.bank}
            onUpdateBank={updateBank}
            onGoToDocs={onGoToDocs}
            caseFile={caseFile}
            update={update}
            hasDoc={Boolean(track.def.doc && caseFile.docs[track.def.doc])}
            incidentAt={caseFile.incidentAt ?? caseFile.triage?.incidentAt}
          />
        ))}
      </ol>
    </section>
  );
}

function TrackRow({
  track, roman, open, onToggleOpen, onMark, bank, onUpdateBank, onGoToDocs, hasDoc, incidentAt, caseFile, update,
}: {
  track: LiveTrack;
  roman: string;
  open: boolean;
  onToggleOpen: () => void;
  onMark: (done: boolean, extra?: { ref?: string; doneAt?: string }) => void;
  bank: CaseFile["bank"];
  onUpdateBank: (patch: Partial<CaseFile["bank"]>) => void;
  onGoToDocs: () => void;
  hasDoc: boolean;
  caseFile: CaseFile;
  update: Props["update"];
  /** Picks which RBI framework the bank deadline is measured against. */
  incidentAt?: string;
}) {
  const t = useT();
  const { def, state, deadline, naReason } = track;
  const left = daysLeftFor(track);
  const [docOpen, setDocOpen] = useState(false);
  const [ackRef, setAckRef] = useState(bank.ackRef ?? "");
  const [bankNoticeAt, setBankNoticeAt] = useState(toLocalDateTimeInput(bank.notifiedAt));
  const [noticeError, setNoticeError] = useState<"required" | "invalid" | "future" | null>(null);
  const [responseDays, setResponseDays] = useState(
    bank.ombudsmanResponseTimelineDays === undefined ? "" : String(bank.ombudsmanResponseTimelineDays),
  );
  const [replyAt, setReplyAt] = useState(toLocalDateTimeInput(bank.dissatisfiedReplyAt));
  const [lastCommunicationAt, setLastCommunicationAt] = useState(toLocalDateTimeInput(bank.lastCommunicationAt));
  const [ombudsmanDateError, setOmbudsmanDateError] = useState(false);
  const [ombudsmanDaysError, setOmbudsmanDaysError] = useState(false);

  const muted = state === "na" || state === "upcoming";
  const dateLabel = track.dateKind === "opens"
    ? t("track.opensOn")
    : def.id === "ombudsman" && track.dateKind === "deadline"
      ? t("track.fileBy")
      : null;

  const markDone = () => {
    if (def.id !== "bank-notice") {
      onMark(true);
      return;
    }
    const parsed = parseBankNoticeDate(bankNoticeAt);
    if (!parsed.ok) {
      setNoticeError(parsed.reason);
      return;
    }
    setNoticeError(null);
    onMark(true, { ...(ackRef ? { ref: ackRef } : {}), doneAt: parsed.iso });
  };

  const commitOmbudsmanDate = (
    field: "dissatisfiedReplyAt" | "lastCommunicationAt",
    value: string,
  ) => {
    if (!value) {
      setOmbudsmanDateError(false);
      onUpdateBank({ [field]: undefined });
      return;
    }
    const parsed = parseBankNoticeDate(value);
    if (!parsed.ok) {
      setOmbudsmanDateError(true);
      return;
    }
    setOmbudsmanDateError(false);
    onUpdateBank({ [field]: parsed.iso });
  };

  const commitResponseDays = () => {
    if (!responseDays.trim()) {
      setOmbudsmanDaysError(false);
      onUpdateBank({ ombudsmanResponseTimelineDays: undefined });
      return;
    }
    const days = Number(responseDays);
    if (!Number.isInteger(days) || days < 30) {
      setOmbudsmanDaysError(true);
      return;
    }
    setOmbudsmanDaysError(false);
    onUpdateBank({ ombudsmanResponseTimelineDays: days });
  };

  return (
    <li className={cn("border-b border-rule", muted && "opacity-60")}>
      <button
        onClick={onToggleOpen}
        aria-expanded={open}
        className="w-full text-start flex items-start gap-4 sm:gap-5 py-4 hover:bg-sunk/60 transition-colors px-1 -mx-1"
      >
        <span
          className={cn(
            "num text-sm w-7 shrink-0 pt-1 text-end",
            state === "due" || state === "missed" ? "text-urgent" : state === "done" ? "text-done" : "text-ink-3",
          )}
          aria-hidden
        >
          {state === "done" ? "✓" : roman}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className={cn("text-lg leading-snug", state === "done" && "line-through decoration-1 text-ink-2")}>
              {t(def.titleKey)}
            </span>
            {/*
              A count, not an opinion.

              This read "Do now" or "Coming up". Everything says "do now" on the
              morning somebody loses their money, and by Thursday they cannot
              tell which of the six things saying it is the one about to close.
              A number changes on its own and sorts itself. Tracks with no
              statutory date keep the plain label rather than being given an
              invented countdown.
            */}
            <span
              className={cn(
                "chip px-1.5 py-0.5 rounded-ctl border shrink-0",
                left ? COUNT_STYLE[left.tone] : STATE_STYLE[state],
              )}
            >
              {left ? countLabel(left, t) : t(STATE_LABEL[state])}
            </span>
          </span>

          {/* The reason, where the row used to say only that it did not apply.
              Two of the three reasons are things the person can change, so a
              bare "not needed" was hiding an action from them. */}
          {state === "na" && naReason && (
            <span className="mt-1.5 block text-sm leading-[1.5] text-ink-3">
              <Emphasis>{t(NA_REASON[naReason])}</Emphasis>
            </span>
          )}

          <span className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-ink-3">
            <span>{t(def.dueKey)}</span>
            {deadline && state !== "done" && state !== "na" && (
              <>
                <span className="num">
                  {dateLabel ? `${dateLabel}: ` : ""}{fmtDate(deadline.toISOString())}
                </span>
                {!def.workingDayEstimate && <Countdown target={deadline} />}
              </>
            )}
          </span>
          {deadline && def.workingDayEstimate && state !== "done" && state !== "na" && (
            <span className="mt-1 block text-xs leading-snug text-ink-3">{t("track.calendarCaveat")}</span>
          )}
          {/* A date on its own is an instruction to hurry, which everybody has
              already worked out. What changes the day after is the reason. */}
          {(() => {
            const cost = state === "done" || state === "na" ? null : costOfDelay(def.id, incidentAt);
            if (!cost) return null;
            const good = cost.kind === "entitlement";
            return (
              <span
                className={cn(
                  "mt-2 block rounded-ctl border px-3 py-2 text-xs leading-[1.6]",
                  good ? "border-done/30 bg-done-soft text-ink-2" : "border-wait/30 bg-wait-soft text-ink-2",
                )}
              >
                <span className="font-semibold">{t(good ? "delay.labelGood" : "delay.label")}: </span>
                <Emphasis>{t(cost.bodyKey)}</Emphasis>{" "}

                {/* The ladder, when the rule is one. Four short lines beat four
                    sentences: the person is looking for the rung they are
                    standing on, not reading an argument. */}
                {cost.rungKeys && (
                  <span className="mt-2 block space-y-1">
                    {cost.rungKeys.map((key) => (
                      <span key={key} className="flex gap-2">
                        <span aria-hidden className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                        <span><Emphasis>{t(key)}</Emphasis></span>
                      </span>
                    ))}
                  </span>
                )}

                <a
                  href={cost.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="underline underline-offset-4 hover:text-ink"
                >
                  {cost.sourceTitle}
                </a>
              </span>
            );
          })()}
        </span>

        <span
          className={cn("shrink-0 mt-2 text-ink-3 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="pb-6 ps-[3rem] pe-1 space-y-5 rise">
          {/*
            The steps, first and unfolded.

            This used to open with two paragraphs — why it matters, then how to
            do it — followed by the legal citation. All of it was true and none
            of it was read: the person reading has lost money in the last few
            hours and needs the next tap, not the reasoning behind it. The
            reasoning is still here, one fold down, for the minority who want it
            and for anybody checking our work.
          */}
          {def.stepKeys && (
            <ol className="max-w-2xl space-y-3">
              {def.stepKeys.map((key, i) => (
                <li key={key} className="flex gap-3.5">
                  <span
                    className="num mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-rule-strong text-[0.8125rem] font-semibold text-ink-2"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-[1rem] leading-[1.5]"><StepText onOpenDoc={hasDoc ? () => setDocOpen(true) : undefined} docLabel={t("track.openDoc")}>{t(key)}</StepText></span>
                </li>
              ))}
            </ol>
          )}

          {/* Folded, and second. Everything that was on top before. */}
          <details className="border-t border-rule pt-4">
            <summary className="cursor-pointer text-sm font-medium text-ink-2 min-h-11 flex items-center">
              {t("track.detailH")}
            </summary>
            <div className="mt-3 space-y-4">
              <p className="text-[0.9375rem] leading-[1.65] text-ink-2 max-w-2xl">{t(def.whyKey)}</p>
              <p className="text-[0.9375rem] leading-[1.65] text-ink-2 max-w-2xl">{t(def.howKey)}</p>
            </div>
          </details>

          {def.source && (
            <div className="border-s-2 border-rule-strong ps-3 text-xs leading-relaxed text-ink-3">
              <p className="label">{t("track.source")}</p>
              <a href={def.source.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center font-medium text-ink-2 underline underline-offset-4">
                {def.source.title} ↗
              </a>
              <p className="mt-1 font-mono">
                {def.source.id}
                {def.source.provisions?.length ? ` · ${t("track.provisions")} ${def.source.provisions.join(", ")}` : ""}
                {def.source.effectiveOn ? ` · ${t("track.effective")} ${fmtDate(def.source.effectiveOn)}` : ""}
              </p>
              {def.source.faqUrl && (
                <a href={def.source.faqUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block underline underline-offset-4">
                  {t("track.faq")} ↗
                </a>
              )}
            </div>
          )}

          {/* Which bank, where that bank takes complaints, and what to do if
              the person walks into a branch. Only on this track: it is the one
              step whose "how" depends on who they bank with. */}
          {def.id === "bank-notice" && <BankDesk caseFile={caseFile} update={update} />}

          {def.doc && docOpen && (
            <DocModal
              caseFile={caseFile}
              docKey={def.doc as Parameters<typeof DocModal>[0]["docKey"]}
              update={update}
              onClose={() => setDocOpen(false)}
            />
          )}

          {def.id === "bank-notice" && state !== "done" && (
            <div className="max-w-xl space-y-4 border-s-2 border-urgent/45 ps-4">
              <div>
                <label htmlFor={`bank-notice-at-${roman}`} className="label">
                  {t("track.bank.noticeAt")}
                </label>
                <input
                  id={`bank-notice-at-${roman}`}
                  type="datetime-local"
                  required
                  value={bankNoticeAt}
                  onChange={(event) => {
                    setBankNoticeAt(event.target.value);
                    setNoticeError(null);
                  }}
                  aria-invalid={Boolean(noticeError)}
                  aria-describedby={`bank-notice-hint-${roman}`}
                  className="mt-2 w-full max-w-sm h-11 px-3 bg-raised border border-rule-strong rounded-ctl num text-sm focus:outline-none focus:border-ink"
                />
                <p id={`bank-notice-hint-${roman}`} className="mt-2 text-xs leading-relaxed text-ink-3">
                  {t("track.bank.noticeHint")}
                </p>
                {noticeError && (
                  <p role="alert" className="mt-2 text-sm text-urgent">
                    {t(noticeError === "future" ? "track.bank.noticeFuture" : "track.bank.noticeRequired")}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={`bank-ack-${roman}`} className="label">{t("track.bank.ackRef")}</label>
                <input
                  id={`bank-ack-${roman}`}
                  value={ackRef}
                  onChange={(event) => setAckRef(event.target.value)}
                  className="mt-2 w-full max-w-sm h-11 px-3 bg-raised border border-rule-strong rounded-ctl num text-sm focus:outline-none focus:border-ink"
                />
              </div>
            </div>
          )}

          {def.id === "ombudsman" && state !== "na" && (
            <div className="max-w-2xl border border-rule rounded-ctl bg-sunk/45 p-4">
              <p className="label">{t("track.ombudsman.timingTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{t("track.ombudsman.timingBody")}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-ink-2">
                  <span className="block">{t("track.ombudsman.replyAt")}</span>
                  <input
                    type="datetime-local"
                    value={replyAt}
                    onChange={(event) => setReplyAt(event.target.value)}
                    onBlur={() => commitOmbudsmanDate("dissatisfiedReplyAt", replyAt)}
                    className="mt-1.5 w-full h-11 px-3 bg-raised border border-rule-strong rounded-ctl num text-sm focus:outline-none focus:border-ink"
                  />
                </label>
                <label className="text-sm text-ink-2">
                  <span className="block">{t("track.ombudsman.lastCommunicationAt")}</span>
                  <input
                    type="datetime-local"
                    value={lastCommunicationAt}
                    onChange={(event) => setLastCommunicationAt(event.target.value)}
                    onBlur={() => commitOmbudsmanDate("lastCommunicationAt", lastCommunicationAt)}
                    className="mt-1.5 w-full h-11 px-3 bg-raised border border-rule-strong rounded-ctl num text-sm focus:outline-none focus:border-ink"
                  />
                </label>
                <label className="text-sm text-ink-2 sm:col-span-2">
                  <span className="block">{t("track.ombudsman.responseDays")}</span>
                  <input
                    type="number"
                    min={30}
                    step={1}
                    inputMode="numeric"
                    value={responseDays}
                    onChange={(event) => setResponseDays(event.target.value)}
                    onBlur={commitResponseDays}
                    aria-describedby={`ombudsman-days-hint-${roman}`}
                    className="mt-1.5 w-full max-w-[10rem] h-11 px-3 bg-raised border border-rule-strong rounded-ctl num text-sm focus:outline-none focus:border-ink"
                  />
                  <span id={`ombudsman-days-hint-${roman}`} className="mt-1.5 block text-xs leading-relaxed text-ink-3">
                    {t("track.ombudsman.responseHint")}
                  </span>
                </label>
              </div>
              {ombudsmanDateError && <p role="alert" className="mt-3 text-sm text-urgent">{t("track.ombudsman.dateError")}</p>}
              {ombudsmanDaysError && <p role="alert" className="mt-3 text-sm text-urgent">{t("track.ombudsman.daysError")}</p>}
            </div>
          )}

          {state !== "na" && (
            <div className="flex flex-wrap items-center gap-3">
              {def.action && (
                <Button href={def.action.href} size="sm" variant={def.action.tel ? "urgent" : "secondary"} external>
                  {t(def.action.labelKey)}
                </Button>
              )}
              {/*
                The letter, opened here.

                It used to send the person to the documents screen to find the
                right one among five and come back — and they would come back
                to the top of a list they were part way down. Now it opens over
                the step that asked for it, with the same controls it has in
                that screen. Without a draft yet, it still has to send them to
                the screen that can make one.
              */}
              {def.doc && (
                hasDoc ? (
                  <Button onClick={() => setDocOpen(true)} size="sm" variant="secondary">
                    {t("track.openLetter")}
                  </Button>
                ) : (
                  <Button onClick={onGoToDocs} size="sm" variant="secondary">
                    {t("doc.generate")}
                  </Button>
                )
              )}

              {state === "done" ? (
                <button
                  onClick={() => onMark(false)}
                  className="text-sm text-ink-3 hover:text-ink underline underline-offset-4"
                >
                  {t("track.undo")}
                </button>
              ) : (
                <Button onClick={markDone} size="sm">
                  {t("track.markDone")}
                </Button>
              )}
            </div>
          )}

        </div>
      )}
    </li>
  );
}
