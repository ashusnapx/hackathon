import { ruleTriage } from "@/lib/ai/fallback";
import { extractEntities } from "@/lib/ai/extract";
import {
  emptyIntake,
  nextIntakeStep,
  type ChildContext,
  type IntakeDraft,
  type IntakeStep,
  type MoneyAnswer,
  type SafetyAnswer,
} from "@/lib/intake/interview";

/**
 * The interview, as a conversation instead of a screen.
 *
 * ── What this covers, and what it hands over ────────────────────────────────
 *
 * WhatsApp runs the front half: the boundaries, the safety gate, whether a
 * child is involved, whether money has actually moved, a name, and the story
 * itself. Then it reads back what it heard, and sends a link.
 *
 * It stops there on purpose. The back half — the RBI eligibility branch, the
 * evidence checklist, the drafts, the ten clocks — is a form with branches and
 * documents, and delivering that down a chat thread would be worse than the
 * portal this product exists to improve on, not better. The link is not a
 * fallback: it is the right medium for the second half, and a Kavach case has
 * always been held by a link rather than by an account.
 *
 * ── Why the read-back uses no model ─────────────────────────────────────────
 *
 * `ruleTriage` and `extractEntities` are pure functions over the text. The
 * webhook has seconds before Meta retries, an LLM call is the one thing in this
 * path that can exceed that, and a retry storm on a fraud interview means
 * asking somebody to describe being robbed twice. So the reply that goes out
 * inside the webhook is computed, not generated. The browser re-runs the model
 * against the same narrative the moment the link is opened, which is where the
 * confidence scores and the NCRP category tree come from.
 *
 * ── Every reply is written for the worst moment of someone's year ───────────
 *
 * Short lines. One question at a time. Numbered options, because "reply 1" is
 * the only interaction that works identically on every handset, in every
 * script, at every level of literacy. Nothing here ever says "invalid input":
 * an answer we cannot parse re-asks the question, because the person is not
 * failing a form, the form is failing them.
 */

/** What the webhook should send back, and what to persist. */
export interface Turn {
  /** Sent in order, as separate messages: WhatsApp renders a wall of text badly. */
  messages: string[];
  draft: IntakeDraft;
  /** Set on the turn that finishes the interview. */
  handoff?: boolean;
}

const YES = /^(1|y|yes|haan|haa|ha|ok|okay|theek|thik|sahi|correct|right|ji)\b/i;
const NO = /^(2|n|no|nahi|nai|galat|wrong)\b/i;
const UNSURE = /^(3|not sure|unsure|pata nahi|maloom nahi|dunno)\b/i;

/** A person asking to be forgotten, at any point in the conversation. */
export const STOP = /^(stop|delete|forget me|erase|remove my data)\b/i;

const numbered = (options: string[]) => options.map((o, i) => `${i + 1}. ${o}`).join("\n");

/** Below this there is not enough of an account to read anything back from. */
const MIN_STORY = 25;

const ASK: Partial<Record<IntakeStep, () => string[]>> = {
  boundaries: () => [
    "Namaste. This is Kavach.",
    "Before anything else, two things you should know:\n\n• I am *not* the police and *not* a government service. I cannot file anything for you.\n• What I can do is take down what happened, in your language, and turn it into the exact paperwork the official channels ask for.",
    "If money has just left your account, stop reading and call *1930* first. Then come back — I will still be here.",
    `Shall we start?\n\n${numbered(["Yes, let's start", "Tell me more first"])}`,
  ],
  safety: () => [
    `First, the only question that matters right now.\n\nAre you safe at this moment?\n\n${numbered([
      "Yes, I am safe",
      "No — I am in danger",
      "I would rather not say",
    ])}`,
  ],
  emergency: () => [
    "Then please call *112* now. That is the emergency number and it reaches police, fire and ambulance.",
    "Your safety comes before any complaint. Message me when you are somewhere safe and we will pick this up.",
    "Reply *1* when you are ready to continue.",
  ],
  age: () => [
    `Is this about you, or about someone under 18?\n\n${numbered([
      "It happened to me, and I am an adult",
      "It happened to me, and I am under 18",
      "It happened to a child",
    ])}`,
  ],
  "child-safety": () => [
    "Thank you for telling me. Where a child is involved there is a dedicated helpline: *1098*, free, day or night.",
    "I will keep helping with the money side. Reply *1* to carry on.",
  ],
  money: () => [`Has money actually left your account?\n\n${numbered(["Yes", "No, not yet", "I am not sure"])}`],
  name: () => ["What should I call you? Just a first name is fine."],
  story: () => [
    "Now tell me what happened, in your own words.",
    "Type it, or send a voice note — whichever is easier. Any language. It does not need to be tidy or in order; I will sort it out.",
  ],
};

/**
 * Advance the interview by one message.
 *
 * Pure: no network, no database, and no clock beyond `now`. That is what lets
 * the whole conversation be tested as a table of inputs and expected replies
 * rather than by driving Meta's sandbox by hand.
 */
/**
 * Which question WhatsApp is on.
 *
 * Not `nextIntakeStep` directly. That machine puts a `details` step between the
 * name and the story — phone, email, postal address — because on the web those
 * boxes sit beside the chat and fill in as you go. Down a chat thread they
 * would be three more questions standing between somebody and the one thing
 * they opened WhatsApp to say. So here the story comes first and those are left
 * for the browser, which asks them after the story anyway.
 *
 * The phone is the exception: WhatsApp has already told us the number, so that
 * question never needs asking at all. `seed` fills it before the interview
 * starts.
 */
type WaStep = "boundaries" | "safety" | "emergency" | "age" | "child-safety"
  | "money" | "name" | "story" | "verify" | "handoff";

function whatsappStep(draft: IntakeDraft): WaStep {
  const step = nextIntakeStep(draft);
  switch (step) {
    case "boundaries":
    case "safety":
    case "emergency":
    case "age":
    case "child-safety":
    case "money":
    case "name":
    case "story":
    case "verify":
      return step;
    case "details":
      // Reached only between the name and the story, since everything after
      // `verify` hands over regardless.
      return draft.narrative.trim().length < MIN_STORY || !draft.analysis
        ? "story"
        : !draft.analysisConfirmed
          ? "verify"
          : "handoff";
    default:
      return "handoff";
  }
}

/**
 * A fresh interview that already knows the one thing WhatsApp can tell us.
 *
 * The number is stored as the person gave it to Meta — digits, international,
 * no plus — with the plus put back, because that is how every letter this
 * produces has to print it.
 */
export function seed(waId: string): IntakeDraft {
  const base = emptyIntake("whatsapp");
  return { ...base, details: { ...(base.details ?? {}), phone: `+${waId}` } };
}

export function advance(draft: IntakeDraft | null, text: string, now = new Date()): Turn {
  const current = draft ?? emptyIntake("whatsapp");
  const said = text.trim();

  switch (whatsappStep(current)) {
    case "boundaries": return openingTurn(current, said);
    case "safety": return safetyTurn(current, said, now);
    case "emergency": return emergencyTurn(current, said);
    case "age": return ageTurn(current, said);
    case "child-safety": return childSafetyTurn(current, said);
    case "money": return moneyTurn(current, said);
    case "name": return nameTurn(current, said);
    case "story": return storyTurn(current, said, now);
    case "verify": return verifyTurn(current, said);
    // Everything past `verify` is the web half: the draft is complete enough.
    case "handoff": return { messages: [], draft: current, handoff: true };
  }
}

/** The opening question for whatever step a conversation is sitting on. */
export function prompt(draft: IntakeDraft | null): string[] {
  return ASK[whatsappStep(draft ?? emptyIntake("whatsapp")) as IntakeStep]?.() ?? [];
}

function openingTurn(draft: IntakeDraft, said: string): Turn {
  if (!said) return { messages: ASK.boundaries!(), draft };
  if (YES.test(said)) return { messages: ASK.safety!(), draft: { ...draft, acceptedBoundaries: true } };
  if (NO.test(said)) {
    return {
      messages: [
        "Kavach is an independent tool for reporting online fraud. It is free, it asks for no OTP and no ID number, and it never submits anything on your behalf — you always send it yourself.",
        `Ready now?\n\n${numbered(["Yes, let's start", "Not yet"])}`,
      ],
      draft,
    };
  }
  return { messages: ASK.boundaries!(), draft };
}

function safetyTurn(draft: IntakeDraft, said: string, now: Date): Turn {
  const answer: SafetyAnswer | null = YES.test(said)
    ? "safe"
    : NO.test(said)
      ? "danger"
      : UNSURE.test(said) || /rather not/i.test(said)
        ? "prefer-not"
        : null;
  if (!answer) return { messages: ASK.safety!(), draft };

  const next: IntakeDraft = { ...draft, safety: answer, safetyCheckedAt: now.toISOString() };
  return { messages: answer === "danger" ? ASK.emergency!() : ASK.age!(), draft: next };
}

function emergencyTurn(draft: IntakeDraft, said: string): Turn {
  if (!YES.test(said)) return { messages: ASK.emergency!(), draft };
  return { messages: ASK.age!(), draft: { ...draft, emergencyAcknowledged: true } };
}

function ageTurn(draft: IntakeDraft, said: string): Turn {
  const context: ChildContext | null = /^1\b/.test(said)
    ? "adult-or-no-child"
    : /^2\b/.test(said)
      ? "self-minor"
      : /^3\b/.test(said)
        ? "child-other"
        : null;
  if (!context) return { messages: ASK.age!(), draft };

  const next = { ...draft, childContext: context };
  return {
    messages: context === "adult-or-no-child" ? ASK.money!() : ASK["child-safety"]!(),
    draft: next,
  };
}

function childSafetyTurn(draft: IntakeDraft, said: string): Turn {
  if (!YES.test(said)) return { messages: ASK["child-safety"]!(), draft };
  return { messages: ASK.money!(), draft: { ...draft, childSafetyAcknowledged: true } };
}

function moneyTurn(draft: IntakeDraft, said: string): Turn {
  const answer: MoneyAnswer | null = YES.test(said)
    ? "yes"
    : NO.test(said)
      ? "no"
      : UNSURE.test(said)
        ? "unsure"
        : null;
  if (!answer) return { messages: ASK.money!(), draft };

  const urgent = answer === "yes"
    ? ["Then call *1930* as soon as we are done here. Reporting fast is the single thing that most improves the odds of the money being held."]
    : [];
  return { messages: [...urgent, ...ASK.name!()], draft: { ...draft, moneyMoved: answer } };
}

function nameTurn(draft: IntakeDraft, said: string): Turn {
  const name = said.slice(0, 60).trim();
  if (!name) return { messages: ASK.name!(), draft };

  // Somebody who answers the name question with their whole story has not made
  // a mistake — they are answering the question they came to answer. Keep it as
  // the narrative rather than storing a paragraph as a first name.
  if (said.length > 80) {
    return { messages: ["Thank you — I have kept that. One thing first:", ...ASK.name!()], draft: { ...draft, narrative: said } };
  }
  return { messages: [`Thank you, ${name}.`, ...ASK.story!()], draft: { ...draft, callerName: name } };
}

function storyTurn(draft: IntakeDraft, said: string, now: Date): Turn {
  const narrative = [draft.narrative, said].filter(Boolean).join(" ").trim();
  if (narrative.length < MIN_STORY) {
    return {
      messages: ["Anything more you can remember helps — when it happened, how they reached you, what they asked for."],
      draft: { ...draft, narrative },
    };
  }

  const next: IntakeDraft = {
    ...draft,
    narrative,
    analysis: { triage: ruleTriage(narrative, now), entities: extractEntities(narrative), source: "rules" },
  };
  return { messages: readBack(next), draft: next };
}

function verifyTurn(draft: IntakeDraft, said: string): Turn {
  if (YES.test(said)) return { messages: [], draft: { ...draft, analysisConfirmed: true }, handoff: true };
  if (NO.test(said)) {
    // Not "which field was wrong?" — that is a form. A correction is more
    // sentences, appended, and the read-back is recomputed from all of it.
    return {
      messages: ["Tell me what I got wrong, and add anything I missed."],
      draft: { ...draft, analysis: undefined },
    };
  }
  return { messages: readBack(draft), draft };
}

/**
 * What we heard, back to them, before anything is built on it.
 *
 * Only fields actually found are listed. A read-back padded with "Amount: not
 * known" invites somebody to answer questions we did not ask, and the point of
 * this step is that unknowns stay unknown.
 */
function readBack(draft: IntakeDraft): string[] {
  const e = draft.analysis?.entities;
  const lines: string[] = [];
  // The amount lives on the triage, not the entities: it is a reading of the
  // whole account rather than a token lifted out of it.
  const amount = draft.analysis?.triage?.amount;
  if (amount) lines.push(`• Amount: *₹${amount.toLocaleString("en-IN")}*`);
  if (e?.upiIds?.length) lines.push(`• UPI ID: ${e.upiIds.join(", ")}`);
  if (e?.phones?.length) lines.push(`• Number: ${e.phones.join(", ")}`);
  if (e?.accounts?.length) lines.push(`• Account: ${e.accounts.join(", ")}`);
  if (e?.refs?.length) lines.push(`• Reference: ${e.refs.join(", ")}`);
  if (e?.urls?.length) lines.push(`• Link: ${e.urls.join(", ")}`);

  return [
    lines.length
      ? `Here is what I picked out:\n\n${lines.join("\n")}`
      : "I have your account of it. I could not pick out an amount or an identifier yet — that is fine, we can add them later.",
    `Is that right?\n\n${numbered(["Yes, that's right", "No — let me correct it"])}`,
  ];
}

/** The last messages, once the link exists. */
export function handoffMessages(link: string, draft: IntakeDraft): string[] {
  const name = draft.callerName ? `${draft.callerName}, ` : "";
  return [
    `${name}that is everything I need to start your case.`,
    `Your case file is here:\n${link}\n\nOpen it to finish the details and get your NCRP text, your bank letter, the 1930 script and the deadlines that apply to you.`,
    "Keep that link. It *is* your case — anyone holding it can open the file, and losing it loses the case.",
    draft.moneyMoved === "yes"
      ? "And if you have not called *1930* yet, do that now, before the paperwork."
      : "Nothing has been filed anywhere yet. You send it yourself, from the case file.",
  ];
}

/** Somebody who has already finished, messaging again. */
export function afterHandoff(link: string | null): string[] {
  return link
    ? [`Your case file is still here:\n${link}`, "Reply *STOP* if you want me to delete this conversation."]
    : ["Your interview is finished. Reply *STOP* if you want me to delete this conversation."];
}

export const FORGOTTEN =
  "Deleted. Nothing from this conversation is kept on our side. If you had a case link, that case still exists — it is held by the link, not by this chat.";
