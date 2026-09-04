import { NextResponse } from "next/server";
import {
  getVaaniLiveConfiguration,
  getVaaniRecordingState,
  getVaaniWebConfiguration,
  vaaniRecordingDisclosure,
} from "@/lib/integrations/vaani";

export const dynamic = "force-dynamic";

/**
 * What the browser is allowed to believe about live voice.
 *
 * Telephony and browser sessions are reported separately because they fail for
 * different reasons: a browser session needs no phone number, and a callback
 * needs an allowlisted one.
 */
export async function GET() {
  const telephony = getVaaniLiveConfiguration();
  const web = getVaaniWebConfiguration();
  const recordingState = getVaaniRecordingState();

  return NextResponse.json({
    configured: telephony.ready,
    telephony: {
      available: telephony.ready,
      blockers: telephony.problems,
      mode: telephony.ready ? "allowlisted-test-callbacks" : "disabled",
    },
    browserSession: {
      available: web.ready,
      blockers: web.problems,
      mode: web.ready ? "webrtc-hosted-session" : "disabled",
    },
    recording: {
      state: recordingState,
      disclosure: vaaniRecordingDisclosure(recordingState),
      consentRequired: recordingState !== "disabled",
    },
    provider: "Vaani Voice AI",
    dispatchGuards: "server-enforced",
    intakeSafetyGate: "client-prototype-only",
    prototypeNonDurable: true,
  }, { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } });
}
