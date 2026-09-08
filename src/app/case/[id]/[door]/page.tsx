"use client";

import { use } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";

import { CaseShell } from "@/components/case/CaseShell";
import { DoorScreen } from "@/components/case/CaseDoors";
import { buildDoors } from "@/lib/case/doors";
import { useT } from "@/lib/i18n/context";

/**
 * One door of a case, at its own address.
 *
 * `/case/KVC-5DLK-3XPL/steps` rather than a tab index held in memory. The
 * chrome comes from the shell, so this screen is indistinguishable from the
 * home it was opened from — same header, same sync line, same warnings — and
 * only the body differs.
 *
 * A door that does not exist for this case is a 404 rather than a blank panel.
 * The set is computed from the case: a case with no recording has no recording
 * page, and rendering an empty one would let somebody conclude their call had
 * been lost.
 */
export default function DoorPage({ params }: { params: Promise<{ id: string; door: string }> }) {
  const { id: param, door: doorId } = use(params);
  return (
    <CaseShell param={param}>
      {(ctx) => <DoorBody param={param} doorId={doorId} ctx={ctx} />}
    </CaseShell>
  );
}

function DoorBody({ param, doorId, ctx }: {
  param: string;
  doorId: string;
  ctx: Parameters<Parameters<typeof CaseShell>[0]["children"]>[0];
}) {
  const t = useT();
  const router = useRouter();
  const { caseFile, case_, onDelete } = ctx;

  const doors = buildDoors({
    caseFile,
    t,
    update: case_.update,
    persistUpdate: case_.persistUpdate,
    toggleTrack: case_.toggleTrack,
    onDelete,
    go: (next) => router.push(`/case/${param}/${next}`),
  });

  const door = doors.find((d) => d.id === doorId);
  if (!door) notFound();

  const home = `/case/${param}`;

  return (
    <DoorScreen
      title={t(door.title)}
      titleHidden={door.ownHeading}
      home={home}
      crumb={
        // Where you are, spelled out. The Back control says how to leave; this
        // says what you left and what you are looking at — the part somebody
        // being talked through this over the phone needs to read out.
        <nav aria-label={t("door.trail")} className="text-sm text-ink-3">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={home} className="underline underline-offset-4 hover:text-ink">
                {caseFile.ref}
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li className="font-medium text-ink-2" aria-current="page">{t(door.title)}</li>
          </ol>
        </nav>
      }
    >
      {door.render()}
    </DoorScreen>
  );
}
