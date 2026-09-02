import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

/**
 * The page itself is a client component and so cannot export metadata. This
 * layout carries it, and goes through `pageMetadata` because Next overwrites
 * nested `openGraph` per segment — declaring it here by hand would drop the
 * preview image this route inherits from the root.
 */
export const metadata = pageMetadata({
  title: "Tell us what happened",
  description: "In your own words, however you would explain it to a family member. We turn it into everything the police and your bank need.",
  path: "/start",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
