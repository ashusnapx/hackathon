"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { SiteHeader } from "@/components/SiteHeader";
import { resolveCaseParam, useCase } from "@/lib/case/store";
import { useCaseRestore } from "@/lib/case/restore";
import { useCaseSyncState } from "@/lib/case/sync";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * Everything both case screens have in common.
 *
 * The case home and each of its doors are separate routes now, and a person
 * moving between them must not be able to tell that anything has been torn
 * down and rebuilt. So the header, the sync line, the conflict and save
 * warnings, the loading state and the not-found state all live here and are
 * rendered identically on every one of those routes — rather than being
 * duplicated per route, where they would drift apart within a week.
 *
 * The children are a function rather than nodes because everything below needs
 * the loaded case and the handles that write to it, and none of that exists
 * until the restore has finished.
 */
/**
 * Start every case screen at the top.
 *
 * The router's own scroll reset fires when the route commits, and these screens
 * commit before they have anything in them: the case is read out of local
 * storage and, for a shared link, fetched — so at reset time the page is a
 * loading line a few pixels tall, there is nothing to scroll, and the browser
 * then restores the offset the person had on the list they tapped from. They
 * land halfway down a screen they have never seen, which reads as a broken
 * page rather than as a scroll position.
 *
 * `path` is in the dependency list, not `param`: moving between two doors of
 * the same case has to reset as well.
 */
function useTopOnArrival(path: string) {
  useEffect(() => {
    // `instant` and not `smooth`: this is not a movement the person asked for,
    // and animating it would look like the page sliding away under them.
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
}

export function CaseShell({ param, children }: {
  param: string;
  children: (ctx: {
    caseFile: NonNullable<ReturnType<typeof useCase>["caseFile"]>;
    id: string;
    case_: ReturnType<typeof useCase>;
    onDelete: () => Promise<import("@/lib/case/store").DeleteCaseResult>;
  }) => ReactNode;
}) {
  const t = useT();
  // The address bar carries the reference people actually have — the one on
  // their complaint and read down the phone. Everything below still works in
  // ids, and a shared link still arrives as one.
  const id = useMemo(() => resolveCaseParam(param), [param]);
  const restore = useCaseRestore(id);
  useTopOnArrival(usePathname());

  if (restore === "checking") return <Centered>{t("g.loading")}…</Centered>;
  return <Loaded id={id} t={t}>{children}</Loaded>;
}

function Loaded({ id, t, children }: {
  id: string;
  t: ReturnType<typeof useT>;
  children: (ctx: {
    caseFile: NonNullable<ReturnType<typeof useCase>["caseFile"]>;
    id: string;
    case_: ReturnType<typeof useCase>;
    onDelete: () => Promise<import("@/lib/case/store").DeleteCaseResult>;
  }) => ReactNode;
}) {
  const sync = useCaseSyncState();
  const router = useRouter();
  const case_ = useCase(id);
  const { caseFile, ready, saving, saveError, externalConflict, retrySave, resolveExternalConflict, deleteCurrentCase } = case_;

  if (!ready) return <Centered>{t("g.loading")}…</Centered>;

  if (!caseFile) {
    return (
      <Centered>
        <p className="text-lg">{t("case.notFound")}</p>
        <Link href="/assist" className="link mt-4 inline-block">{t("case.startNew")}</Link>
      </Centered>
    );
  }

  // One line for both halves of a save: the copy on this device, and the copy
  // that lets the person open this case somewhere else.
  const syncLabel = saving || sync === "saving"
    ? `${t("sync.saving")}…`
    : sync === "offline"
      ? t("sync.offline")
      : sync === "saved"
        ? t("sync.saved")
        : "";

  return (
    <>
      <SiteHeader
        width="5xl"
        noPrint
        status={
          <span
            className={cn(
              "text-xs transition-opacity",
              syncLabel ? "opacity-100" : "opacity-0",
              sync === "offline" ? "text-wait-ink" : "text-ink-3",
            )}
            aria-live="polite"
          >
            {syncLabel}
          </span>
        }
      />

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

        {children({
          caseFile,
          id,
          case_,
          onDelete: async () => {
            const result = await deleteCurrentCase();
            if (result.evidenceCleanup !== "incomplete") router.replace("/cases");
            return result;
          },
        })}
      </main>
    </>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="min-h-dvh grid place-items-center px-6 text-center">
      <div className="text-ink-2">{children}</div>
    </main>
  );
}
