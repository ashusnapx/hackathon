/**
 * Where the landing page's own numbers come from.
 *
 * This file exists because of a failure worth recording. The four figures at
 * the top of this site used to be four strings in the dictionary with nothing
 * behind them, and two of them — "78% of them are financial fraud" and "~1 in 8
 * rupees actually recovered" — turned out to be untraceable to anything when
 * somebody finally checked. On a page whose entire argument is that a claim
 * should carry its source, the headline claim carried none.
 *
 * So the citation is now a link rather than a sentence, it points at a primary
 * document rather than at a news write-up of one, and it is monitored by
 * `scripts/check-sources.mjs` alongside the RBI and BNSS citations — because a
 * dead link under a statistic is the same failure as a dead link under a
 * deadline, and CI now checks both every Monday.
 *
 * The rule for anything added here: a government answer, gazette or circular.
 * A secondary write-up that does not itself name a primary source is not a
 * source, however widely it is repeated.
 */

export interface LandingSource {
  /** Shown to the reader. */
  label: string;
  url: string;
  /** What the figures cover, so a stale number is visible rather than implied. */
  period: string;
}

export const SCALE_SOURCE: LandingSource = {
  label: "Ministry of Home Affairs, Lok Sabha answer, 2 December 2025",
  url: "https://www.mha.gov.in/MHA1/Par2017/pdfs/par2025-pdfs/LS02122025/452.pdf",
  period: "Calendar year 2025",
};
