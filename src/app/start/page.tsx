import { redirect } from "next/navigation";

/**
 * Compatibility route for old bookmarks. Every new narrative begins in the
 * shared interview so immediate-danger and child-safety gates cannot be
 * bypassed through the legacy free-text screen.
 */
export default function StartPage() {
  redirect("/assist");
}
