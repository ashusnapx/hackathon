import type { Metadata } from "next";
import { StartFlow } from "@/components/start/StartFlow";

export const metadata: Metadata = {
  title: "Say what happened",
  description: "Speak or type what happened, in your own language. Kavach works out the rest.",
};

export default function SayPage() {
  return <StartFlow />;
}
