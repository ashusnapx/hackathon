import { Suspense } from "react";

import { StartFlow } from "@/components/start/StartFlow";
import { WhatsAppHandoff } from "@/components/intake/WhatsAppHandoff";

/**
 * The address people already have.
 *
 * One intake surface, two doors onto it. StartFlow sends somebody with a report
 * already under way on to the questions, so this is never a third version of
 * the same screen — and `WhatsAppHandoff` adds a third door that leads to the
 * same place: an interview that began on WhatsApp, arriving with its `?wa=`
 * token to trade for the draft behind it.
 *
 * The handoff reads the query string, so it sits behind Suspense: without one,
 * `useSearchParams` opts the whole route out of static rendering.
 */
export default function AssistPage() {
  return (
    <>
      <Suspense fallback={null}>
        <WhatsAppHandoff />
      </Suspense>
      <StartFlow />
    </>
  );
}
