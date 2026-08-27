import { UPI_HANDLES } from "@/lib/ai/extract";

/**
 * The check that happens before the money moves.
 *
 * Everything Kavach does otherwise begins after the loss. This runs on whatever
 * the citizen has in front of them — a message, a link, a UPI ID, a number that
 * just called — and names the tells.
 *
 * Two rules govern what is in here. Every signal is something that can be
 * decided from the text itself, so nothing is invented; and nothing here ever
 * returns "safe", because a clean result means only that these particular tells
 * were absent. The authoritative check against reported identifiers is I4C's
 * Suspect Repository, and we send people there rather than pretending to hold
 * a copy of it.
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

export interface CheckResult {
  signals: Signal[];
  /** Identifiers worth pasting into the official Suspect Repository. */
  identifiers: { kind: "upi" | "phone" | "account" | "url" | "email"; value: string }[];
  verdict: "danger" | "caution" | "nothing-found";
}

// ── Building blocks ─────────────────────────────────────────────────────────

const BANK_WORDS = [
  "sbi", "hdfc", "icici", "axis", "kotak", "pnb", "boi", "canara", "union bank", "bob",
  "baroda", "yes bank", "idfc", "indusind", "federal bank", "rbi", "reserve bank",
];

const BRANDS = [
  "amazon", "flipkart", "paytm", "phonepe", "google pay", "gpay", "meesho", "myntra",
  "swiggy", "zomato", "irctc", "epfo", "income tax", "uidai", "aadhaar", "netflix",
];

/** Registrars sell these cheaply and in bulk, which is why phishing lives on them. */
const CHEAP_TLDS = [
  "xyz", "top", "club", "online", "site", "buzz", "cfd", "icu", "rest", "win", "link",
  "shop", "store", "cyou", "sbs", "monster", "quest", "click", "live", "fit", "beauty",
];

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "rb.gy", "is.gd", "shorturl.at", "rebrand.ly", "t.me"];

const REMOTE_APPS = ["anydesk", "teamviewer", "quicksupport", "airdroid", "rustdesk", "ultraviewer", "screen share", "screen sharing"];

const SECRET_WORDS = ["otp", "one time password", "cvv", "pin number", "atm pin", "upi pin", "mpin", "password", "card number", "expiry date"];

const ARREST_WORDS = [
  "digital arrest", "cbi", "narcotics", "ncb", "customs", "parcel", "money laundering",
  "arrest warrant", "non bailable", "fir will be", "supreme court", "enforcement directorate",
  "ed officer", "trai", "your number will be blocked", "video call", "skype",
];

const URGENCY_WORDS = [
  "within 24 hours", "immediately", "urgent", "will be blocked", "will be suspended",
  "last warning", "final notice", "act now", "expire today", "account will be closed",
  "legal action", "do not tell anyone", "do not disconnect", "stay on the call",
];

const MONEY_ASK_WORDS = [
  "processing fee", "clearance fee", "customs duty", "verification charge", "refundable",
  "security deposit", "gst charge", "release fee", "unlock your", "to receive your prize",
];

const GREED_WORDS = [
  "guaranteed return", "double your money", "lottery", "you have won", "lucky winner",
  "part time job", "task based", "daily income", "work from home earn", "investment group",
  "profit daily", "no risk",
];

const RX = {
  url: /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s"'<>)]*)?/gi,
  upi: new RegExp(String.raw`\b[\w.\-]{2,40}@[\w.\-]{2,20}\b`, "gi"),
  phoneIn: /(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/g,
  phoneIntl: /\+(?!91)\d{1,3}[\s-]?\d{6,14}\b/g,
  account: /\b\d{9,18}\b/g,
  ipHost: /\bhttps?:\/\/\d{1,3}(?:\.\d{1,3}){3}/i,
};

const has = (text: string, words: string[]) => words.filter((w) => text.includes(w));

function hostOf(u: string): string {
  const withScheme = /^https?:\/\//i.test(u) ? u : `http://${u}`;
  try {
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Official sites live on these; anything else wearing a bank's name is not the bank. */
function isPlausiblyOfficial(host: string): boolean {
  return /\.(gov\.in|nic\.in|rbi\.org\.in)$/.test(host) ||
    /^(www\.)?(sbi|onlinesbi|hdfcbank|icicibank|axisbank|kotak|pnbindia|bankofbaroda|canarabank|unionbankofindia|idfcfirstbank|indusind|federalbank|yesbank)\.(com|co\.in|in)$/.test(host);
}

// ── The check ───────────────────────────────────────────────────────────────

export function checkText(input: string): CheckResult {
  const raw = (input || "").trim();
  const text = raw.toLowerCase();
  const signals: Signal[] = [];
  const identifiers: CheckResult["identifiers"] = [];
  const push = (s: Signal) => signals.push(s);

  if (!raw) return { signals, identifiers, verdict: "nothing-found" };

  // ── Links ────────────────────────────────────────────────────────────────
  const urls = Array.from(new Set((raw.match(RX.url) || []).filter((u) => !u.includes("@"))));
  for (const u of urls) {
    const host = hostOf(u);
    if (!host || !host.includes(".")) continue;
    identifiers.push({ kind: "url", value: host });

    const tld = host.split(".").pop() || "";
    const wearsABankName = [...BANK_WORDS, ...BRANDS].find((b) => host.includes(b.replace(/\s/g, "")));

    if (RX.ipHost.test(u)) {
      push({ id: "url-ip", severity: "high", evidence: host,
        title: "This link goes to a bare number, not a name",
        detail: "Real banks and companies do not send links that point at a raw IP address. This is a standard way of hiding where a page actually lives." });
    }
    if (host.startsWith("xn--") || host.includes(".xn--")) {
      push({ id: "url-punycode", severity: "high", evidence: host,
        title: "This link uses look-alike letters",
        detail: "The address contains characters from another alphabet chosen to look like ordinary English letters. It is not the site it appears to be." });
    }
    if (wearsABankName && !isPlausiblyOfficial(host)) {
      push({ id: "url-lookalike", severity: "high", evidence: host,
        title: `This link carries a known name but is not that company's site`,
        detail: `The address contains "${wearsABankName}" but does not sit on the official domain. Type the bank's address yourself instead of following this.` });
    }
    if (CHEAP_TLDS.includes(tld)) {
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
    const brand = BRANDS.find((b) => text.includes(b));
    if (brand) {
      push({ id: "upi-brand", severity: "high", evidence: v,
        title: `A company will not collect at a personal UPI ID`,
        detail: `The message mentions ${brand} and also gives a UPI ID to pay. Refunds and orders from a real company never arrive as a request to pay a personal ID.` });
    }
  }

  // ── Numbers ──────────────────────────────────────────────────────────────
  const intl = Array.from(new Set(raw.match(RX.phoneIntl) || []));
  // "+971 5551234" otherwise reads as the Indian number 9715551234, and we
  // would hand the citizen the wrong digits to look up.
  let domestic = raw;
  for (const i of intl) domestic = domestic.split(i).join(" ");
  for (const p of Array.from(new Set(domestic.match(RX.phoneIn) || []))) {
    identifiers.push({ kind: "phone", value: p.replace(/[\s-]/g, "").replace(/^\+?91/, "") });
  }
  if (intl.length && (has(text, BANK_WORDS).length || has(text, ARREST_WORDS).length)) {
    push({ id: "phone-intl", severity: "high", evidence: intl[0],
      title: "This claims to be Indian but the number is not",
      detail: "The number does not begin with +91. No Indian police force, court or bank calls you from a foreign number." });
  }
  for (const a of Array.from(new Set(raw.match(RX.account) || [])).slice(0, 4)) {
    if (!/^[6-9]\d{9}$/.test(a)) identifiers.push({ kind: "account", value: a });
  }

  // ── What is being asked for ──────────────────────────────────────────────
  const secrets = has(text, SECRET_WORDS);
  if (secrets.length) {
    push({ id: "asks-secret", severity: "high", evidence: secrets[0],
      title: "Something is asking you for a secret",
      detail: "No bank, no police officer and no genuine helpline ever asks for an OTP, a PIN, a CVV or a password. Anyone who does is defrauding you, whoever they say they are." });
  }

  const remote = has(text, REMOTE_APPS);
  if (remote.length) {
    push({ id: "asks-remote", severity: "high", evidence: remote[0],
      title: "You are being asked to install a screen-sharing app",
      detail: `Installing ${remote[0]} hands over your phone. Every keystroke, every OTP and every banking app becomes visible to whoever is on the other side. This is the single most costly thing a victim does.` });
  }

  const arrest = has(text, ARREST_WORDS);
  if (arrest.length >= 2) {
    push({ id: "digital-arrest", severity: "high", evidence: arrest.slice(0, 3).join(", "),
      title: "This is the digital arrest script",
      detail: "No agency in India arrests anyone over a video call, and none demands money to settle a case. Hang up. You are not under arrest, and nothing you are being told is going to happen to you." });
  }

  const money = has(text, MONEY_ASK_WORDS);
  if (money.length) {
    push({ id: "pay-to-receive", severity: "high", evidence: money[0],
      title: "You are being asked to pay in order to be paid",
      detail: "A refund, a prize or a parcel that requires you to send money first is not real. Money owed to you never requires money from you." });
  }

  const greed = has(text, GREED_WORDS);
  if (greed.length) {
    push({ id: "too-good", severity: "medium", evidence: greed[0],
      title: "This promises a return that does not exist",
      detail: "Guaranteed profits, task-based earnings and lottery wins are the opening move of an investment fraud. The early payouts are bait." });
  }

  const urgency = has(text, URGENCY_WORDS);
  if (urgency.length) {
    push({ id: "urgency", severity: "medium", evidence: urgency[0],
      title: "You are being hurried",
      detail: "Pressure is the tool. A real bank gives you time and a branch to walk into. If you are being told to act now and not to tell anyone, that is the fraud talking." });
  }

  // ── Verdict ──────────────────────────────────────────────────────────────
  const high = signals.filter((s) => s.severity === "high").length;
  const verdict = high > 0 ? "danger" : signals.length > 0 ? "caution" : "nothing-found";

  return { signals, identifiers, verdict };
}
