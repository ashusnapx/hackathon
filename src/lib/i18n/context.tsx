"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
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

function readSavedLanguage(): string {
  let saved = readCookie();
  if (!saved) {
    try {
      saved = localStorage.getItem(LANG_COOKIE);
    } catch {
      /* private mode — use the server-selected/default language */
    }
  }
  return getLanguage(saved).code;
}

function subscribeSavedLanguage(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANG_COOKIE) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function I18nProvider({
  initial,
  children,
}: {
  initial?: string;
  children: React.ReactNode;
}) {
  const serverCode = getLanguage(initial || DEFAULT_LANGUAGE).code;
  const persistedCode = useSyncExternalStore(
    subscribeSavedLanguage,
    readSavedLanguage,
    () => serverCode,
  );
  const [chosenCode, setChosenCode] = useState<string | null>(null);
  const code = chosenCode ?? persistedCode;
  const [loaded, setLoaded] = useState<{ code: string; dict: Dict }>({
    code: DEFAULT_LANGUAGE,
    dict: en as unknown as Dict,
  });

  useEffect(() => {
    let cancelled = false;
    if (code === DEFAULT_LANGUAGE) return;
    loadDict(code).then((d) => {
      if (cancelled) return;
      setLoaded({ code, dict: d });
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // English is already in the bundle. Other dictionaries retain the previous
  // copy during their code-split load, matching the existing no-blank-screen
  // behaviour; `loading` is derived instead of synchronously set in an effect.
  const dict = code === DEFAULT_LANGUAGE ? (en as unknown as Dict) : loaded.dict;
  const loading = code !== DEFAULT_LANGUAGE && loaded.code !== code;

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
    setChosenCode(getLanguage(next).code);
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
