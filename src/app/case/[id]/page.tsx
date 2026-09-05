"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RecoveryWindow } from "@/components/case/RecoveryWindow";
import { RbiProtectionCard } from "@/components/case/RbiProtectionCard";
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
import { CallRecord } from "@/components/case/CallRecord";
import { CaseEmail } from "@/components/case/CaseEmail";
import { useCase } from "@/lib/case/store";
import { DEMO_CASE_ID, ensureDemoCase } from "@/lib/demo/case";
import { isFinancial } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { calculateReadiness } from "@/lib/case/evidence";

type Tab = "overview" | "tracks" | "evidence" | "call" | "docs" | "ask";

const TABS: { id: Tab; key: Parameters<ReturnType<typeof useT>>[0] }[] = [
  { id: "overview", key: "case.tabOverview" },
  { id: "tracks", key: "case.tabTracks" },
  { id: "evidence", key: "case.tabEvidence" },
  { id: "call", key: "call.tab" },
  { id: "docs", key: "case.tabDocs" },
  { id: "ask", key: "case.tabAsk" },
];

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // The sample case is a link anyone can be sent, so it has to exist for a
  // visitor who has never been here. Seeding it in a state initialiser puts it
  // in storage during this first render — before useCase reads, just below.
  useState(() => { if (id === DEMO_CASE_ID) ensureDemoCase(); });
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const {
    caseFile,
    ready,
    saving,
    saveError,
    externalConflict,
    retrySave,
    resolveExternalConflict,
    update,
    persistUpdate,
    toggleTrack,
    deleteCurrentCase,
  } = useCase(id);

  if (!ready) {
    return <Centered>{t("g.loading")}…</Centered>;
  }

  if (!caseFile) {
    return (
      <Centered>
        <p className="text-lg">{t("case.notFound")}</p>
        <Link href="/assist" className="link mt-4 inline-block">{t("case.startNew")}</Link>
      </Centered>
    );
  }

  const incidentAt = caseFile.incidentAt || caseFile.triage?.incidentAt;

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3 sm:pt-4 pointer-events-none no-print">
        <div className="pointer-events-auto mx-auto max-w-5xl rounded-card border border-ink/15 bg-paper/85 backdrop-blur-xl shadow-[0_6px_24px_-18px_rgba(26,26,26,0.55)] px-3 sm:px-4 h-[60px] sm:h-[64px] flex items-center gap-4">
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
        {externalConflict && (
          <div role="alert" className="mb-6 sheet border-wait/40 bg-wait-soft px-4 py-3 text-sm text-ink-2">
            <p>{t("case.conflict")}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button onClick={() => resolveExternalConflict("keep-local")} className="font-semibold underline underline-offset-4">
                {t("case.keepLocal")}
              </button>
              <button onClick={() => resolveExternalConflict("load-stored")} className="underline underline-offset-4">
                {t("case.loadStored")}
              </button>
            </div>
          </div>
        )}
        {saveError && (
          <div role="alert" className="mb-6 sheet border-urgent/40 bg-urgent-soft px-4 py-3 text-sm text-urgent-ink">
            <p>{t("case.saveError")}</p>
            <button onClick={retrySave} className="mt-2 font-semibold underline underline-offset-4">
              {t("case.retrySave")}
            </button>
          </div>
        )}

        {caseFile.voiceCall?.demoCallId && (
          <aside className="mb-6 sheet border-info/30 bg-info-soft px-4 py-4 no-print">
            <p className="text-[0.9375rem] font-semibold">{t("case.sampleTitle")}</p>
            <p className="mt-1 text-sm leading-[1.55] text-ink-2">{t("case.sampleBody")}</p>
            <button
              onClick={() => setTab("call")}
              className="mt-2 text-sm font-semibold underline underline-offset-4"
            >
              {t("case.sampleListen")}
            </button>
          </aside>
        )}

        <CaseHeader
          caseFile={caseFile}
          onDelete={async () => {
            const result = await deleteCurrentCase();
            if (result.evidenceCleanup !== "incomplete") router.replace("/cases");
            return result;
          }}
        />

        {/* The strip scrolls on a phone. `no-bar` matters: the styled 10px
            scrollbar used to sit inside this 48px-tall strip and clip the
            label of whichever tab was active. */}
        <nav
          className="mt-8 flex gap-1 border-b border-rule swipe-x no-bar no-print"
          aria-label={t("case.ref")}
        >
          {TABS.map(({ id: tid, key }) => (
            <button
              key={tid}
              aria-current={tab === tid ? "page" : undefined}
              onClick={(e) => {
                setTab(tid);
                e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
              className={cn(
                "relative px-4 py-3 text-[0.9375rem] whitespace-nowrap transition-colors -mb-px border-b-2 shrink-0",
                tab === tid
                  ? "border-urgent text-ink font-semibold"
                  : "border-transparent text-ink-3 font-light hover:text-ink",
              )}
            >
              {t(key)}
            </button>
          ))}
        </nav>

        <div className="mt-8 space-y-8">
          {tab === "overview" && (
            <>
              {isFinancial(caseFile) && incidentAt && <RecoveryWindow incidentAt={incidentAt} />}
              <RbiProtectionCard caseFile={caseFile} />
              <NextAction caseFile={caseFile} onGoToTracks={() => setTab("tracks")} />
              <EvidenceOverviewCard caseFile={caseFile} onGoEvidence={() => setTab("evidence")} />
              <Completeness caseFile={caseFile} />
              <Escalation caseFile={caseFile} />
              <Aftercare />
              <CaseBuilder caseFile={caseFile} update={update} />
              <CaseEmail caseFile={caseFile} />
            </>
          )}

          {tab === "tracks" && (
            <TrackList
              caseFile={caseFile}
              toggleTrack={toggleTrack}
              updateBank={(patch) => update((current) => ({ bank: { ...current.bank, ...patch } }))}
              onGoToDocs={() => setTab("docs")}
            />
          )}
          {tab === "evidence" && (
            <EvidenceVault caseFile={caseFile} update={update} persistUpdate={persistUpdate} />
          )}
          {tab === "call" && (
            <CallRecord
              caseFile={caseFile}
              transcriptToken={caseFile.voiceCall?.transcriptToken}
              onApply={(patch) => update(() => patch)}
            />
          )}
          {tab === "docs" && <DocumentsPanel caseFile={caseFile} update={update} />}
          {tab === "ask" && <AskPanel caseFile={caseFile} />}
        </div>
      </main>
    </>
  );
}

function EvidenceOverviewCard({ caseFile, onGoEvidence }: { caseFile: import("@/lib/case/types").CaseFile; onGoEvidence: () => void }) {
  const t = useT();
  const readiness = calculateReadiness(caseFile);
  const tone =
    readiness.level === "READY" ? "bg-done" : readiness.level === "PARTIALLY_READY" ? "bg-wait" : "bg-urgent";
  const labelKey = readiness.counts.totalApplicable === 0
    ? "ev.noApplicableItems"
    : readiness.level === "READY"
      ? "ev.mostAddressed"
      : readiness.level === "PARTIALLY_READY"
        ? "ev.inProgress"
        : "ev.justStarted";
  return (
    <section className="sheet px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="label">{t("ev.overviewTitle")}</p>
        <p className="num text-2xl font-medium">{readiness.percentage}% {t("ev.addressed")}</p>
      </div>
      <div className="mt-3 h-1.5 bg-sunk rounded-full overflow-hidden" role="progressbar" aria-label={t("ev.overviewAria")} aria-valuenow={readiness.percentage} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${readiness.percentage}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("chip px-2 py-1 rounded-ctl border", readiness.level === "READY" ? "bg-done-soft text-done border-done/25" : readiness.level === "PARTIALLY_READY" ? "bg-sunk text-ink-3 border-rule" : "bg-urgent-soft text-urgent-ink border-urgent/30")}>
          {t(labelKey)}
        </span>
        <span className="text-sm text-ink-3">
          {readiness.counts.added} {t("ev.markedHeld")} · {readiness.counts.storedLocally} {t("ev.localFiles")} · {readiness.counts.missing} {t("ev.missingN")}
        </span>
      </div>
      {readiness.recommendations.length > 0 && (
        <p className="mt-3 text-sm text-ink-2 leading-snug">
          {t("ev.next")} {readiness.recommendations.map((r) => t(`ev.tpl.${r.id}.title` as Parameters<typeof t>[0])).join(" · ")}
        </p>
      )}
      <p className="mt-3 text-xs leading-snug text-ink-3">{t("ev.overviewDisclaimer")}</p>
      <button onClick={onGoEvidence} className="mt-4 text-sm font-medium underline underline-offset-4 hover:text-ink">
        {t("ev.openVault")}
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
