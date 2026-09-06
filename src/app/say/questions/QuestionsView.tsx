"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GuidedIntake } from "@/components/intake/GuidedIntake";
import { SiteHeader } from "@/components/SiteHeader";
import { loadBrowserIntakeDraft } from "@/lib/intake/persistence";

/**
 * The questions, at their own address.
 *
 * They used to be a boolean inside the page that took the story, which meant
 * the URL said "/say" whether somebody was about to speak or nine questions
 * into a report. That is a small thing until a phone reloads a backgrounded
 * tab, or somebody presses back, or a link gets shared — and then it is the
 * difference between carrying on and starting over.
 *
 * Nothing is carried in the URL: the draft is on the device, and this route
 * only asserts which half of the flow somebody is in. Arriving here without a
 * report to continue sends them back to the box rather than showing an
 * interview about nothing.
 */
export function QuestionsView() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    const draft = loadBrowserIntakeDraft().draft;
    if (draft?.analysis) queueMicrotask(() => setState("ready"));
    else router.replace("/say");
  }, [router]);

  return (
    <>
      <SiteHeader width="2xl" />
      <main id="main" className="px-5 sm:px-8 py-6 sm:py-10 flex items-start justify-center">
        <div className="w-full max-w-xl">
          {state === "ready" && (
            <GuidedIntake lockChannel="web" onReset={() => router.replace("/say?new=1")} />
          )}
        </div>
      </main>
    </>
  );
}
