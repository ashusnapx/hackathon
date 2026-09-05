import type { Metadata } from "next";
import { StartFlow } from "@/components/start/StartFlow";

export const metadata: Metadata = {
  title: "Start",
  description: "Choose how to tell Kavach what happened — voice assistant or chat.",
};

export default function StartPage() {
  return <StartFlow />;
}
