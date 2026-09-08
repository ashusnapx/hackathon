/**
 * What is being run on people right now.
 *
 * The rule engine in `signals.ts` catches the grammar of a scam — urgency, a
 * threat of arrest, a request to install something, a QR code you are told to
 * scan "to receive". That grammar is stable, which is why it is worth encoding.
 * The *stories* are not: the same pressure tactic arrives as a fake courier one
 * month, an electricity disconnection the next, and a fake FASTag KYC notice
 * after that. A page that only ever shows the six patterns it shipped with is
 * out of date the week it is deployed.
 *
 * So the Check page carries a dated advisory board on top of the rules, and it
 * is refreshed on a schedule from the bodies that actually publish this: I4C,
 * Sanchar Saathi/DoT, CERT-In and RBI. Three constraints shape how:
 *
 *   · **Every advisory names its source and its date.** A warning about fraud
 *     that cannot be traced back to who issued it is exactly the shape of the
 *     thing it is warning about.
 *   · **The page never depends on the refresh having worked.** The set below is
 *     committed, so the board renders on a cold cache, with no database, with
 *     no network, and on the day the cron job breaks. A stale board says how
 *     stale it is rather than pretending to be current.
 *   · **Nothing here is generated free-hand by a model.** The refresh job reads
 *     published advisory pages and stores what they say, with the link. A model
 *     inventing a plausible new scam would be indistinguishable from a real one
 *     to a reader, which makes it worse than showing nothing.
 */

export type AdvisorySeverity = "high" | "medium";

export interface Advisory {
  /** Stable across refreshes, so a re-run updates rather than duplicates. */
  id: string;
  /** What it is called, in the words a person would recognise it by. */
  title: string;
  /** One or two sentences: what happens, and the moment it turns. */
  summary: string;
  /** The single thing that gives it away. */
  tell: string;
  severity: AdvisorySeverity;
  /** Who published it. Named, never "reports suggest". */
  sourceName: string;
  sourceUrl: string;
  /** ISO date the source carries, not the date we read it. */
  publishedAt: string;
}

export interface AdvisoryBoard {
  advisories: Advisory[];
  /** When this set was last confirmed against its sources. */
  refreshedAt: string;
  /** Where it came from, so the page can say whether it is live or shipped. */
  origin: "live" | "baseline";
}

/**
 * The set the page ships with.
 *
 * Chosen because each one is both currently prevalent in India and legible
 * without context — a reader should recognise the situation from the first
 * line. Dates are the dates of the cited advisory, not of this file.
 */
export const BASELINE_ADVISORIES: Advisory[] = [
  {
    id: "digital-arrest",
    title: "“Digital arrest” video call",
    summary:
      "Someone in uniform on a video call says a parcel in your name held drugs, or that your Aadhaar is in a money-laundering case. You are told to stay on camera, tell nobody, and move money to a “verification account” while they watch.",
    tell: "No Indian police force, court or agency arrests anybody over a video call, or asks for money to clear your name.",
    severity: "high",
    sourceName: "I4C / MHA cyber safety advisory",
    sourceUrl: "https://cybercrime.gov.in",
    publishedAt: "2026-01-15",
  },
  {
    id: "fake-courier-customs",
    title: "Parcel held by customs",
    summary:
      "A call or recorded message claims a courier in your name is being held for illegal contents, then transfers you to a fake police or customs officer who demands a clearance fee.",
    tell: "A real courier problem never routes you to a police officer who wants a payment on the same call.",
    severity: "high",
    sourceName: "I4C / MHA cyber safety advisory",
    sourceUrl: "https://cybercrime.gov.in",
    publishedAt: "2026-01-15",
  },
  {
    id: "task-job-fraud",
    title: "Paid task / part-time job",
    summary:
      "A WhatsApp or Telegram message offers money for liking videos or rating hotels. The first few payouts arrive. Then a “prepaid task” asks you to deposit before you can withdraw, and the balance can never be released.",
    tell: "Real work is never paid by asking you to deposit money first to unlock your own earnings.",
    severity: "high",
    sourceName: "I4C / MHA cyber safety advisory",
    sourceUrl: "https://cybercrime.gov.in",
    publishedAt: "2026-01-15",
  },
  {
    id: "upi-collect-inversion",
    title: "“Scan this to receive the money”",
    summary:
      "A buyer on a resale app, or someone claiming a refund is due, sends a QR code or a UPI collect request and tells you to approve it to receive payment.",
    tell: "You never enter your UPI PIN to receive money. Entering it always sends money out.",
    severity: "high",
    sourceName: "RBI customer awareness — BE(A)WARE",
    sourceUrl: "https://www.rbi.org.in/commonperson/English/scripts/Limitedliability.aspx",
    publishedAt: "2026-02-01",
  },
  {
    id: "apk-remote-access",
    title: "Install this app so I can help",
    summary:
      "A caller posing as bank, telecom or app support sends an APK file, or asks you to install a screen-sharing tool, so they can “complete your KYC” or “process your refund”.",
    tell: "Anybody who needs to see your screen to fix your account is taking your account, not fixing it.",
    severity: "high",
    sourceName: "CERT-In advisory",
    sourceUrl: "https://www.cert-in.org.in",
    publishedAt: "2026-02-10",
  },
  {
    id: "spoofed-caller-id",
    title: "A number that looks official",
    summary:
      "The caller ID shows a bank's helpline, a government number, or a +91 landline you recognise. Caller ID can be forged, and increasingly is, including on calls that begin with a recorded IVR to sound institutional.",
    tell: "Hang up and dial the number printed on your own card or passbook. Never the number that called you.",
    severity: "medium",
    sourceName: "DoT Sanchar Saathi",
    sourceUrl: "https://sancharsaathi.gov.in/sfc/",
    publishedAt: "2026-03-05",
  },
];

/** Shipped set, presented as what it is. */
export function baselineBoard(): AdvisoryBoard {
  const refreshedAt = BASELINE_ADVISORIES
    .map((a) => a.publishedAt)
    .sort()
    .at(-1) ?? new Date().toISOString().slice(0, 10);
  return { advisories: BASELINE_ADVISORIES, refreshedAt, origin: "baseline" };
}

/** Days since the board was last confirmed, for the "as of" line. */
export function advisoryAgeDays(board: AdvisoryBoard, now = new Date()): number {
  const at = new Date(board.refreshedAt).getTime();
  if (!Number.isFinite(at)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - at) / 86_400_000));
}

/**
 * Past this, the board stops calling itself current.
 *
 * A week is generous for a daily job and short enough that a reader is never
 * shown month-old warnings under a label implying they are today's.
 */
export const ADVISORY_STALE_DAYS = 7;

export function isAdvisoryBoardStale(board: AdvisoryBoard, now = new Date()): boolean {
  return advisoryAgeDays(board, now) > ADVISORY_STALE_DAYS;
}

/** Shape guard for anything arriving from storage or the network. */
export function isAdvisory(value: unknown): value is Advisory {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const a = value as Record<string, unknown>;
  return typeof a.id === "string" && a.id.length > 0 && a.id.length <= 64
    && typeof a.title === "string" && a.title.length > 0 && a.title.length <= 200
    && typeof a.summary === "string" && a.summary.length > 0 && a.summary.length <= 800
    && typeof a.tell === "string" && a.tell.length > 0 && a.tell.length <= 400
    && (a.severity === "high" || a.severity === "medium")
    && typeof a.sourceName === "string" && a.sourceName.length > 0 && a.sourceName.length <= 120
    && typeof a.sourceUrl === "string" && /^https:\/\//.test(a.sourceUrl)
    && typeof a.publishedAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(a.publishedAt);
}
