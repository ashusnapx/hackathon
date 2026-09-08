import { UPI_HANDLES } from "@/lib/ai/extract";

/**
 * The check that happens before the money moves.
 *
 * Everything Kavach does otherwise begins after the loss. This runs on whatever
 * the citizen has in front of them — a message, a link, a UPI ID, a number that
 * just called — and names the tells.
 *
 * Design notes (why this file looks the way it does):
 * - Sources: I4C's scam-alert handbook (KYC, job/task, digital arrest,
 *   investment, lottery, APK, SIM-swap, mule, remote-access, quishing, search
 *   fraud), RBI/NPCI UPI guidance (PIN only ever pays, QR only ever sends,
 *   banks never ask for OTP/PIN, P2P collect requests discontinued Oct 2025),
 *   CERT-In phishing advisories, and Google Safe Browsing lexical heuristics
 *   (combosquatting, typosquatting, brand-in-subdomain, IP hosts).
 * - Two rules govern what is in here. Every signal is something that can be
 *   decided from the text itself, so nothing is invented; and nothing here ever
 *   returns "safe", because a clean result means only that these particular
 *   tells were absent. The authoritative check against reported identifiers is
 *   I4C's Suspect Repository, and we send people there rather than pretending
 *   to hold a copy of it.
 * - Scoring, not counting: a single decisive tell (digital arrest, APK, OTP
 *   demand, QR-to-receive) is enough for danger. Weaker tells accumulate into
 *   caution. This is what previously let plausible fraud through as
 *   "nothing found".
 */

export type Severity = "high" | "medium";

export interface Signal {
  id: string;
  severity: Severity;
  /** What was found, in the citizen's language. Written for someone in a hurry. */
  title: string;
  detail: string;
  /** The exact substring that triggered it, so the finding is checkable. */
  evidence?: string;
}

export type ScamFamily =
  | "digital-arrest"
  | "kyc-block"
  | "utility-block"
  | "parcel-customs"
  | "job-task"
  | "investment"
  | "lottery-prize"
  | "upi-inversion"
  | "advance-fee"
  | "remote-apk"
  | "customer-care"
  | "romance-sextortion"
  | "mule-rent"
  | "govt-scheme"
  | "loan-app"
  | "phishing-link"
  | "unknown";

export interface CheckResult {
  signals: Signal[];
  /** Identifiers worth pasting into the official Suspect Repository. */
  identifiers: { kind: "upi" | "phone" | "account" | "url" | "email" | "handle"; value: string }[];
  verdict: "danger" | "caution" | "nothing-found";
  /** 0–100. A single decisive tell scores ≥30 and forces danger. */
  riskScore: number;
  /** Best-guess family for the model prompt and the UI, never a certainty. */
  scamType: ScamFamily;
  /** How many pattern groups were evaluated — shown so "nothing found" is honest. */
  checksRun: number;
}

// ── Normalisation ───────────────────────────────────────────────────────────

/** Strip zero-width / bidi games, normalise fancy punctuation, collapse space. */
function normalise(raw: string): string {
  return (raw || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, "")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[—–―]/g, "-")
    .toLowerCase();
}

/** "o t p" / "o.t.p" / "o-t-p" still reads as OTP to a victim. */
const OTP_OBFUSCATED = /\bo[\s._\-*]*t[\s._\-*]*p\b/;
const PIN_OBFUSCATED = /\bp[\s._\-*]*i[\s._\-*]*n\b/;

// ── Vocabulary ──────────────────────────────────────────────────────────────

const BANK_WORDS = [
  "sbi", "hdfc", "icici", "axis", "kotak", "pnb", "boi", "canara", "union bank", "bob",
  "baroda", "yes bank", "idfc", "indusind", "federal bank", "rbi", "reserve bank",
  "bank of india", "central bank", "indian bank", "uco bank", "punjab national",
  "bandhan", "au bank", "phonepe", "paytm", "bhim", "upi",
  "एसबीआई", "बैंक", "केवाईसी",
];

const BRANDS = [
  "amazon", "flipkart", "paytm", "phonepe", "google pay", "gpay", "meesho", "myntra",
  "swiggy", "zomato", "irctc", "epfo", "income tax", "uidai", "aadhaar", "aadhar",
  "netflix", "fedex", "dhl", "dtdc", "delhivery", "india post", "bluedart",
  "electricity", "bijli", "fastag", "nhai", "parivahan",
];

/** What a scammer calls themselves when they want authority. */
const AUTHORITY_WORDS = [
  "cbi", "ncb", "narcotics", "customs", "enforcement directorate", "ed officer",
  "supreme court", "high court", "cyber crime", "cybercrime", "police station",
  "inspector", "commissioner", "dcp", "sp office", "trai", "rbi officer",
  "income tax officer", "drug department", "passport office",
  "सीबीआई", "पुलिस", "गिरफ्तार", "वारंट",
];

/** The threat half of authority fraud. One of these + one authority word = danger. */
const THREAT_WORDS = [
  "arrest", "warrant", "fir will be", "fir against", "non bailable", "non-bailable",
  "money laundering", "terror funding", "drug parcel", "narcotics", "ndps",
  "passport will be", "passport cancelled", "account will be frozen", "accounts frozen",
  "a/c will be frozen", "seized", "raided", "jail", "custody", "court case",
  "legal action", "penalty", "fine of rs",
];

/** Single phrases so decisive they need no corroboration. */
const DECISIVE_ARREST = [
  "digital arrest", "digitally arrested", "digitl arrest",
  "skype police", "video call arrest",
];

/** Registrars sell these cheaply and in bulk, which is why phishing lives on them. */
const CHEAP_TLDS = new Set([
  "xyz", "top", "club", "online", "site", "buzz", "cfd", "icu", "rest", "win",
  "link", "shop", "store", "cyou", "sbs", "monster", "quest", "click", "live",
  "fit", "beauty", "lol", "mom", "lat", "sbs", "vip", "fun", "tk", "ml", "ga",
  "cf", "gq", "work", "info", "pro",
]);

const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "cutt.ly", "rb.gy", "is.gd", "shorturl.at",
  "rebrand.ly", "t.me", "goo.gl", "ow.ly", "surl", "tiny.cc",
];

/** Free hosting where a "bank page" should never live. */
const FREE_HOSTS = [
  "blogspot", "wordpress.com", "wixsite", "weebly", "pages.dev", "workers.dev",
  "vercel.app", "netlify.app", "github.io", "glitch.me", "repl.co", "replit.dev",
  "firebaseapp.com", "web.app", "ngrok.io", "onrender.com", "streamlit.app",
  "notion.site", "sites.google", "my.canva.site", "linktr.ee",
];

const REMOTE_APPS = [
  "anydesk", "teamviewer", "quicksupport", "airdroid", "rustdesk", "ultraviewer",
  "screen share", "screen sharing", "screen-share", "remote access", "remote-access",
];

const APK_HINTS = [".apk", "download apk", "install apk", "install the apk", "side-load", "sideload", "allow unknown sources", "unknown sources"];

/** UPI / RBI truth: a PIN only ever PAYS. Any "PIN to receive" is fraud, full stop. */
const UPI_INVERSION = [
  "scan to receive", "scan qr to receive", "scan the qr to receive", "qr to receive",
  "enter pin to receive", "enter upi pin to receive", "share otp to receive",
  "approve to receive", "accept collect to receive", "pay rs 1 to verify",
  "pay re 1 to verify", "pay ₹1", "pay rs 1", "send 1 rupee", "send rs 1",
  "verify by paying", "receive cashback by scanning", "scan for cashback",
  "collect request", "request money", "upi collect", "autopay mandate",
];

const SECRET_PATTERNS: RegExp[] = [
  /\botp\b/, OTP_OBFUSCATED, /\bone[\s-]?time[\s-]?password\b/,
  /\bcvv\b/, /\bupi[\s-]?pin\b/, PIN_OBFUSCATED, /\batm[\s-]?pin\b/, /\bmpin\b/,
  /\bcard[\s-]?(number|no\.?|details)\b/, /\bexpiry[\s-]?(date)?\b/,
  /\bpassword\b/, /\bpasscode\b/, /\bshare (your|the|otp|pin)\b/,
  /otp (batao|bhejo|do|de do|batayen|send|share)/, /pin (dalo|batao|daalo|enter karo)/,
  /ओटीपी/, /पिन/,
];

const KYC_BLOCK = [
  "kyc expired", "kyc will expire", "kyc pending", "kyc update", "kyc verification",
  "kyc suspended", "update kyc", "complete your kyc", "re-kyc", "rekyc",
  "account will be blocked", "account blocked", "account suspended", "account will be closed",
  "account frozen", "upi will be blocked", "upi blocked", "card blocked", "card will be blocked",
  "केवाईसी", "kyc band",
];

const UTILITY_BLOCK = [
  "electricity bill", "bijli bill", "power bill", "connection will be disconnected",
  "disconnected tonight", "meter disconnected", "eb reading",
  "sim will be blocked", "sim blocked", "your number will be blocked", "ekyc for sim",
  "mobile will be deactivated", "trai notice", "fastag blocked", "fastag kyc",
  "challan pending", "traffic challan", "parivahan",
  "बिजली बिल", "बिजली कट",
];

const PARCEL_WORDS = [
  "parcel held", "parcel seized", "package held", "courier held", "fedex", "dhl",
  "customs duty", "clearance fee", "parcel contains narcotics", "parcel contains drugs",
  "drugs in your parcel", "contraband", "shipment on hold", "delivery failed",
  "re-confirm your address", "pay to release parcel",
];

const JOB_TASK = [
  "part time job", "part-time job", "work from home earn", "earn from home",
  "task based", "complete tasks", "like videos", "liking youtube", "rate products",
  "rating task", "captcha filling", "captcha work", "telegram task", "prepaid task",
  "task deposit", "task fee", "unlock tasks", "vip task", "merchant task",
  "daily income", "earn 2000", "earn 3000", "earn 5000", "per day earning",
  "registration fee", "joining fee", "training fee", "refundable deposit",
  "ghar baithe", "घर बैठे", "टास्क",
];

const INVESTMENT_LURE = [
  "guaranteed return", "double your money", "double your investment",
  "profit daily", "daily profit", "no risk", "zero risk", "100% profit",
  "crypto profit", "forex profit", "ipo allotment", "upper circuit",
  "trading group", "telegram channel", "vip signals", "copy trading",
  "demat profit", "dabba trading", "option tips",
  "sebi registered", "sebi approved", "nse certified", "bse certified",
  "pre-ipo", "ipo quota", "guaranteed allotment", "sme ipo",
  "fund manager", "portfolio will grow", "pms scheme",
];

/** Card reward points about to "expire" — among the most-forwarded smishes. */
const REWARD_WORDS = [
  "reward points", "reward point", "card points", "points expiring", "points expired",
  "points will lapse", "redeem your points", "redeem rewards", "redeem points",
  "convert points to cash", "credit card reward",
];

/** A familiar voice in crisis plus a payment rail: hang up, call back. */
const EMERGENCY_WORDS = [
  "met with an accident", "accident", "hospital", "admitted", "icu", "ventilator",
  "operation urgently", "urgent operation", "kidnapped", "kidnap",
  "in police custody", "bail money", "pay for bail",
];

/** Marketplace fraud: the "army buyer" who pays with QR codes and token advances. */
const ARMY_WORDS = [
  "army", "military", "cantt", "army officer", "defence personnel", "cisf", "crpf", "bsf",
];

/** Recovery fraud: a second harvest from people who already lost money once. */
const RECOVERY_WORDS = [
  "recover your money", "recover your lost", "get your money back", "fund recovery",
  "recovery agent", "chargeback fee", "cyber cell will refund", "refund your lost money",
];

/** The government never charges to take a complaint. Anyone who does is fraud. */
const OFFICIAL_FEE_WORDS = [
  "complaint fee", "fir fee", "fir charges", "ncrp fee", "portal fee",
  "case registration fee", "verification fee for complaint", "police clearance fee",
];

/** Refund and withdrawal lures riding on real schemes and portals. */
const REFUND_LURE_WORDS = [
  "epfo", "pf withdrawal", "provident fund", "irctc refund",
  "income tax refund", "tds refund", "pan blocked", "pan card blocked",
  "aadhaar biometric", "biometric lock", "ekyc for lpg", "lpg subsidy",
  "sahara refund", "sahara india",
];

/** Offer letters and visas that cost the applicant money are not real. */
const OFFER_WORDS = [
  "offer letter", "appointment letter", "joining letter", "visa fee",
  "work permit fee", "emigration clearance", "job confirmation fee",
];

const BOSS_WORDS = ["ceo", "md sir", "chairman", "managing director", "director sir", "boss", "auditor"];
const BOSS_TRANSFER_WORDS = [
  "strictly confidential", "keep this confidential", "do not discuss",
  "vendor payment", "urgent transfer", "transfer immediately", "bypass",
];

/** Celebrity and guru faces sell fake platforms: Sadhguru deepfakes cost crores. */
const ENDORSE_NAMES = [
  "sadhguru", "ambani", "adani", "tata", "narendra modi", "akshay kumar",
  "amitabh", "virat kohli", "dhoni", "ratan tata", "elon musk",
];

const CHARITY_WORDS = [
  "donate", "donation", "crowdfunding", "milaap", "ketto",
  "cancer treatment", "flood relief", "temple donation",
];

const BOOKING_WORDS = [
  "villa booking", "resort booking", "yatra booking", "chardham",
  "tour package", "hotel advance", "farmhouse booking",
];

const LOTTERY_PRIZE = [
  "you have won", "you won", "lucky winner", "lottery", "kbc", "kaun banega",
  "congratulations you", "prize money", "claim your prize", "prize department",
  "gift voucher", "free iphone", "free laptop", "free recharge", "cashback of rs",
  "refund approved", "to receive your prize", "processing fee", "release fee",
  "unlock your", "gift tax", "लॉटरी", "इनाम",
];

const MONEY_ASK = [
  "processing fee", "clearance fee", "verification charge", "refundable",
  "security deposit", "gst charge", "release fee", "unlock fee", "activation fee",
  "advance payment", "token amount", "booking amount",
];

const GOVT_SCHEME = [
  "pm kisan", "pm-kisan", "pmay", "ladli behna", "lakhpati didi", "free silai",
  "pm awas", "ayushman", "e-shram", "mnrega payment", "scholarship approved",
  "rte admission", "kisan nidhi",
];

const LOAN_WORDS = [
  "instant loan", "no cibil", "without cibil", "low cibil", "pre-approved loan",
  "loan approved", "disbursal fee", "loan app", "credit limit increase",
];

const CARE_TRAP = [
  "customer care", "customer support", "helpline number", "toll free",
  "call immediately", "call on", "contact immediately", "whatsapp us on",
  "support number",
];

const SEXTORTION_WORDS = [
  "nude video", "nude call", "video call recording", "your video is viral",
  "will viral", "will upload", "morphed", "morph video", "private video",
  "pay or we leak", "sextortion",
];

const MULE_WORDS = [
  "rent your account", "rent out your account", "rent your upi", "commission for using",
  "let us use your account", "account on rent", "rent whatsapp", "rent your whatsapp",
  "otp forwarding job", "sim on rent",
];

/** "rent your bank account" / "rent out your savings account" — wording drifts. */
const MULE_RX = /rent (out )?your(\s+\w+){0,3}\s+(account|upi)|commission\s+(for|on)\s+(using|your)|use your (bank )?account for/i;

const SECRECY_WORDS = [
  "do not tell anyone", "don't tell anyone", "do not inform anyone",
  "do not disconnect", "stay on the call", "stay on video", "stay on this call",
  "do not cut the call", "keep the call on", "do not contact police",
  "do not tell police", "do not tell your family", "keep this secret",
  "delete this message", "do not record",
];

const URGENCY_WORDS = [
  "within 24 hours", "within 2 hours", "within 1 hour", "immediately", "urgent",
  "will be blocked", "will be suspended", "last warning", "final notice",
  "act now", "expire today", "expires today", "account will be closed",
  "legal action", "last chance", "today only", "offer ends",
];

const FREE_MAIL = ["gmail.com", "yahoo.", "outlook.", "hotmail.", "rediffmail", "proton.me"];

const RX = {
  url: /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s"'<>)\]]*)?/gi,
  upi: new RegExp(String.raw`\b[\w.\-]{2,40}@[\w.\-]{2,20}\b`, "gi"),
  phoneIn: /(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/g,
  phoneIntl: /\+(?!91)\d{1,3}[\s-]?\d{6,14}\b/g,
  phoneToll: /\b1[68]\d{2}[\s-]?\d{3}[\s-]?\d{3,4}\b/g,
  account: /\b\d{9,18}\b/g,
  email: /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g,
  handle: /(?:^|[\s:])@([A-Za-z][A-Za-z0-9._]{2,29})\b/g,
  tme: /\bt\.me\/[\w_+]+\b/i,
  ipHost: /\bhttps?:\/\/\d{1,3}(?:\.\d{1,3}){3}/i,
};

const has = (text: string, words: string[]) => words.filter((w) => text.includes(w));
const hasRx = (text: string, rxs: RegExp[]) => rxs.some((r) => {
  r.lastIndex = 0;
  return r.test(text);
});

function hostOf(u: string): string {
  const withScheme = /^https?:\/\//i.test(u) ? u : `http://${u}`;
  try {
    return new URL(withScheme).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const CORE_BRANDS = [
  "sbi", "onlinesbi", "hdfcbank", "hdfc", "icicibank", "icici", "axisbank", "axis",
  "kotak", "pnb", "pnbindia", "bankofbaroda", "bob", "canarabank", "unionbank",
  "idfc", "indusind", "federalbank", "yesbank", "paytm", "phonepe", "bhim",
  "rbi", "npci", "uidai", "aadhaar", "aadhar", "epfo", "irctc", "incometax",
  "amazon", "flipkart", "meesho", "swiggy", "zomato", "fedex", "dhl",
];

/** Official sites live on these; anything else wearing a bank's name is not the bank. */
function isPlausiblyOfficial(host: string): boolean {
  if (/\.(gov\.in|nic\.in|ac\.in|edu\.in|rbi\.org\.in|org\.in)$/.test(host)) return true;
  if (/^(www\.)?(sbi|onlinesbi|hdfcbank|icicibank|axisbank|kotak|kotakbank|pnbindia|bankofbaroda|canarabank|unionbankofindia|idfcfirstbank|indusind|federalbank|yesbank|bandhanbank|aubank)\.(com|co\.in|in|bank\.in)$/.test(host)) return true;
  if (/^(www\.)?(rbi\.org\.in|npci\.org\.in|bhimbhim|uidai\.gov\.in|incometax\.gov\.in|epfindia\.gov\.in|irctc\.co\.in|sancharsaathi\.gov\.in|cybercrime\.gov\.in|parivahan\.gov\.in)$/.test(host)) return true;
  if (/^(www\.)?(amazon|flipkart|meesho|swiggy|zomato)\.(in|com)$/.test(host)) return true;
  return false;
}

/** sbi-kyc-verify, onlinesbi-update, sbicard-reward: brand + lure-word join. */
function isCombosquat(host: string): string | null {
  const bare = host.replace(/^www\./, "");
  const labels = bare.split(".");
  const sld = labels.slice(-2, -1)[0] || "";
  const joined = labels.slice(0, -1).join("-");
  for (const b of CORE_BRANDS) {
    const clean = b.replace(/\s/g, "");
    if (clean.length < 3) continue;
    if ((sld.includes(clean) || joined.includes(clean)) && !isPlausiblyOfficial(host)) {
      // The brand appears but the registered domain is not the brand's own.
      if (sld !== clean) return clean;
    }
  }
  return null;
}

/** paytm vs payttm, hdfc vs hdfcc: one- or two-letter drift on the registered part. */
function isTyposquat(host: string): string | null {
  const bare = host.replace(/^www\./, "");
  const sld = (bare.split(".").slice(-2, -1)[0] || "").replace(/-/g, "");
  if (sld.length < 4) return null;
  for (const b of CORE_BRANDS) {
    const clean = b.replace(/[^a-z]/g, "");
    if (clean.length < 4 || Math.abs(clean.length - sld.length) > 2) continue;
    if (sld !== clean && editDistance(sld, clean) <= 2 && editDistance(sld, clean) > 0) return clean;
  }
  return null;
}

// ── The check ───────────────────────────────────────────────────────────────

export function checkText(input: string): CheckResult {
  const raw = (input || "").trim();
  const text = normalise(raw);
  const signals: Signal[] = [];
  const identifiers: CheckResult["identifiers"] = [];
  const push = (s: Signal) => {
    if (!signals.some((x) => x.id === s.id && x.evidence === s.evidence)) signals.push(s);
  };
  let scamType: ScamFamily = "unknown";
  const claim = (f: ScamFamily) => { if (scamType === "unknown") scamType = f; };

  if (!raw) return { signals, identifiers, verdict: "nothing-found", riskScore: 0, scamType, checksRun: CHECK_GROUPS.length };

  const hasBank = has(text, BANK_WORDS).length > 0;
  const hasAuthority = has(text, AUTHORITY_WORDS).length > 0;

  // ── Links ────────────────────────────────────────────────────────────────
  // The @ trick ("https://safe.com@evil.xyz") never survives tokenising: the
  // URL regex splits at the @, so catch userinfo first, on the raw text.
  const userinfoHit = raw.match(/https?:\/\/[^\s"'<>)\]]+@[^\s"'<>)\]]+/i);
  if (userinfoHit) {
    const afterAt = userinfoHit[0].split("@").pop() || "";
    const realHost = hostOf(afterAt.includes("://") ? afterAt : `http://${afterAt}`);
    if (realHost) identifiers.push({ kind: "url", value: realHost });
    claim("phishing-link");
    push({ id: "url-at", severity: "high", evidence: realHost || userinfoHit[0],
      title: "This link hides its real destination behind @",
      detail: "Everything before the @ in a link is ignored by the browser. What you see is not where it goes." });
  }
  // URLs with userinfo ("safe.com@evil.xyz") are kept deliberately: the @
  // trick is itself a signal. Bare emails are excluded so foo@gmail.com does
  // not become a "url" identifier.
  const isBareEmail = (u: string) =>
    !/^https?:\/\//i.test(u) && !/^www\./i.test(u) && /^[\w.+-]+@[\w-]+\.[\w.-]{2,}$/.test(u);
  // An email's domain ("gmail.com" inside foo@gmail.com) is not a link.
  const emailList = (raw.match(RX.email) || []).map((e) => e.toLowerCase());
  const urls = Array.from(
    new Set(
      (raw.match(RX.url) || []).filter(
        (u) => !isBareEmail(u) && !emailList.some((e) => e.includes(u.toLowerCase())),
      ),
    ),
  );
  const hosts: string[] = [];
  for (const u of urls) {
    const host = hostOf(u);
    if (!host || !host.includes(".")) continue;
    hosts.push(host);
    identifiers.push({ kind: "url", value: host });

    const tld = host.split(".").pop() || "";

    if (RX.ipHost.test(u)) {
      claim("phishing-link");
      push({ id: "url-ip", severity: "high", evidence: host,
        title: "This link goes to a bare number, not a name",
        detail: "Real banks and companies do not send links that point at a raw IP address. This is a standard way of hiding where a page actually lives." });
    }
    if (host.startsWith("xn--") || host.includes(".xn--") || /[а-яё\u0370-\u03FF\u0900-\u097F]/.test(host)) {
      claim("phishing-link");
      push({ id: "url-punycode", severity: "high", evidence: host,
        title: "This link uses look-alike letters",
        detail: "The address contains characters from another alphabet chosen to look like ordinary English letters. It is not the site it appears to be." });
    }
    const combo = isCombosquat(host);
    if (combo) {
      claim("phishing-link");
      push({ id: "url-lookalike", severity: "high", evidence: host,
        title: `This link wears the name "${combo}" but is not that company's site`,
        detail: `The address contains "${combo}" plus extra words, but it is not on the official domain. Type the address yourself instead of following this.` });
    } else {
      const typo = isTyposquat(host);
      if (typo) {
        claim("phishing-link");
        push({ id: "url-typosquat", severity: "high", evidence: host,
          title: `This address is a near-miss spelling of "${typo}"`,
          detail: "One or two letters are off — the classic fake-site trick. Open the real site by typing its address yourself." });
      } else {
        const wearsABankName = [...BANK_WORDS, ...BRANDS].map((b) => b.replace(/\s/g, "")).find((b) => b.length > 3 && host.includes(b));
        if (wearsABankName && !isPlausiblyOfficial(host)) {
          claim("phishing-link");
          push({ id: "url-lookalike", severity: "high", evidence: host,
            title: `This link carries a known name but is not that company's site`,
            detail: `The address contains "${wearsABankName}" but does not sit on the official domain. Type the address yourself instead of following this.` });
        }
      }
    }
    if (/@/.test(u.split("://").pop() || "")) {
      claim("phishing-link");
      push({ id: "url-at", severity: "high", evidence: host,
        title: "This link hides its real destination behind @",
        detail: "Everything before the @ in a link is ignored by the browser. What you see is not where it goes." });
    }
    if (FREE_HOSTS.some((f) => host === f || host.endsWith(`.${f}`))) {
      claim("phishing-link");
      push({ id: "url-freehost", severity: "high", evidence: host,
        title: "This page lives on free hosting",
        detail: "No bank, government department or courier company hosts its payment or KYC page on a free site. This is somebody's throwaway page." });
    }
    if (CHEAP_TLDS.has(tld) && !isPlausiblyOfficial(host)) {
      push({ id: "url-tld", severity: "medium", evidence: host,
        title: `The address ends in .${tld}`,
        detail: "Endings like this are sold cheaply in bulk and are heavily used for fraud pages. An Indian bank or government service will not ask you to visit one." });
    }
    if (SHORTENERS.some((sh) => host === sh || host.endsWith(`.${sh}`))) {
      push({ id: "url-short", severity: "medium", evidence: host,
        title: "This is a shortened link",
        detail: "A shortened link hides where it really goes until you have already opened it. Ask the sender for the full address." });
    }
    if (/^http:\/\//i.test(u) && !RX.ipHost.test(u)) {
      push({ id: "url-http", severity: "medium", evidence: host,
        title: "This link is not encrypted",
        detail: "It begins with http, not https. No bank login or payment page in India runs without encryption." });
    }
    const subDepth = host.split(".").length;
    if (subDepth >= 4 && !isPlausiblyOfficial(host)) {
      push({ id: "url-subdomains", severity: "medium", evidence: host,
        title: "This address is stacked with subdomains",
        detail: "Fraud pages pile the real-sounding name on the left where people look, while the actual domain sits further right. Read the last two parts before the first slash." });
    }
    if (host.split("-").length - 1 >= 3 && !isPlausiblyOfficial(host)) {
      push({ id: "url-hyphens", severity: "medium", evidence: host,
        title: "This address is full of hyphens",
        detail: "Official domains are short. Strings like verify-update-secure strung together with dashes are a phishing hallmark." });
    }
  }

  // ── APK / file lures (I4C's fastest-growing vector) ──────────────────────
  const apkHit = has(text, APK_HINTS);
  if (apkHit.length) {
    claim("remote-apk");
    push({ id: "apk-file", severity: "high", evidence: apkHit[0],
      title: "This wants you to install a file outside the app store",
      detail: "A file installed this way can read your OTPs and take over your phone. Banks, police and government schemes never send .apk files. Delete it and do not open it." });
  }

  // ── UPI IDs ──────────────────────────────────────────────────────────────
  const upis = Array.from(new Set((raw.match(RX.upi) || []).filter((v) => !/\.[a-z]{2,}$/i.test(v.split("@")[1] || ""))));
  for (const v of upis) {
    identifiers.push({ kind: "upi", value: v });
    const handle = (v.split("@")[1] || "").toLowerCase();
    if (handle && !UPI_HANDLES.includes(handle)) {
      push({ id: "upi-handle", severity: "medium", evidence: v,
        title: "We do not recognise this UPI handle",
        detail: `The part after the @ is "${handle}", which is not one of the common bank or app handles. Check it in your payment app before sending anything.` });
    }
  }
  // A company never collects at a personal UPI ID — one UPI + one brand is enough.
  if (upis.length) {
    const brand = BRANDS.find((b) => text.includes(b));
    if (brand) {
      claim("advance-fee");
      push({ id: "upi-brand", severity: "high", evidence: upis[0],
        title: `A company will not collect at a personal UPI ID`,
        detail: `The message mentions ${brand} and also gives a UPI ID to pay. Refunds and orders from a real company never arrive as a request to pay a personal ID.` });
    }
  }

  // ── UPI inversion: PIN/QR to RECEIVE (RBI: PIN only ever pays) ────────────
  const inversion = has(text, UPI_INVERSION);
  if (inversion.length || /scan.*(qr|code)/.test(text) && /receiv|refund|cashback|prize/.test(text)) {
    claim("upi-inversion");
    push({ id: "upi-inversion", severity: "high", evidence: inversion[0] || "scan qr",
      title: "You are being asked to pay in order to receive",
      detail: "In UPI you NEVER enter a PIN or scan a QR to receive money — a PIN means money leaves your account. Anyone saying otherwise is defrauding you, including collect requests (discontinued by NPCI in 2025 because of this exact fraud)." });
  }

  // ── Emails & handles ─────────────────────────────────────────────────────
  for (const e of Array.from(new Set(raw.match(RX.email) || [])).slice(0, 6)) {
    identifiers.push({ kind: "email", value: e });
    const [local = "", domain = ""] = e.toLowerCase().split("@");
    const wearsOfficial = [...BANK_WORDS, ...AUTHORITY_WORDS, "support", "care", "helpdesk", "refund", "kyc"].some(
      (w) => w.length > 2 && local.replace(/[^a-z]/g, "").includes(w.replace(/[^a-z]/g, "")),
    );
    if (FREE_MAIL.some((f) => domain === f || domain.endsWith(`.${f}`)) && wearsOfficial) {
      claim("phishing-link");
      push({ id: "email-spoof", severity: "high", evidence: e,
        title: "This email pretends to be official but is a free mailbox",
        detail: "No bank, police unit or government department writes to you from a Gmail or Yahoo address wearing its own name. This is impersonation." });
    }
  }
  const tme = raw.match(RX.tme);
  if (tme) identifiers.push({ kind: "handle", value: tme[0] });
  for (const m of raw.matchAll(RX.handle)) {
    const h = `@${m[1]}`;
    if (!UPI_HANDLES.includes(m[1].toLowerCase())) identifiers.push({ kind: "handle", value: h });
  }

  // ── Numbers ──────────────────────────────────────────────────────────────
  const intl = Array.from(new Set(raw.match(RX.phoneIntl) || []));
  let domestic = raw;
  for (const i of intl) domestic = domestic.split(i).join(" ");
  const domesticPhones = Array.from(new Set(domestic.match(RX.phoneIn) || []));
  for (const p of domesticPhones) {
    identifiers.push({ kind: "phone", value: p.replace(/[\s-]/g, "").replace(/^\+?91/, "") });
  }
  if (intl.length && (hasBank || hasAuthority || has(text, ["parcel", "customs"]).length)) {
    claim("digital-arrest");
    push({ id: "phone-intl", severity: "high", evidence: intl[0],
      title: "This claims to be Indian but the number is not",
      detail: "The number does not begin with +91. No Indian police force, court or bank calls you from a foreign number." });
  }
  // Banks and government offices never call from a personal mobile.
  if (domesticPhones.length && (hasBank || hasAuthority) && !has(text, ["call 1930", "call 112", "call 15100"]).length) {
    const mentionsHelpline = hasRx(text, [/\b1800\b/, /\b1860\b/, /\b144/, /\b1930\b/, /\b112\b/]);
    if (!mentionsHelpline || /call.*\b[6-9]\d{9}\b/.test(text) || /whatsapp.*\b[6-9]\d{9}\b/.test(text)) {
      claim(hasAuthority ? "digital-arrest" : "customer-care");
      push({ id: "phone-personal-official", severity: "high", evidence: domesticPhones[0],
        title: "An office is calling from a personal mobile number",
        detail: "Banks, police and government departments call from official numbers or SMS headers (like HDFCBK, 160-series), never a 10-digit personal mobile. Save the number and verify it on the official website — never by calling it back." });
    }
  }
  for (const a of Array.from(new Set(raw.match(RX.account) || [])).slice(0, 4)) {
    if (!/^[6-9]\d{9}$/.test(a)) identifiers.push({ kind: "account", value: a });
  }

  // ── What is being asked for ──────────────────────────────────────────────
  if (hasRx(text, SECRET_PATTERNS)) {
    const hit = SECRET_PATTERNS.find((r) => { r.lastIndex = 0; return r.test(text); });
    let ev = "otp / pin";
    if (hit) {
      hit.lastIndex = 0;
      ev = text.match(hit)?.[0] || ev;
    }
    push({ id: "asks-secret", severity: "high", evidence: ev,
      title: "Something is asking you for a secret",
      detail: "No bank, no police officer and no genuine helpline ever asks for an OTP, a PIN, a CVV or a password. Anyone who does is defrauding you, whoever they say they are." });
  }

  const remote = has(text, REMOTE_APPS);
  if (remote.length || /screen[\s-]?shar/.test(text)) {
    claim("remote-apk");
    push({ id: "asks-remote", severity: "high", evidence: remote[0] || "screen share",
      title: "You are being asked to install a screen-sharing app",
      detail: `Installing ${remote[0] || "a screen-sharing app"} hands over your phone. Every keystroke, every OTP and every banking app becomes visible to whoever is on the other side. This is the single most costly thing a victim does.` });
  }

  // ── Digital arrest / authority intimidation ──────────────────────────────
  // One decisive phrase is enough. Previously this needed two matches, which is
  // exactly how "you are under digital arrest" slipped through as clean.
  const decisive = has(text, DECISIVE_ARREST);
  if (decisive.length) {
    claim("digital-arrest");
    push({ id: "digital-arrest", severity: "high", evidence: decisive.slice(0, 3).join(", "),
      title: "This is the digital arrest script",
      detail: "There is no such thing as arrest over a video call. No agency demands money to settle a case. Hang up, stay on no call, and tell someone near you. You are not under arrest." });
  } else {
    const authorityHits = has(text, AUTHORITY_WORDS);
    const threatHits = has(text, THREAT_WORDS);
    if (authorityHits.length && threatHits.length) {
      claim("digital-arrest");
      push({ id: "digital-arrest", severity: "high", evidence: [...authorityHits.slice(0, 2), ...threatHits.slice(0, 1)].join(", "),
        title: "Someone is using fear of the police to control you",
        detail: "Police, CBI, ED, customs and courts never investigate over WhatsApp calls, never keep you on video, and never ask for money to close a case. Cut the call and verify at a station you walk into." });
    } else if (authorityHits.length >= 2) {
      claim("digital-arrest");
      push({ id: "authority-cluster", severity: "medium", evidence: authorityHits.slice(0, 3).join(", "),
        title: "This leans on official names",
        detail: "Two or more agency names in one message is pressure, not procedure. Real notices come in writing with a case number you can verify — not on a call that forbids questions." });
    }
  }

  // ── KYC / account-block + link or number (the classic smish) ─────────────
  const kyc = has(text, KYC_BLOCK);
  if (kyc.length) {
    const withRail = hosts.length > 0 || domesticPhones.length > 0 || upis.length > 0;
    claim("kyc-block");
    push({ id: withRail ? "kyc-block-rail" : "kyc-block", severity: withRail ? "high" : "medium", evidence: kyc[0],
      title: withRail ? "Your account is not blocked — this message is the trap" : "Threats about blocked accounts are pressure tactics",
      detail: withRail
        ? "Banks never unblock accounts through links or personal numbers. This pairs a scare (blocked/KYC) with a payment rail — the exact smishing pattern I4C warns about. Open your bank app yourself; do not touch this link or number."
        : "Real KYC happens at the branch or inside the bank's own app, with weeks of notice — never a 24-hour link. Verify in your bank app, not here." });
  }

  // ── Utility / SIM / challan threats ──────────────────────────────────────
  const util = has(text, UTILITY_BLOCK);
  if (util.length) {
    const withRail = hosts.length > 0 || domesticPhones.length > 0;
    claim("utility-block");
    push({ id: "utility-block", severity: withRail ? "high" : "medium", evidence: util[0],
      title: "Nobody disconnects power or SIMs over one SMS with a link",
      detail: "Electricity boards, TRAI and telecom companies send bills through their own apps and give written notice. A same-day disconnection threat plus a link or number is fraud — check the official app, never this message." });
  }

  // ── Parcel / customs ─────────────────────────────────────────────────────
  const parcel = has(text, PARCEL_WORDS);
  if (parcel.length) {
    const withMoney = has(text, [...MONEY_ASK, "pay", "upi", "transfer"]).length > 0;
    claim("parcel-customs");
    push({ id: "parcel-scam", severity: withMoney || parcel.length >= 2 ? "high" : "medium", evidence: parcel[0],
      title: "This is the fake-parcel script",
      detail: "Customs never clears parcels over a personal UPI payment, and no courier holds drugs in your name and then negotiates on WhatsApp. Track the parcel on the courier's own site; pay nothing here." });
  }

  // ── Advance fee (pay to be paid) ─────────────────────────────────────────
  const money = has(text, MONEY_ASK);
  if (money.length || /pay.*(to receive|to claim|to unlock|for refund)/.test(text)) {
    claim("advance-fee");
    push({ id: "pay-to-receive", severity: "high", evidence: money[0] || "pay to receive",
      title: "You are being asked to pay in order to be paid",
      detail: "A refund, a prize, a loan or a parcel that requires you to send money first is not real. Money owed to you never requires money from you." });
  }

  // ── Job / task fraud (I4C's highest-volume complaint) ────────────────────
  const taskHits = has(text, JOB_TASK);
  if (taskHits.length) {
    const monetised = /earn|income|salary|deposit|fee|recharge|invest|pay|upi|telegram|whatsapp/.test(text);
    claim("job-task");
    push({ id: "job-task", severity: taskHits.length >= 2 || monetised ? "high" : "medium", evidence: taskHits.slice(0, 2).join(", "),
      title: taskHits.length >= 2 || monetised ? "This is the task-scam script" : "This looks like a job lure",
      detail: "Liking videos, rating products or filling captchas for daily income is the opening of a task fraud: small early payouts build trust, then a deposit or prepaid task empties the account. Real employers never make you pay to work." });
  }

  // ── Investment lure ──────────────────────────────────────────────────────
  const lure = has(text, INVESTMENT_LURE);
  if (lure.length) {
    const withGroup = /telegram|whatsapp group|vip|signal|demat|deposit|invest|download|install|\.apk|sebi|@valid|app|link/.test(text);
    claim("investment");
    push({ id: "too-good", severity: withGroup || lure.length >= 2 ? "high" : "medium", evidence: lure[0],
      title: withGroup || lure.length >= 2 ? "This is the investment-fraud script" : "This promises a return that does not exist",
      detail: "Guaranteed profits, doubled money and VIP trading groups caused three-quarters of India's reported cyber-fraud losses. Check the adviser on SEBI/RBI's Sachet portal — and never invest through a chat group." });
  }

  // ── Lottery / prize / refund bait ────────────────────────────────────────
  const prize = has(text, LOTTERY_PRIZE);
  if (prize.length) {
    const withFee = money.length > 0 || upis.length > 0 || hosts.length > 0 || /fee|tax|charge|pay|upi/.test(text);
    claim("lottery-prize");
    push({ id: "lottery-fee", severity: withFee || prize.length >= 2 ? "high" : "medium", evidence: prize.slice(0, 2).join(", "),
      title: withFee || prize.length >= 2 ? "You did not win — the fee is the fraud" : "Surprise prizes arrive with paperwork, not fees",
      detail: "KBC, Amazon and lotteries never announce wins by SMS and never collect tax or fees over UPI first. A prize that needs your payment is not a prize." });
  }

  // ── Card reward points about to "expire" ─────────────────────────────────
  const reward = has(text, REWARD_WORDS);
  if (reward.length) {
    const withRail = hosts.length > 0 || upis.length > 0 || domesticPhones.length > 0 || apkHit.length > 0;
    claim("advance-fee");
    push({ id: withRail ? "reward-scam" : "reward-bait", severity: withRail ? "high" : "medium", evidence: reward[0],
      title: withRail ? "Your card points are fine — this redemption link is the fraud" : "Points never expire by SMS link",
      detail: withRail
        ? "Banks redeem points inside their own app, never through a forwarded link, APK or personal number. This pairs expiring-points panic with a payment rail — delete it."
        : "Real redemptions happen inside your bank's app. Any SMS link to 'redeem before midnight' is bait; verify in the app, not here." });
  }

  // ── Family emergency + payment rail: possible cloned voice ────────────────
  // Kept honest: a real emergency also sounds urgent, so without a payment
  // rail this stays silent. With one, it says verify — never "this is fake".
  const emergency = has(text, EMERGENCY_WORDS);
  if (emergency.length && (upis.length || domesticPhones.length || hosts.length)) {
    const pressured = has(text, URGENCY_WORDS).length > 0 || has(text, SECRECY_WORDS).length > 0;
    claim("digital-arrest");
    push({ id: "emergency-verify", severity: pressured ? "high" : "medium", evidence: emergency[0],
      title: "A crisis plus a payment request: stop and call back",
      detail: "Three seconds of audio is enough to clone a voice — kidnapped-daughter and hospital calls now fool parents daily. Cut this call, ring the person on their saved number, and ask your family's code word before sending anything." });
  }

  // ── Army-buyer marketplace script ────────────────────────────────────────
  const army = has(text, ARMY_WORDS);
  if (army.length && (has(text, ["qr", "token", "advance", "upi", "pay", "collect"]).length > 0 || upis.length > 0)) {
    claim("upi-inversion");
    push({ id: "army-olx", severity: "high", evidence: army[0],
      title: "The 'army buyer' is a script, not a soldier",
      detail: "Uniform photos, IDs and batch numbers are stolen. The buyer overpays, sends a QR or collect request, or asks a token advance — and the seller's account is emptied. Deal in person, in cash or verified UPI, never by QR-to-receive." });
  }

  // ── Recovery fraud: victimised twice ─────────────────────────────────────
  const recovery = has(text, RECOVERY_WORDS);
  if (recovery.length && (has(text, [...MONEY_ASK, "fee", "charge", "advance", "pay"]).length > 0 || upis.length > 0)) {
    claim("advance-fee");
    push({ id: "recovery-fee", severity: "high", evidence: recovery[0],
      title: "Nobody can recover lost money for a fee",
      detail: "Recovery agents, chargeback desks and refund cells that ask for advance fees are the same gangs returning for a second harvest. Only your bank, 1930 and the courts move money back — and none of them charges for it." });
  }

  // ── Fees to file a complaint ─────────────────────────────────────────────
  const offFee = has(text, OFFICIAL_FEE_WORDS);
  if (offFee.length) {
    claim("advance-fee");
    push({ id: "official-fee", severity: "high", evidence: offFee[0],
      title: "Complaints are free — this fee is the fraud",
      detail: "NCRP, FIRs, 1930 and Chakshu cost nothing. Any complaint portal, officer or agent demanding a registration or verification fee is impersonating the system." });
  }

  // ── Refund / withdrawal lures on real scheme names ───────────────────────
  const refundLure = has(text, REFUND_LURE_WORDS);
  if (refundLure.length && (hosts.length || upis.length || apkHit.length || domesticPhones.length)) {
    claim("govt-scheme");
    push({ id: "refund-verify", severity: "high", evidence: refundLure[0],
      title: "This rides on a real scheme's name",
      detail: "EPFO, tax refunds, Sahara payouts and subsidies move through official portals and DBT — never a forwarded link plus UPI ID or APK. Open the scheme's own site yourself; this message is wearing its name." });
  }

  // ── Offer-letter / visa fees ─────────────────────────────────────────────
  const offer = has(text, OFFER_WORDS);
  if (offer.length && (has(text, [...MONEY_ASK, "fee", "deposit", "pay"]).length > 0 || upis.length > 0)) {
    claim("job-task");
    push({ id: "offer-fee", severity: "high", evidence: offer[0],
      title: "Real employers never charge you to join",
      detail: "Offer letters, visas and training that need a deposit or fee are bought-and-printed lures. Verify the company on its own site and MCA records — never through the recruiter's link." });
  }

  // ── Boss scam: cloned executive orders a secret transfer ─────────────────
  const boss = has(text, BOSS_WORDS);
  const bossMove = has(text, BOSS_TRANSFER_WORDS);
  if (boss.length && bossMove.length) {
    claim("digital-arrest");
    push({ id: "boss-scam", severity: "high", evidence: [...boss.slice(0, 1), ...bossMove.slice(0, 1)].join(", "),
      title: "Your 'boss' would not order secrecy over chat",
      detail: "SEBI's 2026 warning names this the Boss Scam: cloned voices and deepfake video of executives pushing confidential, urgent transfers. Call the person back on a known number. No real order forbids verification." });
  }

  // ── Fake celebrity / guru endorsement of a platform ──────────────────────
  const endorse = has(text, ENDORSE_NAMES);
  if (endorse.length && (lure.length > 0 || has(text, ["invest", "trading", "profit", "deposit", "platform", "app"]).length > 0)) {
    claim("investment");
    push({ id: "endorse-fake", severity: "high", evidence: endorse[0],
      title: "That celebrity did not endorse this platform",
      detail: "AI videos of gurus and stars selling trading apps cost Indians crores — one Bengaluru victim lost Rs 3.75 crore. Check SEBI's verified intermediary list; a video is not verification." });
  }

  // ── Charity + personal rail: verify, don't accuse ────────────────────────
  const charity = has(text, CHARITY_WORDS);
  if (charity.length && (upis.length > 0 || domesticPhones.length > 0) && !/milaap\.org|ketto\.org/.test(hosts.join(" "))) {
    claim("advance-fee");
    push({ id: "charity-check", severity: "medium", evidence: charity[0],
      title: "Check the charity before the kindness",
      detail: "Real fundraisers live on known platforms with traceable organisers. A personal UPI ID plus a forwarded tragedy deserves one verification call before any donation." });
  }

  // ── Travel / rental booking advances ─────────────────────────────────────
  const booking = has(text, BOOKING_WORDS);
  if (booking.length && (upis.length > 0 || has(text, ["advance", "token", "pay"]).length > 0)) {
    claim("advance-fee");
    push({ id: "booking-verify", severity: "medium", evidence: booking[0],
      title: "Verify the listing before the advance",
      detail: "Fake villas, yatra packages and rentals vanish after a token amount to a personal UPI ID. Insist on a video walkthrough, GST invoice and a reversible payment route — never QR-to-receive." });
  }

  // ── Govt scheme lure ─────────────────────────────────────────────────────
  const scheme = has(text, GOVT_SCHEME);
  if (scheme.length && (hosts.length || upis.length || /verify|link|register|fee|kyc/.test(text))) {
    claim("govt-scheme");
    push({ id: "govt-scheme", severity: "high", evidence: scheme[0],
      title: "This misuses a government scheme's name",
      detail: "PM-Kisan, housing and scholarship money comes through official .gov.in portals and DBT to your bank — never a link plus UPI ID in a forwarded message. Apply on the scheme's own site." });
  }

  // ── Loan-app trap ────────────────────────────────────────────────────────
  const loan = has(text, LOAN_WORDS);
  if (loan.length && (/fee|download|apk|app|pay|upi/.test(text) || hosts.length > 0)) {
    claim("loan-app");
    push({ id: "loan-trap", severity: "high", evidence: loan[0],
      title: "This is the fake-loan script",
      detail: "Real lenders check CIBIL and deduct nothing upfront. Instant no-CIBIL loans that need a fee, an app download or contacts access end in extortion. Check the lender on RBI's Sachet portal first." });
  }

  // ── Fake customer-care / search fraud ────────────────────────────────────
  const care = has(text, CARE_TRAP);
  if (care.length && (domesticPhones.length > 0 || /call|whatsapp/.test(text))) {
    claim("customer-care");
    push({ id: "customer-care", severity: hasBank || has(text, ["refund", "blocked", "otp"]) ? "high" : "medium", evidence: care[0],
      title: "Do not call the number in this message for help",
      detail: "Fake helplines top search results and message forwards. They answer, sound professional, then ask for OTPs, remote access or a fee. Find the number on the company's own site or app — never in the message asking you to call." });
  }

  // ── Sextortion / romance pressure ────────────────────────────────────────
  const sex = has(text, SEXTORTION_WORDS);
  if (sex.length) {
    claim("romance-sextortion");
    push({ id: "sextortion", severity: "high", evidence: sex[0],
      title: "This is blackmail — paying never ends it",
      detail: "Block, do not pay, and preserve the chat. Paying marks you as someone who pays, and the demands grow. Report on the portal and, if a child is involved, call 1098. You are not alone in this." });
  }

  // ── Money-mule recruitment ───────────────────────────────────────────────
  const mule = has(text, MULE_WORDS);
  if (mule.length || MULE_RX.test(raw)) {
    claim("mule-rent");
    push({ id: "mule-recruit", severity: "high", evidence: mule[0] || "rent account",
      title: "Renting out your account makes YOU the accused",
      detail: "Accounts rented for commission carry fraud money. When police trace it, the account holder faces freezing and prosecution. No easy income is worth a criminal case." });
  }

  // ── Secrecy / isolation: the fraud talking, not procedure ────────────────
  const secrecy = has(text, SECRECY_WORDS);
  if (secrecy.length) {
    claim(scamType === "unknown" ? "digital-arrest" : scamType);
    push({ id: "secrecy", severity: "high", evidence: secrecy[0],
      title: "You are being told to hide this — that is the fraud talking",
      detail: "No real official forbids you from calling family, police or your bank. Isolation is how pressure works. Pause and tell someone near you what is happening." });
  }

  // ── Urgency / pressure ───────────────────────────────────────────────────
  const urgency = has(text, URGENCY_WORDS);
  if (urgency.length) {
    push({ id: "urgency", severity: signals.some((s) => s.severity === "high") ? "medium" : "medium", evidence: urgency[0],
      title: "You are being hurried",
      detail: "Pressure is the tool. A real bank gives you time and a branch to walk into. If you are being told to act now and not to tell anyone, that is the fraud talking." });
  }

  // ── Verdict: score, don't count ──────────────────────────────────────────
  const WEIGHT: Record<string, number> = {
    "digital-arrest": 40, secrecy: 32, "asks-secret": 35, "asks-remote": 40,
    "apk-file": 40, "upi-inversion": 38, "pay-to-receive": 35, "upi-brand": 35,
    "url-ip": 35, "url-punycode": 35, "url-lookalike": 35, "url-typosquat": 35,
    "url-at": 35, "url-freehost": 32, "email-spoof": 35, "phone-intl": 35,
    "phone-personal-official": 32, "kyc-block-rail": 35, "utility-block": 28,
    "parcel-scam": 30, "job-task": 30, "too-good": 28, "lottery-fee": 32,
    "govt-scheme": 32, "loan-trap": 32, "customer-care": 26, sextortion: 38,
    "mule-recruit": 32, "authority-cluster": 16, "kyc-block": 16, urgency: 10,
    "url-tld": 10, "url-short": 10, "url-http": 8, "url-subdomains": 8,
    "url-hyphens": 8, "upi-handle": 12,
    "reward-scam": 32, "reward-bait": 14, "emergency-verify": 16, "army-olx": 32,
    "recovery-fee": 34, "official-fee": 32, "refund-verify": 30, "offer-fee": 32,
    "boss-scam": 34, "endorse-fake": 32, "charity-check": 12, "booking-verify": 14,
  };
  let riskScore = 0;
  for (const s of signals) riskScore += WEIGHT[s.id] ?? 12;
  // Corroboration climbs fast, caps at 100. A lone medium stays caution.
  riskScore = Math.min(100, riskScore);
  if (signals.some((s) => s.severity === "high")) riskScore = Math.max(riskScore, 30);

  const high = signals.filter((s) => s.severity === "high").length;
  // Danger needs a decisive tell or a pile-up of weaker ones; lone mediums
  // stay caution so a real hospital bill to a known number is not called fraud.
  const verdict = high > 0 || riskScore >= 45 ? "danger" : signals.length > 0 ? "caution" : "nothing-found";

  return { signals, identifiers, verdict, riskScore, scamType, checksRun: CHECK_GROUPS.length };
}

// ── Check groups: the warning board ─────────────────────────────────────────
// Every signal belongs to exactly one group, so the page can render a fixed
// checklist where each row lights up from the scan. Labels stay English, like
// the signal titles themselves; the surrounding chrome is translated.

export interface CheckGroup {
  id: string;
  label: string;
  blurb: string;
}

export const CHECK_GROUPS: CheckGroup[] = [
  { id: "arrest", label: "Digital arrest & fake officials", blurb: "No agency arrests over video calls or collects fines on UPI." },
  { id: "family", label: "Family-emergency voices", blurb: "A crisis plus a payment request: cut, call back, code word." },
  { id: "secrets", label: "OTP / PIN / password demands", blurb: "Banks and police never ask. Anyone who does is fraud." },
  { id: "remote", label: "Screen-share & APK takeover", blurb: "AnyDesk, TeamViewer and .apk files hand over your phone." },
  { id: "upi", label: "UPI & QR tricks", blurb: "PIN and QR only ever SEND money. Never to receive." },
  { id: "fee", label: "Advance fees, prizes & rewards", blurb: "Refunds, prizes and points that need your payment first." },
  { id: "kyc", label: "KYC / account-block scares", blurb: "Real KYC happens in-app or at the branch, never via link." },
  { id: "utility", label: "Utility / SIM / challan threats", blurb: "Same-day disconnect SMS with a link or number." },
  { id: "parcel", label: "Parcel & customs", blurb: "Customs never clears parcels over personal UPI." },
  { id: "job", label: "Jobs, tasks & offer letters", blurb: "Paid tasks, rating work, and joining fees are the script." },
  { id: "invest", label: "Investment & trading groups", blurb: "Guaranteed returns and VIP signals. Check SEBI lists." },
  { id: "market", label: "Marketplace & bookings", blurb: "Army buyers, token advances, villa and yatra listings." },
  { id: "care", label: "Fake customer care", blurb: "Helplines from search results and message forwards." },
  { id: "sextort", label: "Blackmail & sextortion", blurb: "Paying never ends it. Block, preserve, report." },
  { id: "mule", label: "Mule recruitment", blurb: "Renting accounts makes you the accused." },
  { id: "scheme", label: "Schemes, refunds, loans & donations", blurb: "Govt money via .gov.in and DBT only; lenders on Sachet." },
  { id: "links", label: "Links & lookalikes", blurb: "Combosquat, typosquat, free hosting, shorteners, http." },
  { id: "sender", label: "Senders & contacts", blurb: "Foreign numbers, personal mobiles as offices, Gmail officials." },
  { id: "pressure", label: "Pressure & secrecy", blurb: "Hurry plus “tell no one” is the fraud talking." },
];

/** Every signal id maps to exactly one board group. */
export function groupOf(signalId: string): string {
  switch (signalId) {
    case "digital-arrest":
    case "authority-cluster":
    case "phone-intl":
      return "arrest";
    case "emergency-verify":
      return "family";
    case "asks-secret":
      return "secrets";
    case "asks-remote":
    case "apk-file":
      return "remote";
    case "upi-inversion":
    case "upi-brand":
    case "upi-handle":
      return "upi";
    case "pay-to-receive":
    case "lottery-fee":
    case "reward-scam":
    case "reward-bait":
    case "recovery-fee":
    case "official-fee":
      return "fee";
    case "kyc-block":
    case "kyc-block-rail":
      return "kyc";
    case "utility-block":
      return "utility";
    case "parcel-scam":
      return "parcel";
    case "job-task":
    case "offer-fee":
      return "job";
    case "too-good":
    case "endorse-fake":
      return "invest";
    case "army-olx":
    case "booking-verify":
      return "market";
    case "customer-care":
      return "care";
    case "sextortion":
      return "sextort";
    case "mule-recruit":
      return "mule";
    case "govt-scheme":
    case "loan-trap":
    case "refund-verify":
    case "charity-check":
      return "scheme";
    case "url-ip":
    case "url-punycode":
    case "url-lookalike":
    case "url-typosquat":
    case "url-at":
    case "url-freehost":
    case "url-tld":
    case "url-short":
    case "url-http":
    case "url-subdomains":
    case "url-hyphens":
      return "links";
    case "email-spoof":
    case "phone-personal-official":
    case "boss-scam":
      return "sender";
    case "secrecy":
    case "urgency":
      return "pressure";
    default:
      return "pressure";
  }
}
