/**
 * The golden set: accounts of fraud, each with the category it belongs in.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * Every other AI test in this repository is a *guard* — that a prompt cannot be
 * injected, that a document is safe to render, that a transcript is not
 * silently truncated. None of them ask the question that actually matters to a
 * victim: is the category right?
 *
 * A wrong category is not a cosmetic error here. It picks which of the ten
 * tracks open, which deadlines are computed, which draft is written and which
 * authority the person is sent to. Somebody misfiled from "digital arrest" into
 * "online shopping fraud" gets a confident, well-typeset complaint aimed at the
 * wrong place, and they will not know, because the whole reason they came here
 * is that they cannot tell these apart themselves.
 *
 * ── How the set is built ────────────────────────────────────────────────────
 *
 * Three origins, following the practice the field has settled on: cases written
 * by hand against known edge cases, phrasings taken from the real recorded call
 * and the transcripts in this repo, and deliberate near-misses that sit between
 * two categories. Every row records where it came from, so a score can be read
 * per origin — a model that only does well on the hand-written cases is a model
 * tuned to the test.
 *
 * Deliberately imbalanced, because reality is: financial fraud is most of what
 * arrives. That is why the harness reports **balanced accuracy** rather than
 * raw accuracy — a classifier that answered "financial-fraud" to everything
 * would score well on accuracy alone and be useless on the cases where being
 * wrong costs the most.
 *
 * ── The rule for adding a row ───────────────────────────────────────────────
 *
 * Nothing here is a real person's account. Every row is either invented or
 * paraphrased past the point of identification, with names, amounts and
 * identifiers replaced. A golden set of real complaints would be a database of
 * victims, and it would be the most sensitive file in the repository.
 */

export type Origin = "handwritten" | "from-transcript" | "near-miss";

export interface EvalCase {
  id: string;
  /** As somebody would actually say it, not as a form would ask for it. */
  text: string;
  /** The top-level category id from `CATEGORIES`. */
  category: string;
  /** Optional: the subcategory, where there is one obviously right answer. */
  subcategory?: string;
  origin: Origin;
  /** Why this one is here, when the reason is not obvious. */
  note?: string;
  /** Set where a human would also hesitate. Scored separately. */
  ambiguous?: boolean;
}

export const GOLDEN: EvalCase[] = [
  /* ── Financial fraud: the bulk of what arrives ───────────────────────── */
  {
    id: "fin-upi-01",
    text: "I got a collect request on PhonePe saying it was a refund and I approved it. 12,000 rupees went out instead of coming in.",
    category: "financial-fraud",
    subcategory: "upi",
    origin: "handwritten",
    note: "The collect-request inversion. The victim approved it, which matters for the RBI branch.",
  },
  {
    id: "fin-card-01",
    text: "Someone called saying my KYC expired and I paid 10000 rupees by card to a link they sent. The transaction failed first and then they asked again.",
    category: "financial-fraud",
    subcategory: "card",
    origin: "from-transcript",
    note: "The demo call, near-verbatim. If the set fails anywhere it should not be here.",
  },
  {
    id: "fin-otp-01",
    text: "Bank se call aaya, bola account block ho jayega, maine OTP bata diya aur 45,000 nikal gaye",
    category: "financial-fraud",
    subcategory: "otp",
    origin: "handwritten",
    note: "Romanised Hindi, which is what transcription returns for a large share of callers.",
  },
  {
    id: "fin-invest-01",
    text: "A Telegram group promised 30% returns on stock tips. I put in 2 lakh over three weeks and now the admin has removed me and the withdrawal page does not load.",
    category: "financial-fraud",
    subcategory: "investment",
    origin: "handwritten",
  },
  {
    id: "fin-loan-01",
    text: "I took 5000 from an instant loan app. They have my contacts now and are sending my photo to my family saying I am a thief unless I pay 40,000.",
    category: "financial-fraud",
    subcategory: "loan",
    origin: "near-miss",
    note: "Reads like harassment and is filed as loan-app fraud. The money is the anchor.",
  },
  {
    id: "fin-shopping-01",
    text: "Ordered a phone on a site I found on Instagram, paid 18,000, tracking number was fake and the site is gone now.",
    category: "financial-fraud",
    subcategory: "shopping",
    origin: "handwritten",
  },
  {
    id: "fin-crypto-01",
    text: "They told me to move my USDT to a wallet address for verification and it never came back. About 1.5 lakh worth.",
    category: "financial-fraud",
    subcategory: "crypto",
    origin: "handwritten",
  },
  {
    id: "fin-netbank-01",
    text: "Someone added a beneficiary on my net banking that I never added and did three IMPS transfers of 49,000 each overnight.",
    category: "financial-fraud",
    subcategory: "netbanking",
    origin: "handwritten",
    note: "Unauthorised, victim did not initiate — the RBI limited-liability branch turns on exactly this.",
  },

  /* ── Digital arrest: the one that must never be misfiled ──────────────── */
  {
    id: "arrest-01",
    text: "A man in a police uniform video called me on Skype saying a parcel in my name had drugs in it and that I was under digital arrest. He kept me on the call for six hours and I transferred 8 lakh to clear my name.",
    category: "digital-arrest",
    subcategory: "digital-arrest",
    origin: "handwritten",
    note: "The textbook case. Money moved, but the category is what opens the right track.",
  },
  {
    id: "arrest-02",
    text: "Someone claiming to be from the Enforcement Directorate said my Aadhaar was used for money laundering and I had to transfer funds to a safe account for verification.",
    category: "digital-arrest",
    subcategory: "impersonation-govt",
    origin: "near-miss",
    note: "Money moved by transfer, so a naive classifier files this as financial fraud. It is not.",
  },
  {
    id: "arrest-03",
    text: "TRAI wale bole ki mera number galat kaam me use ho raha hai, phir CBI officer se baat karwayi video call pe, bahut dara diya",
    category: "digital-arrest",
    subcategory: "digital-arrest",
    origin: "handwritten",
    note: "Romanised Hindi, and no money moved yet — the category must not depend on a loss.",
  },

  /* ── Women and children ──────────────────────────────────────────────── */
  {
    id: "wc-sextortion-01",
    text: "A woman video called me, I did not know her, she recorded the call and now she is threatening to send it to my contacts unless I pay.",
    category: "women-child",
    subcategory: "sextortion",
    origin: "handwritten",
    note: "The victim is usually male; the NCRP category is still the women-and-children tree.",
  },
  {
    id: "wc-morphed-01",
    text: "Someone has taken my photos from Instagram and made obscene pictures with my face and posted them in a group.",
    category: "women-child",
    subcategory: "morphed",
    origin: "handwritten",
  },
  {
    id: "wc-child-01",
    text: "My daughter is 14 and a man has been messaging her on a game asking for pictures. I have the screenshots.",
    category: "women-child",
    subcategory: "csam",
    origin: "handwritten",
    note: "Must route to the child track and the 1098 helpline, not to a fraud track.",
  },

  /* ── Social media and hacking ────────────────────────────────────────── */
  {
    id: "social-01",
    text: "Someone made a fake Facebook profile with my photos and is messaging my friends asking them for money.",
    category: "social-media",
    origin: "near-miss",
    note: "Money is being asked for, but from other people, and nothing of the victim's has moved.",
  },
  {
    id: "hack-01",
    text: "My email was logged into from another state and the recovery number was changed. Nothing has been taken yet but I cannot get back in.",
    category: "hacking",
    origin: "handwritten",
    note: "No loss at all. A classifier keyed on money will guess wrong.",
  },
  {
    id: "hack-02",
    text: "My WhatsApp got taken over after I forwarded a six digit code someone asked for, and now they are messaging my groups.",
    category: "hacking",
    origin: "near-miss",
    note: "An OTP was shared, which pulls hard toward OTP fraud. But no money moved: this is account takeover.",
  },

  /* ── Deliberate ambiguity ────────────────────────────────────────────── */
  {
    id: "amb-01",
    text: "I lost money online and I want to complain.",
    category: "financial-fraud",
    origin: "handwritten",
    ambiguous: true,
    note: "Almost nothing to go on. The right behaviour is the broad category and low confidence, not a confident guess at a subcategory.",
  },
  {
    id: "amb-02",
    text: "They said they were from the bank and also that police would come. I paid 30,000.",
    category: "digital-arrest",
    origin: "near-miss",
    ambiguous: true,
    note: "Genuinely between bank impersonation and digital arrest. A human would hesitate too; scored separately.",
  },
  {
    id: "other-01",
    text: "My neighbour keeps parking across my gate and we have been arguing about it.",
    category: "other",
    origin: "near-miss",
    note: "Not a cybercrime at all. Filing this as anything else is worse than declining it.",
  },
];

/** Rows a human would also hesitate on. Reported apart from the headline score. */
export const AMBIGUOUS = GOLDEN.filter((c) => c.ambiguous);
export const DECISIVE = GOLDEN.filter((c) => !c.ambiguous);
