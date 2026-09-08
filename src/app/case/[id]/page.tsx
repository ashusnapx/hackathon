"use client";

import { use } from "react";

import { CaseBanner } from "@/components/case/CaseBanner";
import { CaseDoors } from "@/components/case/CaseDoors";
import { CaseShell } from "@/components/case/CaseShell";
import { RecoveryWindow } from "@/components/case/RecoveryWindow";
import { SampleTour, TOUR_DOOR } from "@/components/case/SampleTour";
import { buildDoors, spokenSummary } from "@/lib/case/doors";
import { isFinancial } from "@/lib/case/tracks";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";

/**
 * The case home: what to do now, and everything else as a list.
 *
 * Each row of that list is a real page — `/case/KVC-5DLK-3XPL/steps` — rather
 * than a piece of state on this one. That buys more than tidiness: somebody can
 * send a relative the link to the exact screen they are stuck on, the phone's
 * own Back gesture works, the address bar says where they are, and the browser
 * keeps a history they can walk back through. A person being talked through
 * this on the phone can be told "you should be on the steps page" and check.
 */
export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: param } = use(params);
  return <CaseShell param={param}>{(ctx) => <CaseHome param={param} ctx={ctx} />}</CaseShell>;
}

function CaseHome({ param, ctx }: {
  param: string;
  ctx: Parameters<Parameters<typeof CaseShell>[0]["children"]>[0];
}) {
  const t = useT();
  const router = useRouter();
  const { caseFile, case_, onDelete } = ctx;
  const incidentAt = caseFile.incidentAt || caseFile.triage?.incidentAt;

  const doors = buildDoors({
    caseFile,
    t,
    update: case_.update,
    persistUpdate: case_.persistUpdate,
    toggleTrack: case_.toggleTrack,
    onDelete,
    go: (doorId) => router.push(`/case/${param}/${doorId}`),
  });

  return (
    <>
      {caseFile.voiceCall?.demoCallId && (
        <>
          <aside className="mb-4 sheet border-info/30 bg-info-soft px-4 py-4 no-print">
            <p className="text-[0.9375rem] font-semibold">{t("case.sampleTitle")}</p>
            <p className="mt-1 text-sm leading-[1.55] text-ink-2">{t("case.sampleBody")}</p>
          </aside>
          {/* Only on the sample. A real case belongs to somebody in the middle
              of a bad week and is not a place for a product tour. */}
          <SampleTour onGoToTab={(tab) => router.push(`/case/${param}/${TOUR_DOOR[tab]}`)} />
        </>
      )}

      {/* One banner: the reference, what it cost, and the exact next steps. */}
      <CaseBanner
        caseFile={caseFile}
        spoken={spokenSummary(caseFile, t)}
        doorCount={doors.length}
        update={case_.update}
      />

      {isFinancial(caseFile) && incidentAt && (
        <div className="mt-6">
          <RecoveryWindow incidentAt={incidentAt} />
        </div>
      )}

      <h2 id="case-doors" className="mt-9 scroll-mt-24 !font-sans !text-xl !font-semibold !tracking-normal">
        {t("door.all")}
      </h2>
      <CaseDoors doors={doors} basePath={`/case/${param}`} />
    </>
  );
}
