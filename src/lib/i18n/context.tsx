"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { en, type Dict, type DictKey } from "./dict/en";
import {
  DEFAULT_LANGUAGE,
  LANG_COOKIE,
  SCRIPT_CLASS,
  getLanguage,
  type Language,
} from "./languages";
import { loadDict } from "./loader";

interface I18nValue {
  lang: Language;
  dict: Dict;
  /** True while a newly chosen dictionary is still in flight. */
  loading: boolean;
  setLang: (code: string) => void;
  t: (key: DictKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function I18nProvider({
  initial,
  children,
}: {
  initial?: string;
  children: React.ReactNode;
}) {
  const [code, setCode] = useState(initial || DEFAULT_LANGUAGE);
  const [dict, setDict] = useState<Dict>(en as unknown as Dict);
  const [loading, setLoading] = useState(false);

  // Pick up a previous choice before first paint of the client tree.
  useEffect(() => {
    const saved = readCookie() || localStorage.getItem(LANG_COOKIE);
    if (saved && saved !== code) setCode(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (code === DEFAULT_LANGUAGE) {
      setDict(en as unknown as Dict);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadDict(code).then((d) => {
      if (cancelled) return;
      setDict(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const lang = useMemo(() => getLanguage(code), [code]);

  // Keep the document in sync so CSS, screen readers and RTL all follow.
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang.code;
    el.dir = lang.dir;
    el.dataset.script = lang.script;
    for (const cls of Object.values(SCRIPT_CLASS)) el.classList.remove(cls);
    el.classList.add(SCRIPT_CLASS[lang.script]);
  }, [lang]);

  const setLang = useCallback((next: string) => {
    setCode(next);
    try {
      localStorage.setItem(LANG_COOKIE, next);
      document.cookie = `${LANG_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* private mode — the choice just will not persist */
    }
  }, []);

  const t = useCallback((key: DictKey) => dict[key] ?? (en as Dict)[key] ?? key, [dict]);

  const value = useMemo(
    () => ({ lang, dict, loading, setLang, t }),
    [lang, dict, loading, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Shorthand for the common case: `const t = useT()` then `t("hero.h1a")`. */
export function useT() {
  return useI18n().t;
}
