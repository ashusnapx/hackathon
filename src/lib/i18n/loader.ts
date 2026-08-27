import { en, type Dict, type DictKey } from "./dict/en";

/**
 * Dictionaries are code-split. A citizen on a 2G connection downloads exactly
 * one language file, never twenty-three.
 *
 * Only the languages listed here have a hand-written dictionary. Every other
 * language in the picker still works — the interface falls back to English
 * rather than rendering blanks — and the picker says so, because quietly
 * showing English under a Santali label would be a lie about coverage.
 */
type PartialDict = Partial<Record<DictKey, string>>;

const LOADERS: Record<string, () => Promise<{ default: PartialDict }>> = {
  hi: () => import("./dict/hi").then((m) => ({ default: m.hi })),
  mr: () => import("./dict/mr").then((m) => ({ default: m.mr })),
  kn: () => import("./dict/kn").then((m) => ({ default: m.kn })),
};

/** Languages with a real dictionary. Everything else falls back to English. */
export const TRANSLATED = new Set(["en", ...Object.keys(LOADERS)]);

export function isTranslated(code: string): boolean {
  return TRANSLATED.has(code);
}

const cache = new Map<string, Dict>();

export async function loadDict(code: string): Promise<Dict> {
  if (code === "en") return en as unknown as Dict;
  const hit = cache.get(code);
  if (hit) return hit;

  const load = LOADERS[code];
  if (!load) return en as unknown as Dict;

  try {
    const { default: partial } = await load();
    const merged = { ...(en as unknown as Dict), ...partial };
    cache.set(code, merged);
    return merged;
  } catch {
    return en as unknown as Dict;
  }
}
