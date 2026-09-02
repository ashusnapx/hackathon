import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

/**
 * A case file lives in one browser's storage and there is no server copy, so a
 * shared /case/… link shows the recipient nothing. It keeps a preview card so
 * the link is not bare, and stays out of search results.
 */
export const metadata = pageMetadata({
  title: "Your case file",
  description:
    "Ten deadlines, every document, and what to do next. Case files are stored on your own device and are not visible to anyone else.",
  path: "/case",
  noIndex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
