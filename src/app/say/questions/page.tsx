import type { Metadata } from "next";

import { QuestionsView } from "./QuestionsView";

export const metadata: Metadata = {
  title: "Your case",
  description: "A few short questions, one at a time, to finish your case file.",
};

export default function QuestionsPage() {
  return <QuestionsView />;
}
