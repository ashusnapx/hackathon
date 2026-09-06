import { StartFlow } from "@/components/start/StartFlow";

/**
 * The address people already have.
 *
 * One intake surface, two doors onto it. StartFlow sends somebody with a report
 * already under way on to the questions, so this is never a third version of
 * the same screen.
 */
export default function AssistPage() {
  return <StartFlow />;
}
