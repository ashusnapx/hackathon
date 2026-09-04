import { CATEGORIES, findCategory, findSubcategory } from "@/lib/case/categories";
import { pickApplicableDocuments } from "@/lib/case/documents";
import type { CaseFile, Triage } from "@/lib/case/types";
import { extractAmount, extractIncidentTime } from "./extract";

/**
 * Everything the model does, done deterministically.
 *
 * This is not dead code for a demo — it is the degraded mode. Somebody filing at
 * 2am on a patchy connection should still walk away with a filled-in complaint
 * and a printable FIR application even if the model call times out.
 */

export function ruleTriage(text: string, now = new Date()): Triage {
  const lower = text.toLowerCase();

  let best = { catId: "other", subId: "other", score: 0 };
  for (const cat of CATEGORIES) {
    for (const sub of cat.subcategories) {
      let score = 0;
      for (const hint of sub.hints) if (lower.includes(hint)) score += hint.length > 6 ? 3 : 2;
      if (score > best.score) best = { catId: cat.id, subId: sub.id, score };
    }
  }

  const amount = extractAmount(text);
  const moneyWords = /(paisa|money|rupee|rs|₹|amount|transaction|debit|withdraw|गया|कट गए|पैसे)/i.test(text);

  // Money moved but nothing matched: financial fraud is by far the likeliest.
  if (best.score === 0 && (amount || moneyWords)) best = { catId: "financial-fraud", subId: "upi", score: 2 };

  const cat = findCategory(best.catId) ?? findCategory("other")!;
  const incidentAt = extractIncidentTime(text, now) || undefined;
  const minutesSince = incidentAt
    ? (now.getTime() - new Date(incidentAt).getTime()) / 60_000
    : Number.POSITIVE_INFINITY;

  return {
    categoryId: cat.id,
    subcategoryId: best.subId,
    // Never claim more than "fairly sure" without a model behind it.
    confidence: best.score >= 6 ? 0.72 : best.score >= 3 ? 0.55 : 0.3,
    amount,
    incidentAt,
    rationale: `Matched on keywords in your description${amount ? ` and an amount of ₹${amount.toLocaleString("en-IN")}` : ""}.`,
    applicableTracks: cat.tracks,
    urgency:
      cat.portalTrack === "financial" && minutesSince < 60
        ? "critical"
        : cat.portalTrack === "financial" && minutesSince < 1440
          ? "high"
          : "moderate",
  };
}

// ── Document templates ──────────────────────────────────────────────────────

const inr = (n?: number) => (n ? `Rs. ${n.toLocaleString("en-IN")}` : "the amount in question");

function fmtDate(iso?: string) {
  if (!iso) return "[date]";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "[date]";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateTime(iso?: string) {
  if (!iso) return "[date and time]";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "[date and time]";
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function refList(c: CaseFile): string {
  const refs = [...new Set([...c.entities.refs, ...c.txns.map((t) => t.ref).filter(Boolean)])] as string[];
  return refs.length ? refs.join(", ") : "not available";
}

function suspectLines(c: CaseFile): string {
  const s = c.suspect;
  const rows: string[] = [];
  if (s.phones.length) rows.push(`Mobile number used by suspect: ${s.phones.join(", ")}`);
  if (s.upiIds.length) rows.push(`UPI ID of suspect: ${s.upiIds.join(", ")}`);
  if (s.accounts.length) rows.push(`Bank account of suspect: ${s.accounts.join(", ")}`);
  if (s.urls.length) rows.push(`Website or link used: ${s.urls.join(", ")}`);
  if (s.handles.length) rows.push(`Social media handle: ${s.handles.join(", ")}`);
  return rows.length ? rows.join("\n") : "No suspect identifiers are available at this stage.";
}

function narrative(c: CaseFile): string {
  return (c.triage?.englishNarrative || c.rawStatement || "").trim();
}

function incidentAt(c: CaseFile): string | undefined {
  return c.incidentAt || c.triage?.incidentAt;
}

/** Describe the recorded money movement without converting deception into an
 * unauthorised debit, or an unknown transaction into a proved one.
 */
function paymentFact(c: CaseFile): string {
  const amount = inr(c.amount);
  const initiation = c.legal?.rbi?.input.initiation;
  if (initiation === "victim") {
    return `I initiated or approved a payment of ${amount} in the circumstances described above.`;
  }
  if (initiation === "not-victim") {
    return `I did not initiate or approve the disputed transaction of ${amount}.`;
  }
  return `The case concerns a payment or debit recorded as ${amount}. [Before using this draft, state whether you initiated or approved it.]`;
}

function verifiedCyberReportStatement(c: CaseFile): string {
  const reportLabels = {
    ncrp: "the National Cyber Crime Reporting Portal",
    helpline: "cybercrime helpline 1930",
  } as const;
  const reports = c.tracks
    .filter(
      (track): track is typeof track & { id: keyof typeof reportLabels; doneAt: string } =>
        (track.id === "ncrp" || track.id === "helpline") && Boolean(track.doneAt),
    )
    .map(
      (track) =>
        `I reported the matter through ${reportLabels[track.id]} on ${fmtDateTime(track.doneAt)}${track.ref ? ` (reference ${track.ref})` : ""}.`,
    );

  return reports.length
    ? reports.join("\n   ")
    : "[No completed NCRP or 1930 report is recorded in this case file. Add one here only after you have actually reported it, using the date and official acknowledgement number.]";
}

/**
 * The NCRP description box rejects # $ @ ^ * ' ~ | ! and demands at least 200
 * characters. Getting bounced by that rule after twenty minutes of typing is
 * one of the most common ways people give up, so we enforce it here.
 */
export function sanitiseForNcrp(text: string): string {
  return text
    .replace(/[#$@^*'~|!]/g, " ")
    .replace(/[""'']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function padToMinimum(text: string, c: CaseFile, min = 220): string {
  let out = text;
  const financial = findCategory(c.triage?.categoryId)?.portalTrack === "financial";
  const filler = [
    c.victim.state ? `The incident is reported from ${c.victim.district ? c.victim.district + ", " : ""}${c.victim.state}.` : "",
    financial
      ? "I request that the transaction trail be examined and that any lawful preservation or fund-interdiction step available on the facts be considered."
      : "I request that the reported facts be examined and that any appropriate preservation step be considered.",
    "I can provide the supporting records I actually hold through a verified official channel.",
  ].filter(Boolean);
  let i = 0;
  while (out.length < min && i < filler.length) out += " " + filler[i++];
  return out.trim();
}

export function ruleNcrp(c: CaseFile): string {
  const cat = findCategory(c.triage?.categoryId);
  const sub = findSubcategory(c.triage?.categoryId, c.triage?.subcategoryId);
  const body = [
    `On ${fmtDateTime(incidentAt(c))}, I experienced what I understand to be ${sub?.label?.toLowerCase() || "a cybercrime"}${cat ? ` falling under ${cat.label.toLowerCase()}` : ""}.`,
    narrative(c),
    c.amount ? paymentFact(c) : "",
    c.bank.name ? `The account affected is held with ${c.bank.name}${c.bank.last4 ? ` and ends with ${c.bank.last4}` : ""}.` : "",
    refList(c) !== "not available" ? `The transaction reference numbers are ${refList(c)}.` : "",
    c.suspect.phones.length ? `The contact numbers I recorded are ${c.suspect.phones.join(" and ")}.` : "",
    c.suspect.upiIds.length ? `The payment destination shown to me includes UPI ID ${c.suspect.upiIds.join(" and ")}.` : "",
    c.suspect.accounts.length ? `The reported recipient account identifiers include ${c.suspect.accounts.join(" and ")}.` : "",
    cat?.portalTrack === "financial"
      ? "I request that this complaint be recorded, the transaction trail examined and any lawful step available to prevent onward movement considered. I understand that a hold or refund is not guaranteed."
      : "I request that this complaint be recorded and the facts and available digital records examined.",
  ]
    .filter(Boolean)
    .join(" ");

  return padToMinimum(sanitiseForNcrp(body), c);
}

export function ruleScript(c: CaseFile): string {
  return `WHAT TO SAY WHEN 1930 ANSWERS
Use this only for a cyber-financial-fraud report. Speak slowly, give only facts you have checked, and follow the official operator's instructions.

1. WHO YOU ARE
   "My name is ${c.victim.name || "[your name]"}. My registered mobile number is ${c.victim.phone || "[your mobile]"}. I am calling to report suspected cyber financial fraud."

2. WHAT HAPPENED
   "The incident was on ${fmtDateTime(incidentAt(c))}. ${paymentFact(c)} The affected bank is ${c.bank.name || "[bank]"}${c.bank.last4 ? `, account ending ${c.bank.last4}` : ""}."

3. THE NUMBERS THEY NEED
   Transaction reference / UTR: ${refList(c)}
   ${c.suspect.upiIds.length ? `Reported payment-destination UPI ID: ${c.suspect.upiIds.join(", ")}` : ""}
   ${c.suspect.accounts.length ? `Reported recipient account: ${c.suspect.accounts.join(", ")}` : ""}
   ${c.suspect.phones.length ? `Contact number recorded: ${c.suspect.phones.join(", ")}` : ""}

4. WHAT TO ASK FOR, IN THESE WORDS
   "Please record this report, alert the participating institutions through the applicable process, and give me the official acknowledgement number. I understand that a hold or refund is not guaranteed."

5. WRITE DOWN BEFORE YOU HANG UP
   Acknowledgement number: ______________________
   Name of the person you spoke to: ______________________
   Time of call: ______________________

SAFETY
Never disclose an OTP, card PIN, CVV or banking password, and do not install a remote-access app. If a call asks for one, end it and dial 1930 yourself rather than using a number supplied in a message.`.replace(/\n\s+\n/g, "\n\n");
}

export function ruleBankLetter(c: CaseFile): string {
  const today = fmtDate(new Date().toISOString());
  return `To,
The Branch Manager
${c.bank.name || "[Name of your bank]"}
[Branch address]

Copy to: The Nodal Officer / Principal Nodal Officer, ${c.bank.name || "[bank]"}

Date: ${today}

Subject: Report of disputed electronic banking transaction and request for investigation
         under the Reserve Bank of India customer-protection circular

Sir / Madam,

1. I, ${c.victim.name || "[your full name]"}, hold a savings account with your branch${c.bank.last4 ? ` bearing the last four digits ${c.bank.last4}` : ""}. My registered mobile number is ${c.victim.phone || "[your mobile]"}${c.victim.email ? ` and my registered email is ${c.victim.email}` : ""}.

2. I dispute a transaction recorded as ${inr(c.amount)} on ${fmtDateTime(incidentAt(c))}.
   [Before sending: state whether you personally initiated or approved this transaction. Do not describe a payment you approved under deception as unauthorised without explaining those facts.]

3. The circumstances are as follows:
   ${narrative(c) || "[describe what happened]"}

4. The particulars of the disputed transaction are:
   Amount: ${inr(c.amount)}
   Date and time: ${fmtDateTime(incidentAt(c))}
   Transaction reference / UTR: ${refList(c)}
${c.suspect.accounts.length ? `   Beneficiary account: ${c.suspect.accounts.join(", ")}\n` : ""}${c.suspect.upiIds.length ? `   Beneficiary UPI ID: ${c.suspect.upiIds.join(", ")}\n` : ""}
5. I request a fact-based liability assessment under RBI/2017-18/15. This draft does not establish whether I initiated or approved the transaction, whether any payment credential was shared, whether there was bank-side fraud, negligence or deficiency, or the applicable working-day reporting window. Please investigate those facts and provide a reasoned written determination under paragraphs 6 and 7 of the circular. Paragraph 12 places the burden of proving customer liability on the bank.

6. I accordingly request the bank to:
   a. record this letter as my report of the disputed transaction and issue a written acknowledgement bearing a complaint number and date;
   b. secure the affected account and stop any further unauthorised transactions;
   c. raise a freeze or lien request with the beneficiary bank, where legally and operationally available;
   d. preserve and investigate the authentication records, transaction trail and beneficiary details, and share what may lawfully be disclosed;
   e. if the investigation finds that the circular's unauthorised-transaction protection applies, provide the shadow reversal and final resolution required by paragraphs 9 and 10, subject to the liability route established from the facts.

7. Other cybercrime reports recorded in this case:
   ${verifiedCyberReportStatement(c)}

8. If the bank rejects this complaint, or does not reply within the period required for an RBI Ombudsman complaint, I may seek review through the Reserve Bank's Complaint Management System.

Enclosures (attach only what is actually available): bank statement showing the disputed entry; relevant communications or screenshots; bank complaint acknowledgement; and any official cybercrime-report acknowledgement.

Yours faithfully,

${c.victim.name || "[your full name]"}
${c.victim.address || "[your address]"}
Mobile: ${c.victim.phone || "[your mobile]"}
${c.victim.email ? `Email: ${c.victim.email}` : ""}

ACKNOWLEDGEMENT (to be filled and returned by the bank)
Received on ______________ by ______________________ (name and designation)
Complaint number: ______________________     Branch seal:`;
}

export function ruleFir(c: CaseFile): string {
  const cat = findCategory(c.triage?.categoryId);
  const financial = cat?.portalTrack === "financial";
  const incident = incidentAt(c);
  const incidentTime = incident ? new Date(incident).getTime() : Number.NaN;
  const newCodesFrom = Date.parse("2024-07-01T00:00:00+05:30");
  const lawNote = !Number.isFinite(incidentTime)
    ? "The exact incident date is not confirmed. Please determine the applicable substantive and procedural law from the verified date and facts; this draft does not assign offence sections."
    : incidentTime < newCodesFrom
      ? "The recorded incident predates 1 July 2024. Please determine the applicable pre-commencement substantive law and the correct transitional/procedural position; this draft does not retroactively assign BNS or BNSS sections."
      : "For an incident recorded on or after 1 July 2024, the Bharatiya Nyaya Sanhita and Bharatiya Nagarik Suraksha Sanhita may be relevant alongside the Information Technology Act. Please select provisions only from the proved facts. If those facts disclose a cognizable offence, BNSS section 173 contains the current information-recording route, including jurisdiction-neutral receipt.";

  return `To,
The Station House Officer
${c.victim.district ? `${c.victim.district} ` : ""}Police Station / Cyber Crime Police Station
${c.victim.district ? `${c.victim.district}, ` : ""}${c.victim.state || "[State]"}

Date: ${fmtDate(new Date().toISOString())}

Subject: Information concerning suspected cybercrime and request for action under
         the law applicable to the verified facts and incident date

Sir / Madam,

I, ${c.victim.name || "[your full name]"}, aged ___ years, resident of ${c.victim.address || "[your address]"}, respectfully submit as follows.

1. I report an incident on ${fmtDateTime(incident)} that I understand to concern ${findSubcategory(c.triage?.categoryId, c.triage?.subcategoryId)?.label?.toLowerCase() || "suspected cybercrime"}.

2. The facts are these:
   ${narrative(c) || "[describe what happened, in order]"}

${financial ? `3. ${paymentFact(c)} The affected bank recorded in this draft is ${c.bank.name || "[bank]"}${c.bank.last4 ? `, account ending ${c.bank.last4}` : ""}. The transaction references available to me are ${refList(c)}.\n` : "3. I experienced the harm described above.\n"}
4. The particulars of the suspect available to me are:
${suspectLines(c)
  .split("\n")
  .map((l) => "   " + l)
  .join("\n")}

5. Other cybercrime reports recorded in this case:
   ${verifiedCyberReportStatement(c)}
   I understand that an NCRP acknowledgement, if any, is not itself an FIR.

6. ${lawNote}

7. I therefore request that the receiving police authority:
   a. give me an official receipt and record this information under the procedure applicable to the verified facts;
   b. if the information discloses a cognizable offence and the law requires an FIR, register it and provide the free copy required by the applicable procedure;
   c. preserve and investigate relevant records and consider any lawful transaction-tracing or asset-preservation step that applies, without treating a hold as a refund;
   d. if an officer is assigned, tell me the official designation or contact that may be shared.

I undertake to produce all documents and to render every assistance in the investigation. The facts stated above are true to the best of my knowledge and belief.

Enclosures (attach only what is actually available and safe to share):
   1. Any official NCRP or 1930 acknowledgement
   2. Bank statement showing the disputed entries
   3. Relevant screenshots or communications
   4. Identity proof, if the receiving authority requires it
${c.files.length ? c.files.map((f, i) => `   ${i + 5}. ${f.name}`).join("\n") : ""}

Yours faithfully,

(${c.victim.name || "[your full name]"})
Mobile: ${c.victim.phone || "[your mobile]"}
${c.victim.email ? `Email: ${c.victim.email}` : ""}

FOR OFFICE USE
Received on ______________ at ______________ hrs
Received by ______________________  Diary / FIR number ______________________`;
}

export function ruleChakshu(c: CaseFile): string {
  const ncrp = c.tracks.find((track) => track.id === "ncrp" && track.doneAt);
  const ncrpStatement = ncrp
    ? ` I also filed an NCRP complaint${ncrp.ref ? ` under acknowledgement ${ncrp.ref}` : ""}.`
    : "";
  return `CHAKSHU REPORT — sancharsaathi.gov.in

Chakshu is run by the Department of Telecommunications and is separate from the
police complaint. A report supplies a lead for verification and possible action;
it does not guarantee disconnection and does not replace a bank, 1930, NCRP or
police report where those routes apply.

Category to select: ${findCategory(c.triage?.categoryId)?.portalTrack === "financial" ? "Fraud in the name of KYC / bank / payment" : "Impersonation or other suspected fraud communication"}

Medium: ${c.entities.apps.includes("whatsapp") ? "WhatsApp" : c.suspect.phones.length ? "Call or SMS" : "Select what applies"}

Number to report: ${c.suspect.phones.join(", ") || "[the number that contacted you]"}

Date and time received: ${fmtDateTime(incidentAt(c))}

What to write in the description box:
${sanitiseForNcrp(
  `I received a suspected fraudulent communication from the above number on ${fmtDateTime(incidentAt(c))}. ${narrative(c)} ${c.amount ? `The case records ${inr(c.amount)} connected to the reported incident.` : ""}${ncrpStatement}`,
)}

Attach: a screenshot of the call log or the message.`;
}

export function ruleMrm(c: CaseFile): string {
  const officer = c.victim.district ? `${c.victim.district} Cyber Police Station` : "[your police station]";
  return `MONEY RESTORATION PREPARATION — official portal: mrm-ncrp.mha.gov.in

A complaint acknowledgement, a fund hold, a recoverable balance, an order and a
completed credit are different states. Continue only after an official bank,
1930/NCRP update or investigating officer confirms that funds are actually held
and that this case can use the restoration route.

VERIFY AGAINST THE CURRENT OFFICIAL PORTAL
   NCRP acknowledgement number   [copy from the official acknowledgement]
   Confirmed amount held          [do not copy the total loss unless confirmed]
   Hold confirmation source/date  [bank / police / portal and date]
   Mobile for verification        ${c.victim.phone || "[your registered mobile]"}
   Destination bank              ${c.bank.name || "[bank]"}${c.bank.last4 ? `, ending ${c.bank.last4}` : ""}
   Other fields/documents         [follow only the current official portal]

Never send PAN, OTP, full account credentials or identity documents through an
unverified link or to a caller. Record any official restoration reference here:
____________________

NEXT OFFICIAL CONTACT
Ask ${officer} which police, bank or court step applies to this case. Do not
assume a monetary threshold, an FIR waiver, an order or a payment timeline from
this preparation sheet.

NOTE FOR THE INVESTIGATING OFFICER
(print this, sign it, and hand it in with your FIR papers)

   Sir / Madam,

   I, ${c.victim.name || "[your full name]"}, mobile ${c.victim.phone || "[your mobile]"}, am the complainant in the
   above matter. ${paymentFact(c)} The recorded incident time is ${fmtDateTime(incidentAt(c))}${refList(c) !== "not available" ? ` and the available transaction reference is ${refList(c)}` : ""}.

   [State the official source, date and exact amount—if any—that was confirmed
   as held. Do not use the total loss as the held amount.] ${c.suspect.accounts.length ? `The available beneficiary identifiers include ${c.suspect.accounts.join(", ")}.` : ""}

   I respectfully request written guidance on the restoration process and any
   police, bank or court requirement applicable to the confirmed held amount.
   I will provide an undertaking or comply with an order only after reading the
   official requirement that applies to my case.

   ${c.victim.name || "[your full name]"}
   ${c.victim.address || "[your address]"}
   Date: ${fmtDate(new Date().toISOString())}

This is an unfiled preparation sheet. Nothing here proves that money is held or
recoverable, and nothing here guarantees a refund.`;
}

export function ruleOmbudsman(c: CaseFile): string {
  return `COMPLAINT TO THE RESERVE BANK OF INDIA OMBUDSMAN
Filed online at cms.rbi.org.in under the Reserve Bank – Integrated Ombudsman Scheme, 2026

Before filing, confirm that you first complained to the covered regulated entity.
You may file if its reply or resolution is unsatisfactory, or if it has not replied
within thirty days or a verified longer RBI, NPCI or card-network response period,
whichever is higher. The ordinary final limit is ninety days after the later of
that response period expiring or the regulated entity's last communication.
Do not rely on the old one-year rule for a complaint under the 2026 Scheme, and
do not file this draft until the applicable precondition is actually met.

Complainant: ${c.victim.name || "[your full name]"}
Address: ${c.victim.address || "[your address]"}
Mobile: ${c.victim.phone || "[your mobile]"}${c.victim.email ? `\nEmail: ${c.victim.email}` : ""}

Bank complained against: ${c.bank.name || "[bank]"}
Account: ${c.bank.last4 ? `ending ${c.bank.last4}` : "[account]"}
Complaint made to the bank on: ${c.bank.notifiedAt ? fmtDate(c.bank.notifiedAt) : "[date]"}
Bank's complaint reference: ${c.bank.ackRef || "[acknowledgement number]"}

Nature of complaint: Request for review of the bank's handling of a disputed
electronic banking transaction and its liability determination under the Reserve
Bank of India customer-protection circular.

Facts:
1. I dispute a transaction recorded as ${inr(c.amount)} on ${fmtDateTime(incidentAt(c))}.
   [State whether you initiated or approved the transaction, whether any credential was shared, and what the bank says happened.]
2. ${c.bank.notifiedAt ? `I notified the bank on ${fmtDate(c.bank.notifiedAt)}${c.bank.ackRef ? ` and received acknowledgement ${c.bank.ackRef}` : ". [Add the acknowledgement number if one was issued.]"}` : "[State the date and method of your complaint to the bank. A bank complaint is required before approaching the Ombudsman.]"}
3. RBI/2017-18/15 provides different liability outcomes for bank fault, customer negligence and qualifying third-party breaches. I request review of the bank's reasoned application of those rules to the evidence; this draft does not presume zero liability.
4. [Describe the bank's reply or resolution and why it is unsatisfactory. If there was no reply, state the complaint date and confirm that the applicable thirty-day-or-longer response period has elapsed. Add the bank's last communication date and verify the separate ninety-day filing limit. Do not claim delay or rejection unless true.]
5. Other cybercrime reports recorded in this case:
   ${verifiedCyberReportStatement(c)}

Relief sought:
   a. A direction requiring the bank to investigate the disputed transaction and issue a reasoned liability determination supported by its authentication records;
   b. If the evidence establishes protection under RBI/2017-18/15, the applicable shadow credit, reversal or limited-liability treatment;
   c. Any compensation or other relief the Ombudsman finds due on the established facts.

Documents to upload (only if actually available):
   1. The letter sent to the bank and its acknowledgement
   2. Bank statement showing the disputed debit
   3. Any official NCRP or 1930 acknowledgement
   4. Any reply received from the bank`;
}

export function ruleDocs(c: CaseFile) {
  return pickApplicableDocuments(c, {
    ncrp: ruleNcrp(c),
    script: ruleScript(c),
    bank: ruleBankLetter(c),
    fir: ruleFir(c),
    chakshu: ruleChakshu(c),
    mrm: ruleMrm(c),
    ombudsman: ruleOmbudsman(c),
  });
}
