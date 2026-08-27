/**
 * The 22 languages of the Eighth Schedule to the Constitution of India, plus English.
 *
 * `script` drives which Noto font family we attach; `dir` drives layout mirroring.
 * `endonym` is what the language calls itself — never show a citizen the English
 * exonym in a language picker they cannot read.
 */

export type Script =
  | "latin"
  | "devanagari"
  | "bengali"
  | "gujarati"
  | "gurmukhi"
  | "kannada"
  | "malayalam"
  | "odia"
  | "tamil"
  | "telugu"
  | "arabic"
  | "meetei"
  | "olchiki";

export interface Language {
  code: string;
  endonym: string;
  english: string;
  script: Script;
  dir: "ltr" | "rtl";
  /** Approximate speakers in India, millions — used to order the picker sensibly. */
  speakers: number;
  /** BCP-47 tag handed to the Web Speech API and to the transcription model. */
  speech: string;
}

export const LANGUAGES: Language[] = [
  { code: "en",  endonym: "English",    english: "English",   script: "latin",      dir: "ltr", speakers: 130, speech: "en-IN" },
  { code: "hi",  endonym: "हिन्दी",       english: "Hindi",     script: "devanagari", dir: "ltr", speakers: 528, speech: "hi-IN" },
  { code: "bn",  endonym: "বাংলা",       english: "Bengali",   script: "bengali",    dir: "ltr", speakers: 97,  speech: "bn-IN" },
  { code: "mr",  endonym: "मराठी",       english: "Marathi",   script: "devanagari", dir: "ltr", speakers: 83,  speech: "mr-IN" },
  { code: "te",  endonym: "తెలుగు",      english: "Telugu",    script: "telugu",     dir: "ltr", speakers: 81,  speech: "te-IN" },
  { code: "ta",  endonym: "தமிழ்",       english: "Tamil",     script: "tamil",      dir: "ltr", speakers: 69,  speech: "ta-IN" },
  { code: "gu",  endonym: "ગુજરાતી",     english: "Gujarati",  script: "gujarati",   dir: "ltr", speakers: 55,  speech: "gu-IN" },
  { code: "ur",  endonym: "اردو",        english: "Urdu",      script: "arabic",     dir: "rtl", speakers: 50,  speech: "ur-IN" },
  { code: "kn",  endonym: "ಕನ್ನಡ",       english: "Kannada",   script: "kannada",    dir: "ltr", speakers: 43,  speech: "kn-IN" },
  { code: "or",  endonym: "ଓଡ଼ିଆ",       english: "Odia",      script: "odia",       dir: "ltr", speakers: 37,  speech: "or-IN" },
  { code: "ml",  endonym: "മലയാളം",     english: "Malayalam", script: "malayalam",  dir: "ltr", speakers: 34,  speech: "ml-IN" },
  { code: "pa",  endonym: "ਪੰਜਾਬੀ",      english: "Punjabi",   script: "gurmukhi",   dir: "ltr", speakers: 33,  speech: "pa-IN" },
  { code: "as",  endonym: "অসমীয়া",     english: "Assamese",  script: "bengali",    dir: "ltr", speakers: 15,  speech: "as-IN" },
  { code: "mai", endonym: "मैथिली",      english: "Maithili",  script: "devanagari", dir: "ltr", speakers: 14,  speech: "hi-IN" },
  { code: "sat", endonym: "ᱥᱟᱱᱛᱟᱲᱤ",    english: "Santali",   script: "olchiki",    dir: "ltr", speakers: 7,   speech: "hi-IN" },
  { code: "ks",  endonym: "کٲشُر",        english: "Kashmiri",  script: "arabic",     dir: "rtl", speakers: 7,   speech: "ur-IN" },
  { code: "ne",  endonym: "नेपाली",      english: "Nepali",    script: "devanagari", dir: "ltr", speakers: 3,   speech: "ne-NP" },
  { code: "sd",  endonym: "سنڌي",        english: "Sindhi",    script: "arabic",     dir: "rtl", speakers: 3,   speech: "ur-IN" },
  { code: "doi", endonym: "डोगरी",       english: "Dogri",     script: "devanagari", dir: "ltr", speakers: 3,   speech: "hi-IN" },
  { code: "kok", endonym: "कोंकणी",      english: "Konkani",   script: "devanagari", dir: "ltr", speakers: 2,   speech: "mr-IN" },
  { code: "mni", endonym: "ꯃꯤꯇꯩꯂꯣꯟ",    english: "Manipuri",  script: "meetei",     dir: "ltr", speakers: 2,   speech: "bn-IN" },
  { code: "brx", endonym: "बर’",         english: "Bodo",      script: "devanagari", dir: "ltr", speakers: 1.5, speech: "hi-IN" },
  { code: "sa",  endonym: "संस्कृतम्",     english: "Sanskrit",  script: "devanagari", dir: "ltr", speakers: 0.02, speech: "hi-IN" },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const DEFAULT_LANGUAGE = "en";
export const LANG_COOKIE = "kavach-lang";

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

export function getLanguage(code: string | undefined | null): Language {
  return (code && BY_CODE.get(code)) || BY_CODE.get(DEFAULT_LANGUAGE)!;
}

/** Tailwind class that swaps in the right Noto family for the active script. */
export const SCRIPT_CLASS: Record<Script, string> = {
  latin: "script-latin",
  devanagari: "script-devanagari",
  bengali: "script-bengali",
  gujarati: "script-gujarati",
  gurmukhi: "script-gurmukhi",
  kannada: "script-kannada",
  malayalam: "script-malayalam",
  odia: "script-odia",
  tamil: "script-tamil",
  telugu: "script-telugu",
  arabic: "script-arabic",
  meetei: "script-meetei",
  olchiki: "script-olchiki",
};
