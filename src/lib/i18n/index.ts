export { LANGUAGES, LANGUAGE_CODES, DEFAULT_LANGUAGE, LANG_COOKIE, getLanguage, SCRIPT_CLASS } from "./languages";
export type { Language, LanguageCode, Script } from "./languages";
export { en } from "./dict/en";
export type { Dict, DictKey } from "./dict/en";
export { I18nProvider, useI18n, useT } from "./context";
export { loadDict, isTranslated, TRANSLATED } from "./loader";
