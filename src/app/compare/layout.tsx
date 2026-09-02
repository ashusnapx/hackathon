import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

/**
 * The page itself is a client component and so cannot export metadata. This
 * layout carries it, and goes through `pageMetadata` because Next overwrites
 * nested `openGraph` per segment — declaring it here by hand would drop the
 * preview image this route inherits from the root.
 */
export const metadata = pageMetadata({
  title: "The same complaint, twice",
  description: "Eight places the current cybercrime form costs people their complaint, each one sourced to the Ministry of Home Affairs' own Citizen Manual, and what a better version does instead.",
  path: "/compare",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
