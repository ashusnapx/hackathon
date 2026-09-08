"use client";

import { Aftercare } from "@/components/case/Aftercare";
import { AskPanel } from "@/components/case/AskPanel";
import { CallRecord } from "@/components/case/CallRecord";
import { CaseAccess } from "@/components/case/CaseAccess";
import { CaseBuilder } from "@/components/case/CaseBuilder";
import { CaseEmail } from "@/components/case/CaseEmail";
import { CaseTimeline } from "@/components/case/CaseTimeline";
import { Completeness } from "@/components/case/Completeness";
import { DeleteCase } from "@/components/case/DeleteCase";
import { DocumentsPanel } from "@/components/case/DocumentsPanel";
import { Escalation } from "@/components/case/Escalation";
import { EvidenceVault } from "@/components/case/EvidenceVault";
import { Icons, type Door } from "@/components/case/CaseDoors";
import { MoneyLedger } from "@/components/case/MoneyLedger";
import { RbiProtectionCard } from "@/components/case/RbiProtectionCard";
import { TrackList } from "@/components/case/TrackList";
import { calculateReadiness } from "@/lib/case/evidence";
import { inr, moneyLedger } from "@/lib/case/money";
import type { DeleteCaseResult, useCase } from "@/lib/case/store";
import { completeness, liveTracks } from "@/lib/case/tracks";
import type { CaseFile } from "@/lib/case/types";
import type { useT } from "@/lib/i18n/context";

/**
 * Every door on the case, in the order somebody is likely to want it.
 *
 * These are the six old tabs and the eight old accordion panels, flattened into
 * one list. Nothing was dropped in the move: if it was reachable before, it is
 * a row here. The order is by need rather than by how the code is arranged —
 * the steps to take first, the money second because "where is my money" is the
 * question everybody arrives with, and the sharing and deleting controls last
 * because they are the only thing here nobody needs while distressed.
 *
 * Each row carries its own state, so the list answers most questions without
 * being opened at all.
 */
export function buildDoors({ caseFile, t, update, persistUpdate, toggleTrack, onDelete, go }: {
  caseFile: CaseFile;
  t: ReturnType<typeof useT>;
  update: ReturnType<typeof useCase>["update"];
  persistUpdate: ReturnType<typeof useCase>["persistUpdate"];
  toggleTrack: ReturnType<typeof useCase>["toggleTrack"];
  onDelete: () => Promise<DeleteCaseResult>;
  /** Move to another door. Supplied by the route, which owns the router. */
  go?: (doorId: string) => void;
}): Door[] {
  const ledger = moneyLedger(caseFile);
  const readiness = calculateReadiness(caseFile);
  const strength = completeness(caseFile).score;
  const events = caseFile.events?.length ?? 0;
  const unaccounted = ledger.slices.find((slice) => slice.state === "unknown")?.amountInr ?? 0;
  const steps = liveTracks(caseFile);
  const stepsDone = steps.filter((track) => track.state === "done").length;

  const doors: Door[] = [
    {
      id: "steps",
    ownHeading: true,
      title: "door.steps",
      icon: Icons.steps,
      summary: t("door.stepsN").replace("{n}", String(stepsDone)).replace("{total}", String(steps.length)),
      state: stepsDone === steps.length && steps.length > 0 ? "done" : stepsDone > 0 ? "wait" : "urgent",
      stateLabel: stepsDone === steps.length && steps.length > 0 ? t("door.stDone") : t("door.stTodo"),
      render: () => (
        <TrackList
          caseFile={caseFile}
          toggleTrack={toggleTrack}
          update={update}
          updateBank={(patch) => update((current) => ({ bank: { ...current.bank, ...patch } }))}
          onGoToDocs={() => go?.("papers")}
        />
      ),
    },
  ];

  if (ledger.disputedInr > 0 || ledger.hasMovements) {
    doors.push({
      id: "money",
    ownHeading: true,
      title: "door.money",
      icon: Icons.money,
      // The closed row answers the question, so somebody who only wants to know
      // whether anything has come back never has to open anything.
      summary: unaccounted > 0
        ? `${inr(ledger.disputedInr)} · ${inr(unaccounted)} ${t("money.unknown").toLowerCase()}`
        : `${inr(ledger.disputedInr)}`,
      state: unaccounted > 0 ? "urgent" : ledger.hasMovements ? "wait" : "none",
      stateLabel: ledger.hasMovements ? t("door.stWaiting") : t("door.stNone"),
      render: () => <MoneyLedger caseFile={caseFile} update={update} />,
    });
  }

  doors.push({
    id: "evidence",
    ownHeading: true,
    title: "door.evidence",
    icon: Icons.evidence,
    summary: t("door.evidenceN")
      .replace("{n}", String(readiness.counts.added))
      .replace("{total}", String(readiness.counts.totalApplicable)),
    state: readiness.level === "READY" ? "done" : readiness.level === "PARTIALLY_READY" ? "wait" : "urgent",
    stateLabel: t("door.stStrength").replace("{n}", String(strength)),
    render: () => (
      <>
        <EvidenceVault caseFile={caseFile} update={update} persistUpdate={persistUpdate} />
        <div className="mt-8">
          <Completeness caseFile={caseFile} />
        </div>
      </>
    ),
  });

  doors.push({
    id: "papers",
    ownHeading: true,
    title: "door.papers",
    icon: Icons.papers,
    summary: t("door.papersSub"),
    render: () => <DocumentsPanel caseFile={caseFile} update={update} />,
  });

  if (caseFile.voiceCall) {
    doors.push({
      id: "recording",
    ownHeading: true,
      title: "door.recording",
      icon: Icons.call,
      summary: t("door.recordingSub"),
      render: () => (
        <CallRecord
          caseFile={caseFile}
          transcriptToken={caseFile.voiceCall?.transcriptToken}
          onApply={(patch) => update(() => patch)}
          // The conversation is written into the case the first time it is read
          // back, so it outlives the one-hour provider capability.
          onCapture={(patch) => update(() => patch)}
        />
      ),
    });
  }

  if (events > 0) {
    doors.push({
      id: "timeline",
    ownHeading: true,
      title: "door.timeline",
      icon: Icons.clock,
      summary: t("idx.timelineN").replace("{n}", String(events)),
      render: () => <CaseTimeline caseFile={caseFile} />,
    });
  }

  doors.push({
    id: "ask",
    ownHeading: true,
    title: "door.ask",
    icon: Icons.ask,
    summary: t("door.askSub"),
    render: () => <AskPanel caseFile={caseFile} />,
  });

  doors.push({
    id: "rights",
    ownHeading: true,
    title: "door.rights",
    icon: Icons.rights,
    summary: t("door.rightsSub"),
    render: () => <RbiProtectionCard caseFile={caseFile} />,
  });

  doors.push({
    id: "escalate",
    title: "door.escalate",
    icon: Icons.escalate,
    summary: t("door.escalateSub"),
    render: () => <Escalation caseFile={caseFile} />,
  });

  doors.push({
    id: "care",
    title: "door.care",
    icon: Icons.care,
    summary: t("door.careSub"),
    render: () => <Aftercare />,
  });

  doors.push({
    id: "manage",
    ownHeading: true,
    title: "door.manage",
    icon: Icons.manage,
    summary: t("door.manageSub"),
    render: () => (
      <div className="space-y-6">
        <CaseBuilder caseFile={caseFile} update={update} />
        <CaseAccess caseFile={caseFile} />
        <CaseEmail caseFile={caseFile} />
        <DeleteCase onDelete={onDelete} />
      </div>
    ),
  });

  return doors;
}

/**
 * What the page says when it is asked to read itself out.
 *
 * Written as sentences rather than assembled from what is on screen. Reading
 * the DOM would produce "Right now, comma, one, comma, call one nine three
 * zero" — the shape of the layout instead of the meaning of it — and this is
 * being listened to by somebody who may have no other way in.
 */
export function spokenSummary(caseFile: CaseFile, t: ReturnType<typeof useT>): string {
  const ledger = moneyLedger(caseFile);
  const next = liveTracks(caseFile).find((track) => track.state === "due" || track.state === "upcoming");

  const lines = [
    `${t("case.ref")} ${caseFile.ref}.`,
    ledger.disputedInr > 0 ? `${t("money.of")} ${inr(ledger.disputedInr)}.` : "",
    next ? `${t("plan.now")}: ${t(next.def.titleKey)}.` : "",
    t("case.notFiledAloud"),
  ];
  return lines.filter(Boolean).join(" ");
}
