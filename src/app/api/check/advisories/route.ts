import { baselineBoard, isAdvisory, type AdvisoryBoard } from "@/lib/check/advisories";
import { readAdvisories } from "@/lib/db/advisories";
import { databaseConfigured } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * The Check page's advisory board.
 *
 * A GET with no body and no secrets: this is public safety copy, identical for
 * every reader, and it is the one thing on the site that is better cached than
 * fresh. An hour of CDN cache costs a reader nothing — the underlying set moves
 * once a day — and buys the page a board that renders instantly on a cheap
 * phone.
 *
 * It cannot fail. Storage being unconfigured, empty or down all resolve to the
 * set committed to the repository, labelled as such, because a warning board
 * that is sometimes blank teaches people to ignore it.
 */
export async function GET() {
  const board = await liveBoard() ?? baselineBoard();

  return Response.json(board, {
    headers: {
      // Public and shared: no reader-specific content passes through here.
      // `stale-while-revalidate` means a refresh never makes anybody wait.
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

async function liveBoard(): Promise<AdvisoryBoard | null> {
  if (!databaseConfigured()) return null;
  try {
    const stored = await readAdvisories();
    if (!stored) return null;
    // Rows are validated on the way out as well as in. The refresh job is the
    // only writer today, but this is displayed to somebody as official-looking
    // guidance, and a malformed row should vanish rather than render.
    const advisories = stored.advisories.filter(isAdvisory);
    if (!advisories.length) return null;
    return { advisories, refreshedAt: stored.refreshedAt, origin: "live" };
  } catch {
    return null;
  }
}
