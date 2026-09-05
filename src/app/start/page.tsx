import type { Metadata } from "next";
import { ChooseWay } from "@/components/start/ChooseWay";

export const metadata: Metadata = {
  title: "Start",
  description: "Two safety questions, then choose how to tell Kavach what happened.",
};

export default function StartPage() {
  return <ChooseWay />;
}
