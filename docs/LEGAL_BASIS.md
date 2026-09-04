# Kavach legal basis and victim-safety requirements

> **Last verified:** 4 September 2026 (India Standard Time)
> **Status:** Product and engineering research; not a legal opinion. Before a public launch, Indian counsel should validate the service model, every external workflow, mandatory-reporting protocol, terms/privacy notices, vendor contracts, State-specific procedures, and incident-response plan.

## How to use this document

Kavach can make fragmented remedies easier to understand, but it must remain an independent support and navigation service. It is not a police station, court, bank, hospital, Internal Committee, Legal Services Authority, the National Cybercrime Reporting Portal (NCRP), or any other public authority. An AI-generated draft is not a filed complaint, an acknowledgement is not an FIR, a fund hold is not a refund, and a predicted legal section is not a legal determination.

This document distinguishes four kinds of statement:

- **Law:** an obligation or remedy stated in legislation, rules, or binding case law.
- **Official procedure:** a workflow described by a government, regulator, or statutory body. It can change without the underlying Act changing.
- **Product guardrail:** Kavach's deliberately safer rule, even where the precise legal minimum is uncertain.
- **Counsel/operations gap:** a question that needs a written decision before production use.

Official legislation, Gazette notifications, regulator material, government portals, and court-hosted judgments are preferred. Secondary summaries should not be put into the legal knowledge base as authority.

## The core product rule: track truth, not forms

Every remedy should use a state machine that distinguishes:

```text
draft created
  -> victim reviewed/authorised
  -> transmission attempted
  -> transmission confirmed by provider
  -> authority acknowledgement received
  -> official complaint/FIR/case number verified
  -> authority assigned/action recorded
  -> outcome independently confirmed
```

Never collapse these states:

| Do not say | What may actually be true |
|---|---|
| “Complaint filed” | Kavach generated a draft or copied text to the clipboard. |
| “FIR registered” | NCRP or a police email returned an acknowledgement; an FIR needs a verified FIR number and police station. |
| “Money recovered” | The financial-fraud system or a bank marked funds held/liened; restoration follows legal/banking process. |
| “Zero liability” | The bank has not yet determined whether the RBI unauthorised-transaction conditions apply. |
| “SHe-Box case opened” | Kavach prepared a workplace complaint; no official receipt has been verified. |
| “NCW/police will act” | A referral or complaint was received; outcome and timing remain with the authority. |
| “Content removed” | A platform grievance was sent; removal must be verified at the specific URL/account. |
| “Evidence is admissible” | An original/hash/certificate packet was prepared; admissibility is for the court. |

The canonical case record should separate:

- what the victim said;
- what a model or rule engine extracted;
- what the victim corrected or confirmed;
- what a trained human verified;
- what was transmitted and with whose authority;
- what an external institution acknowledged; and
- what outcome was independently confirmed.

Each legal proposition shown to a user should carry the official source, section/rule, effective-from date, any effective-to date, jurisdiction, and last-verified date. Generated citations must be rejected unless they resolve to a curated source. The Supreme Court has expressly cautioned against fake or non-existent AI-generated citations in *Pooja Ramesh Singh v. J&K Bank Ltd.*, 2026 INSC 668; this makes source verification a safety requirement, not a cosmetic feature. [Supreme Court landmark-judgment summary](https://www.sci.gov.in/hi/%E0%A4%90%E0%A4%A4%E0%A4%BF%E0%A4%B9%E0%A4%BE%E0%A4%B8%E0%A4%BF%E0%A4%95-%E0%A4%A8%E0%A4%BF%E0%A4%B0%E0%A5%8D%E0%A4%A3%E0%A4%AF-%E0%A4%B8%E0%A4%BE%E0%A4%B0%E0%A4%BE%E0%A4%82%E0%A4%B6/)

## Date-aware criminal-law routing

The Bharatiya Nyaya Sanhita, 2023 (BNS), Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS), and Bharatiya Sakshya Adhiniyam, 2023 (BSA) commenced on **1 July 2024**. The app must not simply replace every IPC, CrPC, and Indian Evidence Act reference with a new section number.

- BNS section 358 preserves liabilities, penalties, investigations, and proceedings concerning earlier acts under the repealed Indian Penal Code.
- BNSS section 531 keeps an appeal, application, trial, inquiry, or investigation pending immediately before commencement under the CrPC as if the BNSS had not commenced.
- BSA section 170 similarly saves pending applications, trials, inquiries, investigations, proceedings, and appeals under the Indian Evidence Act.

Before selecting a law version, collect the incident date or range, whether conduct continued past 1 July 2024, first complaint/FIR date, whether an investigation or proceeding was already pending, State/UT, victim age on each incident date, and route already used. When facts span the transition, show both possible regimes for qualified human review rather than choosing one silently.

Primary sources: [MHA new-criminal-laws hub](https://www.mha.gov.in/en/commoncontent/new-criminal-laws), [BNS](https://www.mha.gov.in/sites/default/files/2024-04/250883_english_01042024.pdf), [BNSS](https://www.mha.gov.in/sites/default/files/2024-04/250884_2_english_01042024.pdf), [BSA](https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf), [commencement notification](https://www.mha.gov.in/sites/default/files/BhartiyaNyayaSanhita_24022024.pdf).

## Crisis and safeguarding decision rules

The first screen or first voice turn must establish whether it is safe to continue and whether the person can safely receive calls/messages. Do not collect a long narrative before surfacing urgent help.

| Situation disclosed | Immediate product response | What Kavach must not do |
|---|---|---|
| Ongoing attack, confinement, weapon, immediate threat, serious injury, or current suicide plan/attempt | Offer **112** immediately; offer a silent/text/app/panic path where available; ask only the minimum necessary location and safe-contact information; keep a human escalation path. | Do not continue ordinary intake, demand evidence, promise dispatch, leave voicemail, or expose a detailed notification. |
| A person under 18 may be facing or may face a POCSO offence | Surface **112/1098** as appropriate; stop media upload; route to a trained human safeguarding lead for the statutory SJPU/local-police protocol. | Do not make reporting depend only on consent; do not ask the user to download, forward, or re-upload sexual images of a child. |
| Financial loss is ongoing or recent | Put the bank's verified fraud channel and **1930** before the interview; help preserve transaction identifiers; then guide to NCRP. | Do not claim 1930 guarantees a freeze or recovery; do not ask for OTP, PIN, CVV, password, full card number, or banking login. |
| Recent sexual assault, injury, pregnancy/STI concern, intoxication, or suspected drugging | Offer the nearest appropriate hospital and One Stop Centre; explain that treatment is not conditional on filing an FIR or consenting to evidence collection. | Do not prioritize a “perfect” evidence pack over treatment; do not imply delay makes care pointless. |
| Domestic violence, stalking, credible threat, or intimate-image abuse without immediate danger | Build a survivor-led safety plan; offer police/NCRP, an OSC, and **181 where operational**; offer platform grievance steps for intimate imagery. | Never notify the alleged abuser, family, employer, or emergency contact without a safe, explicit choice, except under a counsel-approved mandatory/emergency protocol. |
| Severe distress but no immediate plan or attempt | Offer Tele-MANAS at **14416 / 1800-89-14416** and a human; re-check immediacy if the answer changes. | Do not present an AI conversation as therapy or a mental-health diagnosis. |
| Historic or non-urgent matter | Continue trauma-informed intake; offer NALSA/DLSA/SLSA, NCW, SHe-Box, PWDVA, police, or cyber routes relevant to the goal. | Do not pressure the victim toward police, settlement, reconciliation, or a single remedy. |

The ERSS **112** system is the pan-India emergency route for police, fire, and health emergencies and describes dial, SMS, app, panic, and location-supported channels. [ERSS 112](https://112.gov.in/), [112 FAQ](https://112.gov.in/faq). Women Helpline **181** is linked to One Stop Centres but the current Mission Shakti FAQ reports operation in 34 States/UTs, so availability must be checked instead of described as universal. [Mission Shakti FAQ](https://www.spniwcd.wcd.gov.in/detail-mission-shakti/faqs), [One Stop Centre overview](https://spniwcd.wcd.gov.in/one-stop-centre-header/brief). Child Helpline **1098** is integrated with 112 and is described by the Union Government as operational across all 36 States/UTs. [Child Helpline](https://www.spniwcd.wcd.gov.in/child-helpline/brief). Tele-MANAS contact details are published by the Directorate General of Health Services. [National Mental Health Programme](https://dghs.mohfw.gov.in/national-mental-health-programme.php).

These numbers, coverage claims, directories, and channel capabilities are operational facts: verify them at release and at least monthly.

## Consent and safe-channel baseline

Before an AI voice call or WhatsApp conversation, use plain language to disclose that the user is interacting with AI; which company will provide telephony/messaging; whether audio is recorded; whether a transcript is generated; what is stored and for how long; who can review it; mandatory-reporting and imminent-safety limits; and how to stop, delete, or reach a human. Recording consent and transcription consent must be separate. A refusal to record must not block text assistance.

Capture granular, revocable choices for:

- beginning an AI conversation;
- recording audio;
- transcription and translation;
- model analysis;
- WhatsApp transport;
- storing the case;
- sharing with each named authority or support organisation;
- contacting a trusted person;
- emergency disclosure under a defined protocol; and
- research, quality review, or model training.

Research/training must be **off by default** and cannot be bundled into assistance. Store the exact notice version, language, affirmative action, purpose, scope, time, and withdrawal event. Re-confirm consent when a new recipient or materially new purpose is introduced.

Safe-channel preferences should include a safe name, language, safe times, whether calls are safe, expected caller ID, whether voicemail is safe, whether notification previews are safe, a neutral-message option, and a one-action exit. `STOP`, `PAUSE`, `DELETE`, `HELP`, and `HUMAN` should work in every conversational state. Do not add a victim to a WhatsApp group.

India does not have a simple universal “one-party recording” rule that is safe to encode for this service. Privacy, confidentiality, evidence, interception, sector, contract, platform, and fact-specific issues can overlap. **Product guardrail:** obtain express informed consent before recording and do not start a provider call if recording cannot be disabled when consent is withheld. Counsel must validate the production call-flow and vendor setup.

## Police reporting and criminal procedure

### Cognizable information and Zero FIR

BNSS section 173 provides the principal intake route for information about a cognizable offence:

- information may be given orally or by electronic communication, irrespective of the area where the offence was committed (commonly described as Zero FIR);
- information given electronically is taken on record when signed by the informant within three days;
- information about specified sexual offences against a woman must be recorded by a woman police officer or woman officer;
- for a survivor who is temporarily or permanently mentally or physically disabled, recording must occur at her residence or another place of her choice, with an interpreter or special educator, be videographed, and be followed by a Magistrate's statement as soon as possible; and
- the informant or victim receives a free copy of the recorded information forthwith.

If the station officer refuses to record the information, section 173 permits the substance to be sent in writing and by post to the Superintendent of Police; after that, the informant may apply to the Magistrate. The product should generate these as later steps only after recording the refusal, station, date, and proof of delivery.

For a cognizable offence punishable by three years or more but less than seven years, section 173(3) permits, with prior permission of an officer not below Deputy Superintendent of Police, either a preliminary enquiry within fourteen days to ascertain whether a prima facie case exists or an investigation where one exists. This is not a universal fourteen-day “FIR deadline,” and the UI must not label it that way.

**Product implications**

- An emailed/electronic report is not shown as a completed FIR merely because it was sent. Create a three-day follow-up for signature and require the actual FIR number/station to reach “FIR verified.”
- Preserve the original-language account and any signed version. A translated police draft is a derivative for review.
- Ask where the person feels safe to give a statement and whether an interpreter, special educator, support person, accessibility accommodation, or woman officer is needed.
- Never tell a user that the “wrong” police station prevents them from giving cognizable information. Also do not promise that the receiving station will comply without escalation.
- Provide the State/UT police's verified contact and the NCRP State/UT nodal/grievance directory where relevant; do not invent station routing.

### Investigation, updates, healthcare, compensation, and witnesses

- BNSS section 176 provides that a rape survivor's statement is to be recorded at her residence or place of choice, as far as practicable by a woman police officer, in the presence of a chosen person or social worker; audio-video recording may be used.
- BNSS section 193 provides a two-month investigation period for specified BNS sexual offences and specified POCSO offences, counted from recording of the information. It also requires police to inform the informant or victim of investigation progress within ninety days, including electronically. These are police duties, not outcome guarantees.
- BNSS section 193 also requires the completion report to state the sequence of custody for an electronic device. Kavach's evidence log should make that information exportable without claiming to replace police forensic process.
- BNSS section 396 establishes the victim-compensation scheme through State/District Legal Services Authorities. A victim or dependent may apply where the offender is untraced or unidentified and no trial takes place; the authority is to complete its enquiry within two months and can order immediate first aid, medical benefits, or other interim relief.
- BNSS section 397 requires all public or private hospitals to immediately provide free first aid or medical treatment to victims of specified BNS sexual offences, acid attack under section 124(1), and specified POCSO offences, and to inform police immediately.
- BNSS section 398 requires every State Government to prepare and notify a witness-protection scheme. The operative scheme and application route must therefore be resolved by State/UT, not assumed from a single national form.

Primary source: [BNSS, especially sections 173, 176, 193 and 396–398](https://www.mha.gov.in/sites/default/files/2024-04/250884_2_english_01042024.pdf).

### Adult autonomy and reporting boundaries

BNSS section 33 lists offences for which members of the public must give information; it is not a general mandate for an app to report every adult disclosure of sexual or domestic violence. POCSO contains a distinct and broad mandatory-reporting rule for offences involving a child. Other duties may arise from facts, court orders, provider role, or other law.

**Product guardrail:** absent imminent risk, a POCSO trigger, or another counsel-approved legal basis, do not automatically send an adult's narrative, location, or identity to police or family. Explain choices and obtain authority per recipient. Counsel must produce a written disclosure matrix before production.

## Children and POCSO

The Protection of Children from Sexual Offences Act, 2012 (POCSO) protects a person below eighteen and is gender-neutral.

### Mandatory report

Section 19 states that any person, including the child, who apprehends that a POCSO offence is likely to be committed or has knowledge that one has been committed must provide that information to the Special Juvenile Police Unit (SJPU) or local police. The report must be entered, given an entry number, recorded in simple language, and read over where supplied by a child. Police have child-care and reporting duties, including reporting specified matters to the Child Welfare Committee and Special Court within twenty-four hours. Section 21 provides punishment for failure to report or record, while a child is not punished for failing to report.

Whether and when a platform, model provider, employee, volunteer, or contractor has acquired legally sufficient knowledge is fact-sensitive; the service must not improvise this decision during an incident.

**Required production controls**

1. Ask whether anyone concerned is under eighteen early, before detailed sexual-content intake.
2. Show a short notice that a child-related disclosure may have to be reported and that confidentiality cannot be promised absolutely.
3. Immediately stop photo/video/audio upload where child sexual content may be involved. Ask only for a URL, account/handle, message ID, platform, date/time, or whether the material remains on the source device. Never instruct a person to download, forward, screenshot, or re-upload child sexual abuse material.
4. Route the event to an always-available, trained human safeguarding lead. Use a counsel-approved decision log and contact the SJPU/local police where the statutory threshold is met; 1098 can support the child but is not a substitute for the statutory police/SJPU report.
5. Record what was reported, to whom, when, by whom, and the entry/acknowledgement number. Explain the action to the child and safe caregiver in age-appropriate language unless doing so creates danger.
6. Restrict identity rigorously. POCSO section 23 prohibits disclosure that can identify the child, including name, address, photograph, family, school, neighbourhood, or other particulars, subject to the Act's limited exception.

Sections 24–27 contain child-friendly statement, police, and medical-examination protections: statement at the child's residence/place of choice; as far as practicable a woman police officer not below sub-inspector; no uniform during statement; no child detained in a station at night; interpreter/special educator where needed; and medical examination notwithstanding that an FIR/complaint has not been registered. A girl child's medical examination must be by a woman doctor and a trusted adult may be present.

Primary sources: [POCSO Act on India Code](https://www.indiacode.nic.in/handle/123456789/2079?samhandle=123456789%2F1362), [Child Helpline overview](https://www.spniwcd.wcd.gov.in/child-helpline/brief).

**Counsel/operations gap:** obtain a written POCSO handling protocol covering after-hours coverage, false/ambiguous age statements, historical disclosures by adults about abuse when they were children, provider/webhook exposure, minimisation, preservation demands, employee safety, and deletion/quarantine of prohibited media.

## Sexual offences, harassment, stalking, identity, and intimate imagery

Relevant BNS provisions that the legal knowledge base may present as **possible** provisions, never a model-made charge decision, include:

| Provision | Subject | Product implication |
|---|---|---|
| BNS s.63 | Rape and statutory definition of consent | Consent is an unequivocal voluntary agreement; absence of physical resistance alone does not imply consent. Do not ask questions that encode the opposite. |
| BNS ss.64–71 | Rape-related offences and penalties; s.67 concerns a wife living separately | Route to sexual-offence procedure/healthcare; use current statute and facts. Do not promise a particular charge. |
| BNS s.69 | Sexual intercourse by deceitful means or a promise to marry made without intention, where it does not amount to rape | Avoid simplistic keyword classification; intention and facts need legal/police assessment. |
| BNS ss.74–76 | Assault/criminal force to outrage modesty, sexual harassment, disrobing | Preserve the victim's words; do not rewrite ambiguity as a legal conclusion. |
| BNS s.77 | Voyeurism | Non-consensual dissemination can be covered even if capture was consented to. Intake must distinguish consent to capture from consent to share. |
| BNS s.78 | Stalking | Includes monitoring a woman's internet, email, or other electronic communication. Capture repeated events as a timeline. |
| BNS s.79 | Word, gesture, act, or intrusion upon privacy intended to insult a woman's modesty | Context matters; show as potentially relevant only. |
| BNS ss.85–86 | Cruelty by husband or relative of husband | Offer criminal and PWDVA routes separately; one is not a prerequisite for the other. |
| BNS s.124 | Voluntarily causing grievous hurt by acid, etc. | Urgent healthcare and 112 take priority; compensation routes may apply. |
| BNS s.351 | Criminal intimidation | Capture the exact threat, channel, target, immediacy, ability to act, and repeated conduct. |

The adult rape provisions remain gendered and BNS section 63 retains a marital exception for intercourse with one's own wife where the wife is not under eighteen; section 67 separately addresses a wife living separately. This limitation must never be translated into “marital sexual violence is legal” or used to deny safety, medical, PWDVA, counselling, or legal-aid options. POCSO is gender-neutral for children. Support should be inclusive even where a particular criminal provision is not.

BNS section 72 restricts printing or publishing matter that may reveal the identity of victims of offences under sections 64–71; section 73 restricts publication relating to certain court proceedings. POCSO section 23 independently protects a child's identity. In *Nipun Saxena v. Union of India*, the Supreme Court issued extensive identity-protection directions for rape and sexual-abuse victims. Consequently, analytics, screenshots, demos, support tickets, logs, URLs, notification text, exports, and model traces must use pseudonymous IDs and redact direct and inferential identifiers. [BNS](https://www.mha.gov.in/sites/default/files/2024-04/250883_english_01042024.pdf), [*Nipun Saxena* judgment](https://api.sci.gov.in/supremecourt/2012/42374/42374_2012_Judgement_11-Dec-2018.pdf).

The IT Act may also be relevant to intimate imagery: section 66E addresses violation of privacy involving images of a private area, while sections 67, 67A and 67B concern obscene, sexually explicit, and child-related material. Classification requires facts and professional review. Do not cite the struck-down/omitted section 66A. [Information Technology Act, 2000](https://www.indiacode.nic.in/bitstream/123456789/1999/1/A2000-21%20%281%29.pdf).

## Domestic violence

The Protection of Women from Domestic Violence Act, 2005 (PWDVA) defines domestic violence broadly to include physical, sexual, verbal/emotional, and economic abuse, threats, and dowry-related coercion. It provides civil-protective remedies that do not depend on first obtaining an FIR.

Key routes and remedies include:

- any person may give information in good faith to a Protection Officer (section 4);
- police officers, service providers, and Magistrates must inform the aggrieved person about available reliefs, service providers, Protection Officers, legal aid, and the ability to pursue criminal proceedings (section 5);
- shelter-home and medical-facility duties (sections 6–7);
- a section 12 application to a Magistrate by the aggrieved person, a Protection Officer, or another person on her behalf; the first hearing should ordinarily be within three days and the Magistrate should endeavour to dispose of it within sixty days from the first hearing;
- a right to reside in the shared household and protection against eviction except according to law (section 17);
- protection, residence, monetary relief, temporary custody, compensation, and interim/ex parte orders (sections 18–23);
- jurisdiction where the aggrieved person permanently or temporarily resides, carries on business or is employed, where the respondent resides, or where the cause arose (section 27); and
- breach of a protection order as a cognizable and non-bailable offence (sections 31–32).

**UX implications**

- Ask what the survivor wants now: immediate safety, confidential planning, shelter, to stay in the shared home, money/medical costs, child arrangements, no-contact protection, police action, counselling, or legal help. Do not default to “leave home” or reconciliation.
- Add a device-safety mode: neutral labels, quick exit, no detailed previews, no shared-calendar entries, safe download naming, and warnings about shared cloud/photo accounts.
- A safety plan must be victim-led. Do not contact the respondent, family, landlord, or employer or reveal a location without a safe, explicit choice.
- Store each incident and threat separately to support a chronology; economic control and technology-facilitated abuse need dedicated fields, not a single free-text “incident.”
- Explain statutory timelines as court duties/endeavours, not a promised hearing or disposal date.

Important Supreme Court authorities:

- *Hiral P. Harsora v. Kusum Narottamdas Harsora* struck the words “adult male” from the respondent definition; a respondent need not be male. [Judgment](https://api.sci.gov.in/jonew/judis/44159.pdf)
- *Satish Chander Ahuja v. Sneha Ahuja* rejected an ownership-only reading of “shared household”; it is not confined to premises owned or rented by the husband. [Judgment](https://api.sci.gov.in/supremecourt/2018/37875/37875_2018_39_1501_24602_Judgement_04-Nov-2020.pdf)
- *Prabha Tyagi v. Kamlesh Devi* confirms that a subsisting domestic relationship at the time of filing is not invariably required where the alleged domestic violence arose from a past domestic relationship. [Judgment](https://api.sci.gov.in/supremecourt/2019/45645/45645_2019_11_1502_35736_Judgement_12-May-2022.pdf)

Primary statute: [Protection of Women from Domestic Violence Act, 2005](https://www.indiacode.nic.in/bitstream/123456789/2021/5/A2005-43.pdf).

## Workplace sexual harassment (POSH)

The Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 covers an “aggrieved woman” in relation to a workplace regardless of age or employment status, and includes domestic workers. An employer with ten or more workers must constitute an Internal Committee (IC); the Local Committee (LC) handles, among other matters, workplaces with fewer than ten workers and complaints against the employer. SHe-Box is an official single-window channel that forwards complaints to the relevant IC/LC; it does not turn Kavach itself into an IC.

Key process points:

- a written complaint is ordinarily made within three months of the incident or last incident in a series;
- the IC/LC may extend by up to another three months for recorded reasons where circumstances prevented filing, and must assist a woman who cannot make the complaint in writing;
- conciliation may occur only at the aggrieved woman's request, and monetary settlement cannot be its basis;
- inquiry should be completed within ninety days, the report provided within ten days, employer/District Officer action taken within sixty days, and appeal filed within ninety days;
- interim transfer, leave, or other relief can be recommended on the aggrieved woman's written request;
- section 16 imposes confidentiality over complaint contents, identities, proceedings, recommendations, and action; and
- inability to substantiate a complaint or provide adequate proof does not by itself establish malice. Malicious intent must be established through the statutory process.

**Product implications**

- A deadline warning must say “an extension may be available” and route late complaints for help; never say the right has automatically expired.
- Ask whether the respondent is the employer and approximate workplace headcount before choosing IC or LC. Treat remote work, transport, client sites, domestic work, and work-related travel as possible workplace contexts for review.
- Never offer conciliation as the default or imply it is necessary before inquiry or police action.
- Keep the IC/LC route and criminal-police route distinct; both may be relevant.
- Drafts, evidence, status, and notification text require strict role-based access because the Act expressly protects confidentiality.
- Do not mark an allegation “false” because the model assigns low confidence or because documents are unavailable.

The Supreme Court in *Aureliano Fernandes v. State of Goa* stressed due process and directed broad implementation, training, and compliance measures. [POSH Act](https://www.indiacode.nic.in/bitstream/123456789/2104/1/A2013-14.pdf), [SHe-Box](https://shebox.wcd.gov.in/), [2026 Government SHe-Box 2.0 update](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2274004&lang=1&reg=1), [*Aureliano Fernandes* judgment](https://api.sci.gov.in/supremecourt/2012/21189/21189_2012_17_1501_44461_Judgement_12-May-2023.pdf).

## Cybercrime reporting and financial fraud

### NCRP, 1930, police, and telecom reports are different routes

The National Cybercrime Reporting Portal at `cybercrime.gov.in` accepts reports of cybercrime and routes them to the relevant State/UT law-enforcement authorities. The portal FAQ distinguishes “Report Anonymously,” which is limited to the described online child-sexual/rape-gang-rape content category, from “Report and Track,” which uses an Indian mobile number and OTP. A portal complaint is not itself proof that an FIR has been registered.

For financial cyber fraud, the official response system uses **1930** and NCRP to permit rapid reporting and possible fund-interdiction action across law enforcement and financial intermediaries. “Held,” “saved,” “lien marked,” or “put on hold” must not be displayed as money restored to the victim. Government material explains that restoration follows due legal process. The Money Restoration Portal is a separate official mechanism relevant after funds are held.

The official NCRP “Citizen Financial Cyber Fraud Reporting and Management System” instruction PDF that tells a complainant to complete portal registration within twenty-four hours after a helpline acknowledgement is expressly marked **“For Delhi Only.”** It must not be turned into a nationwide statutory deadline. The safe national product instruction is: contact the bank and 1930 immediately, then complete the NCRP workflow promptly, while showing State-specific official instructions where verified.

DoT's **Chakshu** facility on Sanchar Saathi is for suspected fraud communications such as calls, SMS, or WhatsApp messages. It is not a crime complaint, FIR, bank dispute, or substitute for 1930/NCRP after a victim has lost money. The NCRP “Report Suspect” feature is likewise a lead/reporting route, not proof of a registered criminal case.

**Product implications**

- Put bank/1930 actions before a long narrative where money may still move. Keep intake progress when the person leaves to call.
- Collect bank/provider name, victim account only in masked form, recipient account/UPI ID/merchant/phone, transaction ID/UTR, amount, date/time/timezone, channel, and screenshots or statements. Never collect OTP, PIN, CVV, password, seed phrase, remote-access code, or full authentication credential.
- Generate a short 1930 script and bank notice, but label both “not submitted” until the victim or a verified integration acts.
- Save the 1930/NCRP acknowledgement exactly as issued. It does not upgrade the case to “FIR.”
- Track each transaction independently. Later transactions may have different notice times, authorisation facts, and liability treatment.
- Link only to known official domains and teach users to type the address themselves where phishing risk is material.

Official sources: [NCRP](https://cybercrime.gov.in/Accept.aspx), [NCRP FAQ](https://www.cybercrime.gov.in/Webform/FAQ.aspx), [Delhi-only financial-fraud instructions](https://cybercrime.gov.in/uploadmedia/instructions_citizenreportingcyberfrauds.pdf), [State/UT nodal and grievance contacts](https://www.cybercrime.gov.in/Webform/Crime_NodalGrivanceList.aspx), [Report Suspect](https://cybercrime.gov.in/webform/cyber_suspect.aspx), [Sanchar Saathi/Chakshu](https://eservices.dot.gov.in/), [Money Restoration Portal](https://mrm-ncrp.mha.gov.in/restoration/), [MHA explanation of held funds and restoration](https://www.mha.gov.in/MHA1/Par2017/pdfs/par2023-pdfs/LS-12122023/131.pdf), [June 2026 I4C/1930 reform update](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2274249&lang=1&reg=3).

### Potential offence provisions

An incident may engage more than one provision. Common candidates include IT Act section 66C (identity theft), section 66D (cheating by personation using a computer resource), section 66E (violation of privacy), and sections 67–67B for the specified content offences. Under the BNS, section 318 concerns cheating and section 319 cheating by personation. These are **possible provisions for a reviewed draft**, not classifications the model can finally make. Preserve factual language and allow police/counsel to determine the sections.

The struck-down former IT Act section 66A must never be suggested. [Information Technology Act, 2000](https://www.indiacode.nic.in/bitstream/123456789/1999/1/A2000-21%20%281%29.pdf), [BNS](https://www.mha.gov.in/sites/default/files/2024-04/250883_english_01042024.pdf).

### RBI unauthorised electronic transaction rules

The RBI circular on “Customer Protection – Limiting Liability of Customers in Unauthorised Electronic Banking Transactions” does **not** create blanket zero liability for every scam or every report made within three working days.

The circular provides zero liability where:

1. contributory fraud, negligence, or deficiency is on the bank's part, regardless of when the customer reports it; or
2. the breach is a third-party breach lying neither with the bank nor customer, and the customer notifies the bank within three working days of receiving the bank's communication about the unauthorised transaction.

For a loss due to customer negligence, such as sharing payment credentials, the customer bears the loss until the unauthorised transaction is reported; loss after reporting is borne by the bank. For a qualifying third-party breach reported in four to seven working days, capped liability applies under the circular; after seven working days it follows the bank's Board-approved policy. The bank carries the burden of proving customer liability.

On notification, the bank is to give a shadow reversal/credit within ten working days without waiting for insurance settlement, value-dated to the unauthorised transaction, and resolve the complaint and determine liability within the bank policy period, not exceeding ninety days. These protections are tied to the circular's **unauthorised electronic banking transaction** framework. A victim-authorised UPI/card/bank transfer induced by deception can fall outside that framework; it still should be reported immediately, but Kavach cannot promise the circular's zero-liability or credit result.

**Mandatory changes to the deadline engine**

- Ask neutrally whether the user approved the transaction and whether any credential sharing caused or enabled the disputed loss; sharing alone is not the circular's causation finding. Also ask about device/SIM control and unknown transactions without blaming the victim.
- Start the three-working-day rule, where potentially applicable, from receipt of the bank's transaction communication—not automatically from the incident time.
- “Working days” must use the relevant bank/branch calendar, including applicable holidays; skipping only Sundays and second/fourth Saturdays is insufficient.
- Label the ten-day and ninety-day entries “RBI bank obligation may apply—eligibility not yet determined,” not promised recovery dates.
- Always advise immediate written notice through the bank's verified channel and retain its ticket/reference, message, and delivery timestamp.
- Display the bank's actual determination and reason separately from Kavach's eligibility indicators. Provide escalation, not a legal verdict.

Primary source: [RBI customer-protection circular, 6 July 2017](https://www.rbi.org.in/commonman/English/scripts/Notification.aspx?Id=2623).

### RBI Integrated Ombudsman Scheme, 2026

The **Reserve Bank – Integrated Ombudsman Scheme, 2026** replaced the 2021 scheme with effect from **1 July 2026**. Complaints received before that date, appeals from decisions under the 2021 scheme, and execution of awards under it continue under the 2021 framework. Old one-year limitation copy must therefore be removed for new complaints without silently migrating pre-July matters.

Before approaching the Ombudsman, the complainant must first complain to the regulated entity and retain proof. A complaint can then be made if the entity rejects it wholly or partly, the complainant is dissatisfied with its response, or no response is received within thirty days (or within a longer timeline prescribed by RBI, NPCI, or the relevant card network for that complaint type). Under the 2026 scheme, a complaint becomes non-maintainable if filed more than ninety days after the applicable response timeline expires or more than ninety days after the regulated entity's last communication, whichever is later. The current RBI FAQ should control the exact computation.

Complaints may be filed without fee through the RBI Complaint Management System. Police investigation of the criminal aspect does not by itself make the same service-deficiency grievance non-maintainable. Appeals are not available against every closure; where an Award is appealable, the period is ordinarily thirty days, with a possible further thirty days for sufficient cause under the scheme.

**Product implications**

- Ask for the regulated entity, complaint date, delivery proof, reply date(s), full reply, and any longer RBI/NPCI/card-network response period.
- Do not start an automatic “Ombudsman due in 30 days” countdown from the incident. Show the earliest eligible date and final filing window from the actual complaint/reply facts.
- Do not promise that filing is maintainable, accepted, settled, awarded, or appealable.
- Submit only through a verified RBI integration or user-controlled CMS session; store the RBI acknowledgement separately from the bank complaint reference.

Official sources: [RBI current Ombudsman FAQ](https://old.rbi.org.in/commonman/english/scripts/faqs.aspx?id=3407), [Integrated Ombudsman Scheme, 2026 PDF](https://rbidocs.rbi.org.in/rdocs/content/pdfs/SCHEME16012026_A.pdf), [RBI Complaint Management System](https://cms.rbi.org.in/).

## Healthcare, medico-legal care, and pregnancy

BNSS section 397 requires immediate, free first aid or treatment at public and private hospitals for victims of specified sexual offences, acid attack under BNS section 124(1), and specified POCSO offences. This is a treatment right, not a requirement to preserve evidence or first register an FIR.

The Ministry of Health and Family Welfare's medico-legal guidelines for survivors of sexual violence state, among other things, that a police requisition is not required for examination/treatment; care cannot be denied because the survivor does not consent to examination/evidence collection or does not wish to participate in police process; and informed consent must be addressed for examination, evidence samples, treatment, and police-related steps. The medical provider has its own police-intimation duties, while a competent adult survivor may decline to pursue a criminal complaint/participate and have that choice documented. The prohibited “two-finger test” has no scientific basis and violates dignity.

**Product implications**

- Keep four choices separate: treatment, forensic/medico-legal examination, sample collection, and police participation. Never render one checkbox as consent to all.
- Tell the user to seek care promptly, but do not say that bathing, changing clothes, delay, consensual prior sexual activity, or unavailable evidence makes treatment or reporting futile.
- Do not offer medical diagnosis, medication, forensic conclusions, or an evidence “score.” Provide verified facilities/hotlines and a human route.
- Never recommend preservation steps that increase danger or delay urgent care.
- If the person is intoxicated, unconscious, or cannot consent, stop ordinary conversational consent flow and route to emergency/human support.

In *State of Jharkhand v. Shailendra Kumar Rai*, the Supreme Court called the two-finger test regressive and invasive, held that prior sexual history is irrelevant to deciding rape, and directed that use of the test can amount to misconduct. [MoHFW medico-legal guidelines](https://www.mohfw.gov.in/sites/default/files/9535223249_1.pdf), [*Shailendra Kumar Rai* judgment](https://api.sci.gov.in/supremecourt/2018/36909/36909_2018_2_1501_39222_Judgement_31-Oct-2022.pdf), [2024 Supreme Court compliance order](https://api.sci.gov.in/supremecourt/2023/48388/48388_2023_11_8_55422_Order_03-Sep-2024.pdf).

### Medical termination of pregnancy

Under the Medical Termination of Pregnancy Act, 1971 as amended and the MTP Rules:

- up to twenty weeks, the statutory opinion of one registered medical practitioner is generally required;
- from twenty to twenty-four weeks, opinions of two registered medical practitioners and a Rule 3B category are required; the categories include survivors of sexual assault/rape/incest and minors;
- beyond twenty-four weeks, the substantial-fetal-abnormality route involves a Medical Board, while the Act contains a separate life-saving exception; and
- anguish from a pregnancy alleged to have been caused by rape is statutorily presumed to constitute grave injury to mental health.

For an adult pregnant person, the pregnant person's own consent is required; guardian consent is specified for a minor or “mentally ill person” as defined by the Act. Section 5A protects confidentiality. In *X v. Principal Secretary, Health and Family Welfare Department, Govt. of NCT of Delhi*, the Supreme Court rejected an artificial married/unmarried distinction under the Rules, emphasised reproductive autonomy, and held that providers must not impose extra-legal conditions.

**Product implication:** provide only general, time-sensitive orientation and an urgent route to a registered provider. Do not build an automated “eligible/not eligible” legal or clinical decision. Gestational age, health, category, provider opinion, facility capacity, and evolving orders matter. Never require a husband/partner's permission or proof beyond what law/provider legitimately requires.

Primary sources: [MTP Act](https://www.indiacode.nic.in/bitstream/123456789/1593/1/197134.pdf), [MTP Amendment Rules, 2021](https://www.mohfw.gov.in/sites/default/files/MTP%20Amendment%20Rules%202021.pdf), [MTP Amendment Rules, 2024](https://www.mohfw.gov.in/sites/default/files/MTP%20Amendment%20Rules%202024.pdf), [*X v. Principal Secretary* judgment](https://api.sci.gov.in/supremecourt/2022/21815/21815_2022_2_1501_38628_Judgement_29-Sep-2022.pdf).

## Electronic evidence and the case “flight recorder”

The BSA expressly addresses electronic and digital records. Sections 57, 61, 62 and 63 should guide exports:

- primary evidence can include electronic/digital records in the forms recognised by section 57;
- section 61 prevents denial of admissibility merely because a record is electronic/digital, but it remains subject to section 63;
- section 63 sets conditions for computer output and requires a certificate in the prescribed Schedule identifying the record, manner of production, device particulars, statutory conditions, and hash; and
- the Schedule contains Part A for the party and Part B for an expert, including a hash report and recognised algorithms such as SHA-256.

Kavach cannot declare evidence authentic or admissible and cannot sign or fabricate the expert portion. Its useful role is to preserve provenance and generate a truthful, reviewable export.

### Evidence-store requirements

1. Preserve the original upload/object immutably where lawful. Compute SHA-256 on ingestion and after export; never overwrite it with an OCR, compressed, redacted, translated, or annotated version.
2. Record source device/account as supplied, original filename, MIME type, size, creation and acquisition times with timezone, uploader, source URL/message ID, method of acquisition, hash, malware-scan state, consent/purpose, and every access/export/transfer.
3. Use append-only custody events: actor, action, object ID/hash, time, purpose, and recipient. Corrections add a new event; they do not rewrite history.
4. Mark OCR, transcript, translation, summary, redaction, enhanced audio, and AI-extracted data as **derivatives** linked to the original. Store model/tool/version, confidence, human corrections, and victim attestation separately.
5. Preserve context: a full chat export where safe, email headers, URLs, handles/account IDs, transaction statement, date/time/timezone, and surrounding messages. A cropped screenshot alone may omit provenance.
6. Encrypt content and metadata at rest and in transit; isolate identity from narrative; use short-lived access, least privilege, audited human access, and controlled deletion/legal-hold states.
7. Produce a BSA-oriented packet that can prefill truthful Part A facts and hashes, but state that a lawyer/investigator/court may require a different method, original device, or expert Part B.
8. For devices, do not tell users to alter, unlock for Kavach, root, factory-reset, or install untrusted “evidence” software. Offer a simple safety-preserving checklist and professional/police route.

An AI/Vaani interview is evidence of a later account, not direct proof that every underlying event occurred. Retain raw audio only after specific consent; link each transcript segment to timestamps; expose low-confidence words; allow correction without changing the raw record; and keep the interviewer/agent utterances out of the victim-fact field.

For intimate imagery and child sexual material, minimise possession. Never ask a user to circulate unlawful/harmful material in order to prove it exists. Prefer platform URL, handle, message ID, timestamp, device-preservation guidance, and official reporting. Any unavoidable ingestion requires a counsel-approved quarantine/access/reporting/deletion process.

*Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal* interpreted the former Evidence Act section 65B and confirmed the importance of the computer-output certificate, while recognising the distinct case where the original device itself is produced. It remains useful background, but the BSA now governs new proceedings subject to its saving clause. [BSA](https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf), [*Arjun Panditrao* judgment](https://api.sci.gov.in/supremecourt/2017/39058/39058_2017_34_1501_22897_Judgement_14-Jul-2020.pdf).

## Privacy, data protection, and vendor boundaries

Victim narratives can contain health, sexual, financial, biometric/voice, identity, child, location, and allegation data about multiple people. “Local storage” is no longer an accurate privacy description once a message, call, transcript, model request, analytics event, webhook, support ticket, or backup reaches a server or provider.

### Law in force on the verification date

The Digital Personal Data Protection Act, 2023 (DPDP Act) and final DPDP Rules, 2025 use phased commencement. As of **4 September 2026**:

- the commencement and institutional/Board-related tranche notified for 13 November 2025 is in force;
- the one-year tranche, including the Act's consent-manager provision and the corresponding Rules provision, is scheduled for **13 November 2026**; and
- the main processing duties, consent/notice provisions, rights, security and breach duties, children's provisions, and corresponding detailed Rules are scheduled for **13 May 2027**.

Consequently, the app must not tell users that all substantive DPDP rights/duties are already legally operational on 4 September 2026. It should nevertheless build to that standard now. The scheduled omission of IT Act section 43A occurs with the later DPDP tranche; until then, section 43A and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 remain material to covered body corporates.

The SPDI Rules address a published privacy policy, lawful/necessary collection, written consent for sensitive personal data, notice of collection and purpose/recipients/collector, review and correction, withdrawal, retention limitation, disclosure/transfer, a grievance officer, and documented reasonable security practices. A victim narrative will often contain categories expressly treated as sensitive under those Rules, including financial, health/medical, sexual-orientation, password, and biometric information.

Primary sources: [DPDP Act on India Code](https://www.indiacode.nic.in/indiacode/handle/123456789/22037?view_type=browse), [DPDP Act commencement notification, 13 November 2025](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf), [DPDP Rules, 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf), [MeitY Rules page including corrigendum](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025), [SPDI Rules, 2011](https://www.meity.gov.in/sites/upload_files/dit/files/RNUS_CyberLaw_15411.pdf), [Information Technology Act](https://www.indiacode.nic.in/bitstream/123456789/1999/1/A2000-21%20%281%29.pdf).

### Required privacy architecture

- **Purpose/minimisation:** collect only what the selected help route needs. A telephone number should not be the primary key exposed throughout the case. Never collect secrets such as OTP/PIN/password/CVV.
- **Layered notice and consent:** itemise voice, recording, transcription, translation, AI, WhatsApp, storage, sharing, human review, emergency limits, and research/training. Withdrawing one optional purpose must not erase evidence the person affirmatively asks to preserve or block unrelated assistance.
- **Recipient ledger:** before each transfer, show the named recipient, fields/files, purpose, legal/consent basis, and known consequence. Record the authorised payload and provider response.
- **Vendor/data map:** document Vaani, Meta/WhatsApp, AI provider, cloud, analytics, email/SMS, support, malware scanning, and backup subprocessors; hosting and support locations; retention; training/default reuse; government-request process; deletion capability; incident notification; and contract allocation. Do not claim data stays in India unless every flow supports that statement.
- **Separation:** keep identity/contact preferences in a separately encrypted vault from narrative and evidence. Use pseudonymous case IDs in analytics, logs, URLs, queues, and provider metadata.
- **Retention:** use short, purpose-specific periods. Let the user choose “assist without saving” where operationally possible. Deletion must cover active stores, provider copies where contract/API permits, search indexes, derivatives, and eventual backup expiry; explain legal holds and technical limits honestly.
- **Rights/grievance readiness:** provide accessible export, correction, deletion, consent withdrawal, grievance, and nomination flows now, with identity verification proportionate to the risk of disclosure.
- **Children:** prepare for verifiable parental-consent and child-processing restrictions, but do not expose a child to an unsafe parent; map POCSO/CWC/emergency cases with counsel before implementing DPDP child flows.
- **Security:** field-level encryption for high-risk data, managed key rotation, least privilege, just-in-time human access, strong administrator authentication, tamper-evident audit, secrets isolation, secure deletion, tested restoration, dependency scanning, and abuse monitoring that does not copy narratives into ordinary logs.

The Supreme Court in *Justice K.S. Puttaswamy (Retd.) v. Union of India* recognised privacy as a fundamental right and discussed informational and decisional privacy. Kavach should apply necessity, proportionality, and user agency even where a particular private-sector statutory clause is phased or uncertain. [*Puttaswamy* judgment](https://api.sci.gov.in/supremecourt/2012/35071/35071_2012_Judgement_24-Aug-2017.pdf).

### WhatsApp-specific product boundary

WhatsApp should be an optional familiar doorway, not the canonical evidence vault. It is suitable for coarse safety choices, language, consent, a safe callback window, opt-out, neutral reminders, and authenticated short-lived links. Detailed allegations, intimate/medical media, legal case packs, full identifiers, and the authoritative consent/custody record belong in the protected Kavach application.

Do not promise that WhatsApp is “private” merely because transport may be end-to-end encrypted in some modes; business endpoints, cloud/API infrastructure, devices, backups, notifications, providers, and human consoles can create additional access. The product notice must describe the actual deployed architecture and current provider terms. Retrieve allowed media only where necessary, scan/hash/copy it into the protected evidence store, and delete provider-hosted copies when contract/API and retention rules permit.

**Counsel/operations gap:** determine whether Kavach is a Data Fiduciary/body corporate/intermediary in each deployment, whether any provider is a Data Processor or independent fiduciary, cross-border consequences, children's processing, lawful disclosure, data-retention conflicts, sector rules, and whether any State partner changes the constitutional/public-law analysis.

## Intermediary grievances, intimate-image removal, and synthetic voice

The consolidated Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, updated on **10 February 2026**, now state for covered intermediaries:

- grievance acknowledgement within twenty-four hours and general resolution within seven days;
- specified removal complaints under rule 3(2)(a)'s first proviso within thirty-six hours;
- a complaint by an individual or someone on their behalf about content prima facie exposing the person's private area, showing nudity or a sexual act, or electronic impersonation including artificially morphed images: reasonable and practicable removal/disablement measures within **two hours** under rule 3(2)(b); and
- an appeal to the Grievance Appellate Committee within thirty days, subject to the Rules.

The two-hour period replaced the former twenty-four-hour text on 10 February 2026. Kavach can generate a platform-specific grievance with exact URLs/identifiers, proof of identity/authority where safely required, scope of material, and a transmission timestamp. It must say “platform response due under the rule if the platform and complaint are covered,” not guarantee takedown or global deletion. Preserve the complained-of URL and response without making additional copies of the harmful media.

The 2026 Rules also add duties concerning synthetically generated audio/visual information for an intermediary that offers a computer resource enabling its creation or dissemination, including prominent labels and, for audio, a prefixed audio disclosure for permitted synthetic information. The exact classification of Kavach, Vaani, Meta, and their respective functions needs counsel; a private AI support call is not automatically the same as published content. Regardless of the classification, Kavach should begin every synthetic-agent call with an audible statement such as “I am an AI assistant from Kavach,” never clone or impersonate a natural person's voice, retain call/provider provenance, and prevent the disclosure from being skipped.

Primary source: [consolidated IT Rules updated 10 February 2026](https://www.meity.gov.in/static/uploads/2026/02/550681ab908f8afb135b0ad42816a1c9.pdf).

**Counsel/operations gap:** obtain a role memo on whether Kavach hosts user content or otherwise acts as an intermediary; rule 3 grievance-officer obligations; safe-harbour conditions; preservation/removal conflicts; government/court orders; traceability exposure; synthetic-information duties; and the POCSO/IT Act boundary for prohibited material.

## Kavach's own cyber-incident obligations

CERT-In's 28 April 2022 Directions require service providers, intermediaries, data centres, body corporates, and Government organisations to report specified cyber incidents within **six hours** of noticing them or their being brought to notice, appoint a point of contact, and securely maintain ICT-system logs for 180 days within India. CERT-In's FAQ permits an initial report with information then available followed by supplementary information.

This is a security-incident clock for Kavach's own covered systems—not a six-hour deadline for a victim to report an ordinary crime. Build an on-call incident process that classifies the Annexure I categories, preserves evidence, makes timely partial notification where required, and coordinates victim notification and law enforcement. Keep necessary security logs separate from case content: do not meet a log-retention goal by copying raw voice, transcript, evidence, sexual-history, or child data into generic logs.

Primary sources: [CERT-In Directions hub](https://www.cert-in.org.in/Directions70B.jsp), [CERT-In Directions PDF](https://cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf), [CERT-In FAQ](https://www.cert-in.org.in/PDF/FAQs_on_CyberSecurityDirections_May2022.pdf).

## Support, legal aid, and non-police routes

### One Stop Centres and Women Helpline

One Stop Centres under Mission Shakti describe an integrated route for medical support, legal assistance, temporary shelter, police assistance, and psycho-social counselling for women affected by violence. The official FAQ describes temporary shelter at an OSC as ordinarily up to five days and specifies child-accompaniment conditions; longer shelter and local availability require referral and location-specific verification. Women Helpline 181 connects with emergency systems and OSCs where operational.

Kavach should use the current official OSC directory rather than cache a permanent list, present 181 with a coverage caveat, and ask which services the survivor wants. It must not share a case with an OSC merely because one is nearby.

Sources: [One Stop Centre overview](https://spniwcd.wcd.gov.in/one-stop-centre-header/brief), [OSC FAQ](https://www.spniwcd.wcd.gov.in/one-stop-centre-header/faqs), [OSC documents/directories](https://www.spniwcd.wcd.gov.in/one-stop-centre-header/documents), [Mission Shakti FAQ](https://www.spniwcd.wcd.gov.in/detail-mission-shakti/faqs).

### Legal Services Authorities

NALSA states that every woman is entitled to free legal aid irrespective of income and every child under eighteen is eligible. Applications can be made online, offline, or orally with the assistance of legal-services personnel, and no application fee is charged. The national legal-aid helpline is **15100**. Kavach should route by current location and forum to the appropriate Taluk/District/State Legal Services Authority, preserve the user's acknowledgement, and avoid implying that Kavach itself has entered a lawyer-client relationship or that its data is privileged.

Sources: [NALSA legal aid](https://nalsa.gov.in/legal-aid/), [NALSA helpline information](https://nalsa.gov.in/promoting-inclusive-legal-system/).

### National Commission for Women

The NCW online complaint system can receive eligible complaints and monitor/expedite matters within its mandate. It is not an emergency dispatcher, police station, FIR system, court, or guaranteed remedy. The product should show the current acceptance categories and exclusions from the official FAQ, distinguish an NCW complaint number from an FIR, and verify the displayed helpline number immediately before release.

Sources: [NCW complaint registration](https://ncwapps.nic.in/onlinecomplaintsv2/), [NCW complaint FAQ](https://ncwapps.nic.in/onlinecomplaintsv2/frmFAQs.aspx).

### Suicide and mental-health crisis

Mental Healthcare Act section 115 provides that a person who attempts suicide is presumed, unless proved otherwise, to have severe stress and should not be tried and punished under the provision referred to there; it also places a duty on the appropriate Government to provide care, treatment, and rehabilitation to reduce recurrence risk. Kavach must not tell a distressed person that a suicide attempt is a crime or use a law-enforcement threat to force engagement.

Use 112 for an imminent attempt/current life threat and Tele-MANAS for crisis support where no immediate dispatch need is identified. The AI must not diagnose, counsel beyond a tightly reviewed support script, or claim confidentiality beyond actual policy and emergency/mandatory limits.

Sources: [Mental Healthcare Act, 2017 on India Code](https://www.indiacode.nic.in/handle/123456789/2249?view_type=browse), [Tele-MANAS / National Mental Health Programme](https://dghs.mohfw.gov.in/national-mental-health-programme.php), [ERSS 112](https://112.gov.in/).

## Product requirements derived from the legal research

### P0 — release blockers

1. **Correct misleading financial claims.** Remove statements that 1930 is the only mechanism that can freeze money, that every NCRP report has a national twenty-four-hour filing deadline, that reporting any scam to the bank in three working days guarantees zero liability, that the bank is always obliged to carry the loss, or that RBI's ten-/ninety-day provisions guarantee recovery.
2. **Adopt the 2026 Ombudsman scheme.** Replace the old one-year limitation and incident-based clock with the regulated-entity complaint/reply/timeline facts and the current ninety-day rule.
3. **Enforce submission truth.** A generated document/reference remains `draft/mock` until a verifiable external acknowledgement is parsed and shown with issuer, channel, time, and raw receipt. NCRP acknowledgement and FIR are distinct.
4. **Put safety before narrative.** Add `safe to continue?`, immediate-danger, safe-channel, and neutral-exit controls to every entry point, including resumed WhatsApp and voice sessions.
5. **Ask age early and block child sexual media.** Implement a human-owned POCSO protocol and after-hours coverage before accepting real cases.
6. **Use granular consent.** AI identity, call provider, recording, transcription, model use, storage, WhatsApp, sharing, emergency/mandatory limits, and training each need an honest decision and a versioned receipt.
7. **Protect identity.** Remove victim/allegation data from URLs, analytics, ordinary logs, mock screenshots, crash reports, notification previews, prompt traces, and support tools. Use pseudonymous IDs.
8. **Do not provide autonomous legal or medical conclusions.** Present provisions and routes as possible; preserve unknowns; require victim verification; route high-risk/low-confidence cases to trained humans.
9. **Date- and State-enable the law engine.** Record incident range, age at incident, criminal-law transition state, location/jurisdiction, prior filings, and current proceeding stage before selecting law/procedure.
10. **Secure production data.** Browser `localStorage` is acceptable only as clearly labelled prototype behaviour. A production launch needs encrypted identity/evidence stores, access controls, custody audit, retention/deletion, vendor contracts, security monitoring, and incident response.

### P1 — the non-CRUD differentiator

Build Kavach as a consent-driven **case flight recorder and action graph**:

- one trauma-informed account in the user's language;
- an immutable source narrative/audio where consented;
- an editable fact ledger with attribution and explicit unknowns;
- events connected to people, communications, transactions, threats, evidence, injuries, locations, and institutions;
- possible remedies selected by age/date/location/facts and the user's desired outcome;
- deadlines calculated from the correct legal trigger, condition, timezone, State/bank calendar, and acknowledgement;
- source-backed, versioned legal explanations;
- evidence originals, hashes, derivatives, and custody events;
- human-reviewed drafts and recipient-specific minimum disclosure;
- verified receipts and institution responses; and
- discreet follow-up until the user stops, pauses, deletes, or closes each action.

This product can be an alternative to the experience of navigating multiple government websites. It must not call itself a replacement for government registration, investigation, adjudication, healthcare, or emergency response unless a competent authority formally authorises and technically verifies that specific integration.

### Deadline object

Every clock should store at least:

```text
label
legal_or_procedural_source
section_rule_or_official_instruction
source_url
source_version_and_last_verified
jurisdiction_and_institution
eligibility_conditions
trigger_event_and_evidence
timezone_and_calendar
computed_earliest_or_due_date
whether_statutory / regulatory / official-practice / product-urgency
whether obligation / endeavour / limitation / appeal window / advice
status_and_external_acknowledgement
human_review_state
```

The UI must explain the trigger in one sentence. If an input is missing or eligibility is disputed, display `cannot calculate safely` plus the fastest protective action, rather than a confident red timer.

### Human-review triggers

Do not let a model act autonomously where there is:

- a person under eighteen or uncertain age in a sexual-harm context;
- imminent physical danger, confinement, weapon, serious injury, or current suicide plan/attempt;
- ambiguity about safe contact, abuser device access, or emergency disclosure;
- sexual assault, intimate imagery, trafficking, disability accommodation, pregnancy, or urgent medical need;
- disputed transaction authorisation/credential sharing or high financial loss;
- an intended police/court/IC/LC/regulator submission containing model-generated legal claims;
- a request to contact an alleged perpetrator, employer, family, media, or third party;
- low-confidence transcription/translation or conflicting accounts;
- a proposed evidence deletion, legal hold, or prohibited-media event; or
- an external data request, court/government order, or security incident.

Human review is not a generic call-centre escalation. Reviewers need role-specific training, confidentiality controls, supervision, secondary-trauma support, scripts, audit, and authority limits.

## Approved disclaimer patterns

### Persistent service disclaimer

> Kavach is an independent support and navigation service. It is not a government authority, police station, court, law firm, hospital, bank, Internal Committee, or emergency service. Unless a named official integration returns a verifiable acknowledgement, Kavach has not filed your complaint or FIR. It cannot freeze or restore money, obtain an order, remove content, or guarantee an outcome.

### AI and legal-information disclaimer

> AI summaries, translations, possible legal provisions, deadlines, and drafts can be incomplete or wrong. Review every fact before using a document. The applicable law and procedure depend on the date, place, age, facts, and existing case status. A police officer, court, authority, doctor, bank, or qualified lawyer makes the relevant official or professional decision.

### Voice/WhatsApp opening

> I am an AI assistant from Kavach, not a police officer or human counsellor. This channel uses [named provider]. [Recording status] and a transcript may be processed as explained here. You can stop, switch to text, or ask for a human. If someone may see this phone or hear this call, tell me only whether it is safe to continue.

The bracketed recording statement must resolve to a true deployed state; it cannot remain generic.

### Emergency notice

> Kavach cannot dispatch help or monitor this chat continuously. If anyone is in immediate danger or needs urgent police, fire, or medical help in India, contact 112 now. If it is unsafe to speak, use an available 112 SMS/app/panic option or move to a safer device/place if you can do so safely.

### Child-safeguarding notice

> If this concerns sexual harm to someone under 18, Indian law may require information to be reported to the Special Juvenile Police Unit or local police. We cannot promise absolute confidentiality. Do not upload or forward sexual images or videos of a child. A trained human will explain the next step.

### Financial-fraud notice

> Contact your bank through its verified fraud channel and call 1930 immediately; then complete the official NCRP steps. Fast reporting may improve the chance of stopping funds, but no freeze, refund, zero liability, or recovery is guaranteed. Never share an OTP, PIN, CVV, password, or banking login with Kavach or anyone who contacts you.

### Evidence notice

> Kavach can help preserve an original, hash, context, and activity record, but cannot certify authenticity or court admissibility. Keep the source device/file where safe and lawful. Do not download, forward, or re-upload child sexual material or intimate content merely to prove it exists.

## Case-law index for the curated knowledge base

| Authority | Product-safe proposition | Do not overstate |
|---|---|---|
| [*Justice K.S. Puttaswamy (Retd.) v. Union of India* (2017)](https://api.sci.gov.in/supremecourt/2012/35071/35071_2012_Judgement_24-Aug-2017.pdf) | Privacy is a fundamental right; informational and decisional privacy matter. | It does not by itself answer every private-app processing question. |
| [*Nipun Saxena v. Union of India* (2018)](https://api.sci.gov.in/supremecourt/2012/42374/42374_2012_Judgement_11-Dec-2018.pdf) | Strong protection against identifying rape and child sexual-abuse victims. | Redacting only the name may not prevent inferential identification. |
| [*Hiral P. Harsora v. Kusum Narottamdas Harsora* (2016)](https://api.sci.gov.in/jonew/judis/44159.pdf) | PWDVA respondent definition cannot be confined to an “adult male.” | It does not guarantee relief on the facts of a particular case. |
| [*Satish Chander Ahuja v. Sneha Ahuja* (2020)](https://api.sci.gov.in/supremecourt/2018/37875/37875_2018_39_1501_24602_Judgement_04-Nov-2020.pdf) | A shared household is not confined to a home owned/rented by the husband. | Residence remedies remain fact- and order-dependent. |
| [*Prabha Tyagi v. Kamlesh Devi* (2022)](https://api.sci.gov.in/supremecourt/2019/45645/45645_2019_11_1502_35736_Judgement_12-May-2022.pdf) | Relief is not invariably barred merely because the domestic relationship no longer subsists when filing. | Past relationship alone does not prove domestic violence. |
| [*Aureliano Fernandes v. State of Goa* (2023)](https://api.sci.gov.in/supremecourt/2012/21189/21189_2012_17_1501_44461_Judgement_12-May-2023.pdf) | POSH implementation, competent committees, training, and fair procedure require real institutional compliance. | A portal or AI draft does not satisfy an employer's statutory duties. |
| [*State of Jharkhand v. Shailendra Kumar Rai* (2022)](https://api.sci.gov.in/supremecourt/2018/36909/36909_2018_2_1501_39222_Judgement_31-Oct-2022.pdf) | The two-finger test is regressive/invasive; prior sexual history is irrelevant to deciding rape. | The app should not draw medical or evidentiary conclusions itself. |
| [*X v. Principal Secretary, Health and Family Welfare, NCT Delhi* (2022)](https://api.sci.gov.in/supremecourt/2022/21815/21815_2022_2_1501_38628_Judgement_29-Sep-2022.pdf) | MTP access cannot be narrowed through an artificial married/unmarried distinction; reproductive autonomy and the pregnant person's consent matter. | Eligibility at a gestational stage remains a medical/statutory decision. |
| [*Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal* (2020)](https://api.sci.gov.in/supremecourt/2017/39058/39058_2017_34_1501_22897_Judgement_14-Jul-2020.pdf) | Electronic-output certificates and original-device distinctions matter under the former Evidence Act. | New proceedings must be assessed under the BSA and its saving clause. |
| [*Pooja Ramesh Singh v. J&K Bank Ltd.* (2026), 2026 INSC 668](https://www.sci.gov.in/hi/%E0%A4%90%E0%A4%A4%E0%A4%BF%E0%A4%B9%E0%A4%BE%E0%A4%B8%E0%A4%BF%E0%A4%95-%E0%A4%A8%E0%A4%BF%E0%A4%B0%E0%A5%8D%E0%A4%A3%E0%A4%AF-%E0%A4%B8%E0%A4%BE%E0%A4%B0%E0%A4%BE%E0%A4%82%E0%A4%B6/) | AI-generated or unverified citations can corrupt adjudication; legal authorities must be verified. | No model output becomes reliable merely because it includes a case name. |

Store a headnote written by counsel/product legal review, the full official judgment, paragraph references, later-treatment status, and last verification for each case. Never have the model invent a paragraph number or quotation. If a proposition cannot be grounded, show it as unverified and keep it out of a filed draft.

## Time-sensitive verification register

| Item | Verified state on 4 September 2026 | Recheck |
|---|---|---|
| Criminal-law codes | BNS/BNSS/BSA in force from 1 July 2024, with saving provisions | On amendment/Gazette update and before every legal-content release |
| DPDP commencement | Initial tranche in force; one-year tranche scheduled 13 Nov 2026; substantive tranche scheduled 13 May 2027 | At each scheduled date and on any MeitY notification |
| IT Rules | Consolidated official text updated 10 Feb 2026; two-hour rule 3(2)(b) period | Monthly and on MeitY notification |
| RBI Ombudsman | 2026 scheme effective 1 Jul 2026 | Monthly and on RBI circular/FAQ update |
| RBI unauthorised transactions | 6 Jul 2017 circular remains the cited baseline | On RBI payment/customer-protection update; per bank policy/calendar |
| NCRP/1930 | Portal and helpline current; June 2026 reform material current; Delhi PDF is Delhi-only | At release and monthly; State instructions separately |
| Money Restoration Portal | Official portal available | At release and before user handoff |
| 112 | National ERSS emergency route | Monthly; confirm channel support by location/device |
| 181 | Official FAQ reports operation in 34 States/UTs | Monthly and by State before display |
| 1098 | Government describes Child Helpline as operational in all 36 States/UTs and integrated with 112 | Monthly |
| Tele-MANAS | 14416 and 1800-89-14416 on DGHS page | Monthly |
| NALSA | 15100 and legal-aid channels on NALSA site | Monthly; DLSA/SLSA contacts dynamically |
| NCW | Online complaint portal/FAQ current | Monthly; verify helpline and categories before display |
| SHe-Box | SHe-Box 2.0 official portal current | Monthly; verify IC/LC routing and supported languages |
| OSCs | Current MWCD directory/FAQ | Fetch dynamically or verify monthly; do not hard-code counts |
| State Protection Officers/LCs/witness schemes | State-specific and operationally variable | Before each referral |
| Court authorities | Official PDFs cited above | Check later treatment when used in a filing or advice flow |
| WhatsApp/Vaani/provider data paths | Deployment-specific; not established by this legal memo | Every vendor/API/policy/version change |

Automate link monitoring only as an alert. A successful HTTP response does not establish that the content, law, eligibility rule, phone coverage, or form schema is unchanged. A trained reviewer must approve changes and record the source diff.

## Disputed and unresolved production questions

These are launch decisions, not backlog polish:

1. **POCSO threshold and ownership:** which entity/person receives knowledge, who is the statutory reporter, what after-hours response applies, and how provider-held content is handled.
2. **Emergency intervention:** whether Kavach ever places a call or transmits location on a user's behalf; what authority, verification, human approval, minimum disclosure, false-positive review, and no-response rule apply. No official emergency-dispatch API has been established in this research.
3. **Recording and outbound calling:** Vaani's actual recording controls, data locations, retention, DND/telecom requirements, caller identity, opt-out, human transfer, and contractual use of transcripts need written verification. Express consent is the current product baseline, not a complete legal conclusion.
4. **WhatsApp role and policy:** Meta business/API terms, opt-in and template rules, provider access, encryption boundaries, media retention/deletion, lawful requests, and India-specific deployment must be validated against the production account and current documentation.
5. **Intermediary status:** counsel must classify Kavach's hosting, messaging, AI-generation, evidence, and community functions under the IT Act/Rules; a feature change can change the answer.
6. **DPDP transition:** notices/consents/contracts should be designed for May 2027, while correctly applying IT Act section 43A/SPDI Rules now. Revisit on 13 November 2026 and 13 May 2027.
7. **Cross-border/vendor transfers:** map every provider and support access location; do not infer localisation from marketing material. Re-evaluate if Government restricts transfer to a country/territory under the DPDP framework.
8. **Professional services:** define the boundary between navigation and legal practice, medicine, mental-health counselling, social work, or emergency service; train humans and contract qualified partners where a professional act is needed.
9. **Confidentiality/privilege:** Kavach communications are not automatically lawyer-client privileged, medical records, IC proceedings, or government records. The user notice must not imply otherwise.
10. **Evidence retention versus deletion:** reconcile user deletion, legal hold, POCSO/IT Act prohibited content, police preservation requests, provider retention, and BSA custody without silent indefinite retention.
11. **State variation:** Protection Officers, Local Committees, shelters, witness protection, police portals, language support, compensation schemes, holidays, and legal-services contacts require State/UT data with freshness metadata.
12. **Authority integration:** any claim that Kavach submits to NCRP, police, NCW, SHe-Box, a bank, RBI, OSC, or court requires written authority, authentication, error/retry handling, receipt validation, audit, and a fallback the user can complete independently.
13. **Accessibility and supported decision-making:** validate flows for disability, interpreters/special educators, low literacy, shared devices, limited connectivity, and persons who cannot safely use voice. An AI translation cannot replace a required qualified interpreter.
14. **Bias and inclusion:** gendered statutory provisions must not become exclusion from support. Test routing for men, transgender/non-binary persons, people with disabilities, queer people, migrants, sex workers, domestic workers, and people without documents while stating the legal route accurately.

## Source governance

The production legal corpus should be allow-listed to official sources (`indiacode.nic.in`, `egazette.nic.in`, Ministry/Government domains, `sci.gov.in`/court sites, RBI, CERT-In, NALSA, NCW and official State/UT sources). For each ingest:

1. retain the source URL, publisher, title, document/Gazette number, publication and effective dates, retrieval date, checksum, and immutable copy where permitted;
2. segment by provision/paragraph without changing the official text;
3. attach a reviewed plain-language explanation and a separate product rule;
4. mark territorial, factual, temporal, and institutional limits;
5. run amendment, repeal, commencement, and later-treatment checks;
6. require human approval before a change affects user routing or a deadline; and
7. retain prior versions so an old incident/case can be explained under the correct law.

The safest answer when law or procedure cannot be verified is: “I cannot verify that rule from a current official source. Here is the immediate protective action and a qualified human/official route.” That is preferable to a polished but invented answer.
