import "server-only";

import { jsonCall, MODEL_FAST } from "@/lib/ai/provider";
import { isAdvisory, type Advisory } from "./advisories";

/**
 * Reading tonight's scam advisories off the bodies that publish them.
 *
 * The distinction this file exists to enforce: it **extracts**, it does not
 * **compose**. A model asked "what scams are running in India?" will answer
 * fluently and some of the answer will be invented, and an invented fraud
 * warning is indistinguishable from a real one to the person reading it — while
 * being exactly the sort of authoritative-sounding fiction the page warns about.
 *
 * So the shape is: fetch a real page, hand the model only that page's text, and
 * accept only advisories it can ground in what it was given. Every result
 * carries the URL it was read from. If a source cannot be fetched it is
 * skipped; if none can, the refresh reports failure and the board keeps
 * whatever it already had rather than being replaced with nothing.
 */

export interface AdvisorySource {
  id: string;
  name: string;
  url: string;
}

/**
 * Where the advisories come from.
 *
 * All four are the primary publishers for their domain in India: I4C for cyber
 * crime, DoT for fraudulent communications, CERT-In for technical advisories,
 * RBI for banking. No aggregators, no news sites — a scam warning is worth
 * exactly as much as the authority behind it.
 */
export const ADVISORY_SOURCES: AdvisorySource[] = [
  { id: "i4c", name: "I4C / cybercrime.gov.in", url: "https://cybercrime.gov.in" },
  { id: "sancharsaathi", name: "DoT Sanchar Saathi", url: "https://sancharsaathi.gov.in/sfc/" },
  { id: "certin", name: "CERT-In", url: "https://www.cert-in.org.in" },
  { id: "rbi", name: "RBI press releases", url: "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx" },
];

/** A page that answers slower than this is not worth holding the job open for. */
const FETCH_TIMEOUT_MS = 20_000;

/** Enough of a page to carry its advisories; far short of a memory problem. */
const MAX_PAGE_CHARS = 40_000;

const SYSTEM = `You extract fraud advisories from official Indian government and regulator pages.

You will be given the text of ONE page and its URL. Return only advisories that are actually described in that text.

Absolute rules:
- Never invent an advisory. If the page has no fraud advisories, return an empty list. An empty list is a correct and expected answer.
- Never generalise from your own knowledge of Indian scams. Only what is on this page.
- Every summary must be supportable by a sentence on the page.
- Write for somebody frightened and in a hurry: plain words, no jargon, no headings.
- "tell" is the single check that gives the scam away, phrased as an instruction.
- "severity" is "high" when money or account access is at immediate risk, otherwise "medium".
- "publishedAt" is the date the page gives for the advisory, as YYYY-MM-DD. If the page gives no date, omit the advisory rather than guessing one.
- "id" is a short stable kebab-case slug describing the scam, e.g. "fake-courier-customs".`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["advisories"],
  properties: {
    advisories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "summary", "tell", "severity", "publishedAt"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          tell: { type: "string" },
          severity: { type: "string", enum: ["high", "medium"] },
          publishedAt: { type: "string" },
        },
      },
    },
  },
} as const;

interface Extracted {
  advisories: {
    id: string;
    title: string;
    summary: string;
    tell: string;
    severity: "high" | "medium";
    publishedAt: string;
  }[];
}

/** Tags out, entities decoded, whitespace collapsed. No parser dependency. */
function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSource(source: AdvisorySource): Promise<string | null> {
  try {
    const response = await fetch(source.url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Kavach advisory refresh; +https://cybercrime-assistant.vercel.app)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const text = toText(await response.text());
    return text.length > 200 ? text.slice(0, MAX_PAGE_CHARS) : null;
  } catch {
    return null;
  }
}

async function extractFrom(source: AdvisorySource, pageText: string): Promise<Advisory[]> {
  const result = await jsonCall<Extracted>({
    system: SYSTEM,
    user: `Source name: ${source.name}\nSource URL: ${source.url}\n\nPage text:\n${pageText}`,
    schema: SCHEMA as unknown as Record<string, unknown>,
    schemaName: "advisories",
    model: MODEL_FAST,
    // Extraction, not writing. Nothing here benefits from variety.
    temperature: 0,
  });
  if (!result?.advisories?.length) return [];

  return result.advisories
    // The source is attached here rather than asked for, so a model can never
    // attribute an advisory to a page it did not come from.
    .map((a) => ({
      ...a,
      id: `${source.id}-${a.id}`.slice(0, 64),
      sourceName: source.name,
      sourceUrl: source.url,
      publishedAt: a.publishedAt.slice(0, 10),
    }))
    .filter(isAdvisory);
}

export interface RefreshResult {
  advisories: Advisory[];
  /** Sources that answered and were read. */
  read: string[];
  /** Sources that could not be reached or returned nothing usable. */
  skipped: string[];
}

/**
 * One pass over every source.
 *
 * Sources are read in parallel and independently: one government site being
 * down is the normal case, not an outage, and must not cost the board the three
 * that answered.
 */
export async function refreshAdvisories(
  sources: AdvisorySource[] = ADVISORY_SOURCES,
): Promise<RefreshResult> {
  const settled = await Promise.all(
    sources.map(async (source) => {
      const pageText = await fetchSource(source);
      if (!pageText) return { source, advisories: [] as Advisory[], ok: false };
      try {
        return { source, advisories: await extractFrom(source, pageText), ok: true };
      } catch {
        return { source, advisories: [] as Advisory[], ok: false };
      }
    }),
  );

  const advisories: Advisory[] = [];
  const seen = new Set<string>();
  const read: string[] = [];
  const skipped: string[] = [];

  for (const entry of settled) {
    if (!entry.ok) {
      skipped.push(entry.source.id);
      continue;
    }
    read.push(entry.source.id);
    for (const advisory of entry.advisories) {
      if (seen.has(advisory.id)) continue;
      seen.add(advisory.id);
      advisories.push(advisory);
    }
  }

  return { advisories, read, skipped };
}
