"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Countdown } from "./Countdown";
import { liveTracks, type LiveTrack } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import type { CaseFile, TrackId, TrackState } from "@/lib/case/types";
import { cn, fmtDate } from "@/lib/utils";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

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
  toggleTrack: (id: TrackId, done: boolean, extra?: { ref?: string }) => void;
  onGoToDocs: () => void;
}

export function TrackList({ caseFile, toggleTrack, onGoToDocs }: Props) {
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
            onGoToDocs={onGoToDocs}
            hasDoc={Boolean(track.def.doc && caseFile.docs[track.def.doc])}
          />
        ))}
      </ol>
    </section>
  );
}

function TrackRow({
  track, roman, open, onToggleOpen, onMark, onGoToDocs, hasDoc,
}: {
  track: LiveTrack;
  roman: string;
  open: boolean;
  onToggleOpen: () => void;
  onMark: (done: boolean, extra?: { ref?: string }) => void;
  onGoToDocs: () => void;
  hasDoc: boolean;
}) {
  const t = useT();
  const { def, state, deadline } = track;
  const [ackRef, setAckRef] = useState("");

  const muted = state === "na" || state === "upcoming";

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
            <span
              className={cn(
                "chip px-1.5 py-0.5 rounded-ctl border shrink-0",
                STATE_STYLE[state],
              )}
            >
              {t(STATE_LABEL[state])}
            </span>
          </span>

          <span className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-ink-3">
            <span>{t(def.dueKey)}</span>
            {deadline && state !== "done" && state !== "na" && (
              <>
                <span className="num">{fmtDate(deadline.toISOString())}</span>
                <Countdown target={deadline} />
              </>
            )}
          </span>
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
          <div>
            <p className="label">{t("track.why")}</p>
            <p className="mt-1.5 text-[0.9375rem] leading-[1.65] text-ink-2 max-w-2xl">{t(def.whyKey)}</p>
          </div>

          <div>
            <p className="label">{t("track.how")}</p>
            <p className="mt-1.5 text-[0.9375rem] leading-[1.65] text-ink-2 max-w-2xl">{t(def.howKey)}</p>
          </div>

          {state !== "na" && (
            <div className="flex flex-wrap items-center gap-3">
              {def.action && (
                <Button href={def.action.href} size="sm" variant={def.action.tel ? "urgent" : "secondary"} external>
                  {t(def.action.labelKey)}
                </Button>
              )}
              {def.doc && (
                <Button onClick={onGoToDocs} size="sm" variant="secondary">
                  {hasDoc ? t("case.tabDocs") : t("doc.generate")}
                </Button>
              )}

              {state === "done" ? (
                <button
                  onClick={() => onMark(false)}
                  className="text-sm text-ink-3 hover:text-ink underline underline-offset-4"
                >
                  {t("track.undo")}
                </button>
              ) : (
                <Button onClick={() => onMark(true, ackRef ? { ref: ackRef } : undefined)} size="sm">
                  {t("track.markDone")}
                </Button>
              )}
            </div>
          )}

          {/* Completing this one starts the ten, thirty and ninety day clocks, so
              we capture the acknowledgement number at exactly that moment. */}
          {def.id === "bank-notice" && state !== "done" && (
            <input
              value={ackRef}
              onChange={(e) => setAckRef(e.target.value)}
              placeholder="Bank acknowledgement number (optional)"
              className="w-full max-w-sm h-11 px-3 bg-raised border border-rule-strong rounded-ctl num text-sm focus:outline-none focus:border-ink"
            />
          )}
        </div>
      )}
    </li>
  );
}
