import type { Advisory } from "@/lib/check/advisories";
import { database } from "./supabase";

/**
 * Reading and replacing the Check page's advisory board.
 *
 * Two callers only: the route that serves the board, and the scheduled job that
 * refreshes it. Nothing user-supplied reaches either — an advisory is public
 * safety copy shown to a frightened person as guidance, so the write path is
 * the cron job and nothing else.
 */

export interface StoredAdvisories {
  advisories: Advisory[];
  /** Newest `fetched_at` across the live rows: when the board was confirmed. */
  refreshedAt: string;
}

interface Row {
  id: string;
  title: string;
  summary: string;
  tell: string;
  severity: string;
  source_name: string;
  source_url: string;
  published_at: string;
  fetched_at: string;
}

function toAdvisory(row: Row): Advisory {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    tell: row.tell,
    severity: row.severity === "high" ? "high" : "medium",
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    publishedAt: String(row.published_at).slice(0, 10),
  };
}

/** The live board, worst first. `null` when nothing has been stored yet. */
export async function readAdvisories(): Promise<StoredAdvisories | null> {
  const { data, error } = await database()
    .from("advisories")
    .select("id, title, summary, tell, severity, source_name, source_url, published_at, fetched_at")
    .is("retired_at", null)
    .order("severity", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) throw new Error(`advisory-read-failed: ${error.message}`);
  if (!data?.length) return null;

  const rows = data as Row[];
  // "high" sorts before "medium" alphabetically, which is the order wanted, so
  // the query's ordering is already correct and is not re-sorted here.
  const refreshedAt = rows
    .map((row) => row.fetched_at)
    .sort()
    .at(-1) ?? new Date().toISOString();

  return { advisories: rows.map(toAdvisory), refreshedAt };
}

/**
 * Replace the board with what the sources say tonight.
 *
 * An upsert rather than a delete-then-insert: the board is read by the public
 * route continuously, and a truncate would give whoever loaded the page in that
 * window an empty warning board — the one state it must never be in. Rows the
 * refresh no longer saw are retired afterwards, so the swap is additive first
 * and subtractive second, and never empty in between.
 */
export async function writeAdvisories(advisories: Advisory[]): Promise<number> {
  if (!advisories.length) return 0;
  const fetchedAt = new Date().toISOString();

  const { error: upsertError } = await database()
    .from("advisories")
    .upsert(
      advisories.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        tell: a.tell,
        severity: a.severity,
        source_name: a.sourceName,
        source_url: a.sourceUrl,
        published_at: a.publishedAt.slice(0, 10),
        fetched_at: fetchedAt,
        retired_at: null,
      })),
      { onConflict: "id" },
    );

  if (upsertError) throw new Error(`advisory-write-failed: ${upsertError.message}`);

  // Anything not in tonight's set is retired, not deleted: what was shown to
  // people stays on the record.
  const { error: retireError } = await database()
    .from("advisories")
    .update({ retired_at: fetchedAt })
    .is("retired_at", null)
    .not("id", "in", `(${advisories.map((a) => a.id).join(",")})`);

  if (retireError) throw new Error(`advisory-retire-failed: ${retireError.message}`);
  return advisories.length;
}
