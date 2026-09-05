"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { freshStartDraft } from "@/lib/intake/interview";
import { saveBrowserIntakeDraft } from "@/lib/intake/persistence";
import { clearStoredVaaniSession } from "@/lib/integrations/vaani-client";
import { useT } from "@/lib/i18n/context";

/**
 * The front door.
 *
 * Two paths into the guided interview: voice (Saathi) and form.
 * Safety questions removed per user request.
 */
export function StartFlow() {
  const t = useT();
  const router = useRouter();

  const beginVoice = () => {
    saveBrowserIntakeDraft(freshStartDraft("voice", { safety: "safe", childContext: "adult-or-no-child" }));
    clearStoredVaaniSession();
    router.push("/assist");
  };

  const beginForm = () => {
    saveBrowserIntakeDraft(freshStartDraft("web", { safety: "safe", childContext: "adult-or-no-child" }));
    clearStoredVaaniSession();
    router.push("/assist");
  };

  return (
    <main className="min-h-dvh px-4 py-8 sm:py-14 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-xl rounded-card border border-rule bg-surface px-5 py-6 sm:px-8 sm:py-8 shadow-[0_20px_60px_-30px_rgba(26,26,26,0.45)]">
        <h1 className="text-xl sm:text-2xl font-semibold leading-tight">{t("begin.chooseH")}</h1>
        <p className="mt-2 text-sm leading-[1.55] text-ink-2">{t("begin.chooseSub")}</p>

        <div className="mt-5 grid gap-3">
          {/* Kavach Saathi — voice option */}
          <button
            onClick={beginVoice}
            className="w-full rounded-ctl border-2 border-ink bg-ink text-paper px-4 py-5 text-start flex items-start gap-3.5 transition-colors hover:bg-ink/90"
          >
            <span className="shrink-0 mt-0.5 grid place-items-center w-11 h-11 rounded-full border border-paper/20 bg-paper/10">
              <Image src="/vaani/vaani-mark.png" alt="" width={72} height={72} className="w-7 h-7" />
            </span>
            <span className="min-w-0">
              <span className="block text-[1.0625rem] font-semibold leading-tight">{t("begin.voiceH")}</span>
              <span className="block mt-1 text-sm leading-[1.5] text-paper/70">{t("begin.voiceNote")}</span>
            </span>
          </button>

          {/* Form option */}
          <button
            onClick={beginForm}
            className="w-full rounded-ctl border border-rule-strong bg-raised px-4 py-4 text-start flex items-start gap-3.5 transition-colors hover:border-ink"
          >
            <span className="shrink-0 mt-0.5 grid place-items-center w-11 h-11 rounded-full border border-rule bg-surface">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 14l2 2 4-4" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[1.0625rem] font-semibold leading-tight">{t("begin.formH")}</span>
              <span className="block mt-1 text-sm leading-[1.5] text-ink-3">{t("begin.formNote")}</span>
            </span>
          </button>
        </div>

        <p className="mt-5 text-xs leading-[1.55] text-ink-3">{t("begin.boundaryNote")}</p>
      </div>
    </main>
  );
}
