import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Talk to Kavach Saathi",
  description: "A consent-first guided interview that turns one victim story into a verified cybercrime action plan.",
});

export default function AssistLayout({ children }: { children: ReactNode }) {
  return children;
}

