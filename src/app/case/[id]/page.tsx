"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RecoveryWindow } from "@/components/case/RecoveryWindow";
import { NextAction } from "@/components/case/NextAction";
import { TrackList } from "@/components/case/TrackList";
import { EvidenceVault } from "@/components/case/EvidenceVault";
import { DocumentsPanel } from "@/components/case/DocumentsPanel";
import { AskPanel } from "@/components/case/AskPanel";
import { CaseBuilder } from "@/components/case/CaseBuilder";
import { Completeness } from "@/components/case/Completeness";
import { Escalation } from "@/components/case/Escalation";
import { Aftercare } from "@/components/case/Aftercare";
import { CaseHeader } from "@/components/case/CaseHeader";
import { useCase } from "@/lib/case/store";
import { isFinancial } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { calculateReadiness, getEvidence } from "@/lib/case/evidence";

type Tab = "overview" | "tracks" | "evidence" | "docs" | "ask";

const TABS: { id: Tab; key: Parameters<ReturnType<typeof useT>>[0] }[] = [
  { id: "overview", key: "case.tabOverview" },
  { id: "tracks", key: "case.tabTracks" },
  { id: "evidence", key: "case.tabEvidence" },
  { id: "docs", key: "case.tabDocs" },
  { id: "ask", key: "case.tabAsk" },
];

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");
  const { caseFile, ready, saving, update, toggleTrack } = useCase(id);

  if (!ready) {
    return <Centered>{t("g.loading")}…</Centered>;
  }

  if (!caseFile) {
    return (
      <Centered>
        <p className="text-lg">No case file with that reference exists in this browser.</p>
        <Link href="/start" className="link mt-4 inline-block">Start a new one →</Link>
      </Centered>
    );
  }

  const incidentAt = caseFile.incidentAt || caseFile.triage?.incidentAt || caseFile.createdAt;

  return (
    <>
      <header className="border-b border-rule sticky top-0 z-40 bg-paper/92 backdrop-blur-md no-print">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 h-[68px] flex items-center gap-4">
          <Wordmark />
          <span
            className={cn(
              "ms-auto text-xs text-ink-3 transition-opacity num",
              saving ? "opacity-100" : "opacity-0",
            )}
            aria-live="polite"
          >
            {t("build.saving")}…
          </span>
          <LanguageSwitcher compact />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-5 sm:px-8 py-8 sm:py-10">
        <CaseHeader caseFile={caseFile} />

        <nav className="mt-8 flex gap-1 border-b border-rule overflow-x-auto no-print" role="tablist">
          {TABS.map(({ id: tid, key }) => (
            <button
              key={tid}
              role="tab"
              aria-selected={tab === tid}
              onClick={() => setTab(tid)}
              className={cn(
                "relative px-4 py-3 text-[0.9375rem] whitespace-nowrap transition-colors -mb-px border-b-2",
                tab === tid ? "border-ink text-ink font-medium" : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {t(key)}
            </button>
          ))}
        </nav>

        <div className="mt-8 space-y-8">
          {tab === "overview" && (
            <>
              {isFinancial(caseFile) && <RecoveryWindow incidentAt={incidentAt} />}
              <NextAction caseFile={caseFile} onGoToTracks={() => setTab("tracks")} />
              <EvidenceOverviewCard caseFile={caseFile} onGoEvidence={() => setTab("evidence")} />
              <Completeness caseFile={caseFile} />
              <Escalation caseFile={caseFile} />
              <Aftercare />
              <CaseBuilder caseFile={caseFile} update={update} />
            </>
          )}

          {tab === "tracks" && <TrackList caseFile={caseFile} toggleTrack={toggleTrack} onGoToDocs={() => setTab("docs")} />}
          {tab === "evidence" && <EvidenceVault caseFile={caseFile} update={update} />}
          {tab === "docs" && <DocumentsPanel caseFile={caseFile} update={update} />}
          {tab === "ask" && <AskPanel caseFile={caseFile} />}
        </div>
      </main>
    </>
  );
}

function EvidenceOverviewCard({ caseFile, onGoEvidence }: { caseFile: import("@/lib/case/types").CaseFile; onGoEvidence: () => void }) {
  const readiness = calculateReadiness(caseFile);
  const tone =
    readiness.level === "READY" ? "bg-done" : readiness.level === "PARTIALLY_READY" ? "bg-wait" : "bg-urgent";
  const label = readiness.level === "READY" ? "Ready" : readiness.level === "PARTIALLY_READY" ? "Partially ready" : "Not ready";
  return (
    <section className="sheet px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="label">Evidence readiness</p>
        <p className="num text-2xl font-medium">{readiness.percentage}%</p>
      </div>
      <div className="mt-3 h-1.5 bg-sunk rounded-full overflow-hidden" role="progressbar" aria-valuenow={readiness.percentage} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${readiness.percentage}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("chip px-2 py-1 rounded-[2px] border", readiness.level === "READY" ? "bg-done-soft text-done border-done/25" : readiness.level === "PARTIALLY_READY" ? "bg-sunk text-ink-3 border-rule" : "bg-urgent-soft text-urgent-ink border-urgent/30")}>
          {label}
        </span>
        <span className="text-sm text-ink-3">
          {readiness.counts.added} added · {readiness.counts.missing} missing
        </span>
      </div>
      {readiness.recommendations.length > 0 && (
        <p className="mt-3 text-sm text-ink-2 leading-snug">
          Next: {readiness.recommendations.map((r) => r.title).join(" · ")}
        </p>
      )}
      <button onClick={onGoEvidence} className="mt-4 text-sm font-medium underline underline-offset-4 hover:text-ink">
        Open Evidence Vault →
      </button>
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-dvh grid place-items-center px-6 text-center">
      <div className="text-ink-2">{children}</div>
    </main>
  );
}
