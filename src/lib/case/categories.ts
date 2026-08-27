import type { TrackId } from "./types";

/**
 * Mirrors the category tree the NCRP portal actually uses, so the description
 * we generate drops into the right place on the real site without the citizen
 * having to re-classify their own fraud under pressure.
 */
export interface SubCategory {
  id: string;
  label: string;
  /** Words, in English and romanised Hindi, that point at this sub-category. */
  hints: string[];
}

export interface Category {
  id: string;
  label: string;
  blurb: string;
  /** NCRP routes these three top-level tracks differently. */
  portalTrack: "financial" | "women-child" | "other";
  tracks: TrackId[];
  subcategories: SubCategory[];
}

const FINANCIAL_TRACKS: TrackId[] = [
  "helpline", "ncrp", "bank-notice", "bank-credit", "fir", "chakshu", "mrm", "ombudsman", "bank-resolution",
];
const NON_FINANCIAL_TRACKS: TrackId[] = ["ncrp", "fir", "chakshu"];

export const CATEGORIES: Category[] = [
  {
    id: "financial-fraud",
    label: "Online financial fraud",
    blurb: "Money left your account — UPI, cards, net banking, wallets.",
    portalTrack: "financial",
    tracks: FINANCIAL_TRACKS,
    subcategories: [
      { id: "upi", label: "UPI fraud", hints: ["upi", "gpay", "google pay", "phonepe", "paytm", "bhim", "qr", "scan", "collect request", "paisa", "transfer"] },
      { id: "card", label: "Debit or credit card fraud", hints: ["card", "debit", "credit", "cvv", "atm", "swipe", "card block"] },
      { id: "netbanking", label: "Internet banking fraud", hints: ["net banking", "netbanking", "internet banking", "beneficiary", "neft", "imps", "rtgs"] },
      { id: "wallet", label: "E-wallet fraud", hints: ["wallet", "e-wallet", "amazon pay", "mobikwik", "freecharge"] },
      { id: "otp", label: "OTP or KYC fraud", hints: ["otp", "kyc", "verification code", "bank called", "customer care", "update kyc", "account blocked", "aadhaar link"] },
      { id: "investment", label: "Investment or trading scam", hints: ["investment", "trading", "stock", "profit", "returns", "telegram group", "whatsapp group", "task", "part time job", "crypto invest"] },
      { id: "shopping", label: "Online shopping fraud", hints: ["ordered", "delivery", "product", "never arrived", "fake website", "shopping", "refund", "courier"] },
      { id: "loan", label: "Loan app fraud or harassment", hints: ["loan app", "instant loan", "recovery agent", "morphed", "contacts", "threatening", "blackmail loan"] },
      { id: "crypto", label: "Cryptocurrency fraud", hints: ["crypto", "bitcoin", "usdt", "binance", "wallet address", "trust wallet"] },
      { id: "insurance", label: "Insurance or refund fraud", hints: ["insurance", "policy", "lapsed", "bonus", "irda", "maturity"] },
    ],
  },
  {
    id: "digital-arrest",
    label: "Digital arrest or impersonation of officials",
    blurb: "Someone posing as police, CBI, customs, TRAI or a court.",
    portalTrack: "financial",
    tracks: FINANCIAL_TRACKS,
    subcategories: [
      { id: "digital-arrest", label: "Digital arrest", hints: ["digital arrest", "cbi", "narcotics", "parcel", "customs", "police video call", "supreme court", "money laundering", "skype", "uniform", "warrant", "trai"] },
      { id: "impersonation-govt", label: "Fake government officer", hints: ["income tax", "gst officer", "ed officer", "enforcement directorate", "aadhaar officer"] },
    ],
  },
  {
    id: "women-child",
    label: "Crime against a woman or child",
    blurb: "Sexual content, harassment, blackmail, exploitation of a minor.",
    portalTrack: "women-child",
    tracks: NON_FINANCIAL_TRACKS,
    subcategories: [
      { id: "sextortion", label: "Sextortion or nude video blackmail", hints: ["sextortion", "nude", "video call", "recording", "blackmail", "obscene", "leak", "screen recording"] },
      { id: "csam", label: "Child sexual abuse material", hints: ["child", "minor", "csam", "underage"] },
      { id: "harassment", label: "Online harassment or stalking of a woman", hints: ["stalking", "harass", "obscene message", "following", "abusive"] },
      { id: "morphed", label: "Morphed or non-consensual images", hints: ["morph", "photoshop", "fake photo", "deepfake", "edited photo"] },
    ],
  },
  {
    id: "social-media",
    label: "Social media and online abuse",
    blurb: "Fake profiles, hacked accounts, bullying, defamation.",
    portalTrack: "other",
    tracks: NON_FINANCIAL_TRACKS,
    subcategories: [
      { id: "fake-profile", label: "Fake profile or impersonation", hints: ["fake account", "fake profile", "impersonat", "my photos", "duplicate account", "instagram", "facebook"] },
      { id: "account-hack", label: "Account taken over", hints: ["hacked", "cannot login", "password changed", "account taken", "recovery email changed"] },
      { id: "bullying", label: "Cyberbullying or threats", hints: ["bully", "threat", "abuse", "trolling", "doxx"] },
      { id: "defamation", label: "Defamation", hints: ["defam", "false post", "reputation", "spreading lies"] },
    ],
  },
  {
    id: "hacking",
    label: "Hacking, data breach or ransomware",
    blurb: "Unauthorised access to a device, system, email or website.",
    portalTrack: "other",
    tracks: NON_FINANCIAL_TRACKS,
    subcategories: [
      { id: "email-hack", label: "Email or device compromised", hints: ["email hacked", "device", "malware", "virus", "remote access", "anydesk", "teamviewer"] },
      { id: "ransomware", label: "Ransomware", hints: ["ransom", "encrypted", "files locked", "bitcoin demand"] },
      { id: "data-breach", label: "Data breach", hints: ["data leak", "breach", "database", "records exposed"] },
      { id: "website", label: "Website defaced or attacked", hints: ["defaced", "website hacked", "server", "ddos"] },
    ],
  },
  {
    id: "other",
    label: "Something else",
    blurb: "Any other cybercrime.",
    portalTrack: "other",
    tracks: NON_FINANCIAL_TRACKS,
    subcategories: [
      { id: "gambling", label: "Illegal betting or gambling", hints: ["betting", "gambling", "casino", "rummy", "satta"] },
      { id: "trafficking", label: "Online trafficking", hints: ["trafficking", "job abroad", "forced", "passport taken"] },
      { id: "fake-news", label: "Fake news or misinformation", hints: ["fake news", "rumour", "misinformation"] },
      { id: "other", label: "Not sure", hints: [] },
    ],
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function findCategory(id?: string) {
  return id ? CATEGORY_BY_ID.get(id) : undefined;
}

export function findSubcategory(catId?: string, subId?: string) {
  return findCategory(catId)?.subcategories.find((s) => s.id === subId);
}

/** Compact form handed to the model so it classifies into ids we actually have. */
export function taxonomyForPrompt(): string {
  return CATEGORIES.map(
    (c) => `${c.id}: ${c.label}\n  ` + c.subcategories.map((s) => `${s.id} (${s.label})`).join(", "),
  ).join("\n");
}
