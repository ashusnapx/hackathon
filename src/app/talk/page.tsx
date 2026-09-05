import type { Metadata } from "next";

import { TalkView } from "./TalkView";

export const metadata: Metadata = {
  title: "Talk to Kavach",
  description: "Say what happened out loud. No phone number needed — the call runs in this tab.",
};

export default function TalkPage() {
  return <TalkView />;
}
