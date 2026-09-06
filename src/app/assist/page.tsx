import { StartFlow } from "@/components/start/StartFlow";

/**
 * The address people already have.
 *
 * There is one intake surface now, and this is a second door onto it rather
 * than a second version of it. Somebody arriving here with a report already
 * under way picks up at the question they were on.
 */
export default function AssistPage() {
  return <StartFlow />;
}
