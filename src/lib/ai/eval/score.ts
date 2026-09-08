import { DECISIVE, GOLDEN, type EvalCase, type Origin } from "./dataset";

/**
 * Scoring a classifier against the golden set.
 *
 * Pure, so the arithmetic can be tested without a model behind it — the numbers
 * this produces are the ones a release decision is made on, and a scorer nobody
 * has checked is worse than no scorer.
 *
 * ── Why balanced accuracy is the headline ───────────────────────────────────
 *
 * The golden set is imbalanced on purpose, because what arrives is imbalanced:
 * most of it is financial fraud. A classifier that answered "financial-fraud"
 * to every account would score around 60% on plain accuracy while getting every
 * digital-arrest case wrong — and digital arrest is the one where being wrong
 * costs the most, because it is the case where the victim is least able to tell
 * that the answer is wrong.
 *
 * Balanced accuracy is the mean of the per-class recalls, so every category
 * counts once however rare it is. A classifier that ignores a class cannot hide
 * behind the size of another.
 */

export interface Prediction {
  id: string;
  category: string;
  subcategory?: string;
  /** 0–1, as the model reported it. */
  confidence: number;
}

export interface ClassScore {
  category: string;
  /** Cases of this class the classifier found. */
  recall: number;
  /** Of what it called this class, how much really was. */
  precision: number;
  support: number;
}

export interface Report {
  accuracy: number;
  /** The headline. Mean of per-class recall — see above. */
  balancedAccuracy: number;
  /** Of the cases with an unambiguous answer, how many were right. */
  decisiveAccuracy: number;
  /** Subcategory accuracy, counted only where the category was already right. */
  subcategoryAccuracy: number;
  perClass: ClassScore[];
  perOrigin: { origin: Origin; accuracy: number; support: number }[];
  /** Every miss, for reading rather than for arithmetic. */
  misses: {
    id: string;
    text: string;
    expected: string;
    got: string;
    confidence: number;
    note?: string;
  }[];
  /**
   * The number that matters most for trust: cases the classifier got wrong
   * while reporting high confidence. A wrong answer offered tentatively can be
   * caught by the person confirming it. A wrong answer offered at 0.9 cannot.
   */
  confidentlyWrong: number;
  total: number;
}

const CONFIDENT = 0.75;

export function score(predictions: Prediction[], cases: EvalCase[] = GOLDEN): Report {
  const byId = new Map(predictions.map((p) => [p.id, p]));
  const classes = [...new Set(cases.map((c) => c.category))].sort();

  let correct = 0;
  let confidentlyWrong = 0;
  const misses: Report["misses"] = [];

  for (const c of cases) {
    const got = byId.get(c.id);
    const hit = got?.category === c.category;
    if (hit) correct += 1;
    else {
      if ((got?.confidence ?? 0) >= CONFIDENT) confidentlyWrong += 1;
      misses.push({
        id: c.id,
        text: c.text,
        expected: c.category,
        got: got?.category ?? "(no prediction)",
        confidence: got?.confidence ?? 0,
        note: c.note,
      });
    }
  }

  const perClass: ClassScore[] = classes.map((category) => {
    const actual = cases.filter((c) => c.category === category);
    const called = cases.filter((c) => byId.get(c.id)?.category === category);
    const found = actual.filter((c) => byId.get(c.id)?.category === category).length;
    return {
      category,
      recall: actual.length ? found / actual.length : 0,
      precision: called.length ? found / called.length : 0,
      support: actual.length,
    };
  });

  const origins = [...new Set(cases.map((c) => c.origin))] as Origin[];
  const perOrigin = origins.map((origin) => {
    const rows = cases.filter((c) => c.origin === origin);
    const hits = rows.filter((c) => byId.get(c.id)?.category === c.category).length;
    return { origin, accuracy: rows.length ? hits / rows.length : 0, support: rows.length };
  });

  // Subcategory is only meaningful where the category was already right, and
  // only where the golden row commits to one.
  const subCases = cases.filter((c) => c.subcategory && byId.get(c.id)?.category === c.category);
  const subHits = subCases.filter((c) => byId.get(c.id)?.subcategory === c.subcategory).length;

  const decisive = DECISIVE.filter((c) => cases.includes(c));
  const decisiveHits = decisive.filter((c) => byId.get(c.id)?.category === c.category).length;

  return {
    accuracy: cases.length ? correct / cases.length : 0,
    balancedAccuracy: perClass.length
      ? perClass.reduce((sum, c) => sum + c.recall, 0) / perClass.length
      : 0,
    decisiveAccuracy: decisive.length ? decisiveHits / decisive.length : 0,
    subcategoryAccuracy: subCases.length ? subHits / subCases.length : 0,
    perClass,
    perOrigin,
    misses,
    confidentlyWrong,
    total: cases.length,
  };
}

/**
 * The bar a change has to clear.
 *
 * Deliberately not 100%. A classifier that is perfect on twenty hand-written
 * cases is a classifier that has been tuned to twenty hand-written cases, and
 * the number to watch is the trend across releases rather than the absolute.
 *
 * `confidentlyWrong` is the one with a hard ceiling. Everything else here can
 * move a little between models; a confident wrong answer is the failure this
 * product cannot absorb, because the entire design assumes the person can
 * correct what they are shown, and nobody corrects an answer that looks sure.
 */
export const THRESHOLDS = {
  balancedAccuracy: 0.7,
  decisiveAccuracy: 0.8,
  confidentlyWrong: 2,
} as const;

export function meetsBar(report: Report): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  if (report.balancedAccuracy < THRESHOLDS.balancedAccuracy) {
    failures.push(`balanced accuracy ${pct(report.balancedAccuracy)} < ${pct(THRESHOLDS.balancedAccuracy)}`);
  }
  if (report.decisiveAccuracy < THRESHOLDS.decisiveAccuracy) {
    failures.push(`decisive accuracy ${pct(report.decisiveAccuracy)} < ${pct(THRESHOLDS.decisiveAccuracy)}`);
  }
  if (report.confidentlyWrong > THRESHOLDS.confidentlyWrong) {
    failures.push(`${report.confidentlyWrong} confidently wrong (max ${THRESHOLDS.confidentlyWrong})`);
  }
  return { ok: failures.length === 0, failures };
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;

/** A report a person can read, for the console and for CI output. */
export function format(report: Report): string {
  const lines = [
    "",
    `  cases                 ${report.total}`,
    `  balanced accuracy     ${pct(report.balancedAccuracy)}   ← headline`,
    `  accuracy              ${pct(report.accuracy)}`,
    `  decisive accuracy     ${pct(report.decisiveAccuracy)}`,
    `  subcategory accuracy  ${pct(report.subcategoryAccuracy)}`,
    `  confidently wrong     ${report.confidentlyWrong}`,
    "",
    "  per class",
    ...report.perClass.map(
      (c) => `    ${c.category.padEnd(18)} recall ${pct(c.recall).padStart(4)}  precision ${pct(c.precision).padStart(4)}  n=${c.support}`,
    ),
    "",
    "  per origin",
    ...report.perOrigin.map(
      (o) => `    ${o.origin.padEnd(18)} ${pct(o.accuracy).padStart(4)}  n=${o.support}`,
    ),
  ];

  if (report.misses.length) {
    lines.push("", "  misses");
    for (const m of report.misses) {
      lines.push(`    ${m.id}  expected ${m.expected}, got ${m.got} @ ${m.confidence.toFixed(2)}`);
      lines.push(`      "${m.text.slice(0, 88)}${m.text.length > 88 ? "…" : ""}"`);
      if (m.note) lines.push(`      note: ${m.note}`);
    }
  }
  return lines.join("\n");
}
