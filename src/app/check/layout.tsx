import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

/**
 * The page itself is a client component and so cannot export metadata. This
 * layout carries it, and goes through `pageMetadata` because Next overwrites
 * nested `openGraph` per segment — declaring it here by hand would drop the
 * preview image this route inherits from the root.
 */
export const metadata = pageMetadata({
  title: "Is this a fraud?",
  description: "Paste the message, the link, the UPI ID or the number. We will tell you what is wrong with it before the money leaves, while you still have a choice.",
  path: "/check",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
