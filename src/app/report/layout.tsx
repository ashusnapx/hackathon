import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

/**
 * The page itself is a client component and so cannot export metadata. This
 * layout carries it, and goes through `pageMetadata` because Next overwrites
 * nested `openGraph` per segment — declaring it here by hand would drop the
 * preview image this route inherits from the root.
 */
export const metadata = pageMetadata({
  title: "File your complaint",
  description: "Speak or type what happened, in any of 23 languages. Kavach writes the NCRP complaint, the letter to your bank and the FIR application, and saves every keystroke as you go.",
  path: "/report",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
