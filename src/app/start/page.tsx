import type { Metadata } from "next";
import { StartFlow } from "@/components/start/StartFlow";

export const metadata: Metadata = {
  title: "Start",
  description: "Two safety questions, then choose how to tell Kavach what happened.",
};

export default function StartPage() {
  return <StartFlow />;
}
