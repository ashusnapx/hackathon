import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

/**
 * The page itself is a client component and so cannot export metadata. This
 * layout carries it, and goes through `pageMetadata` because Next overwrites
 * nested `openGraph` per segment — declaring it here by hand would drop the
 * preview image this route inherits from the root.
 */
export const metadata = pageMetadata({
  title: "Find your case file",
  description: "Enter the reference you were given. Case files live on your own device, so this finds the ones started in this browser.",
  path: "/cases",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
