# Vaani agent prompt and launch configuration

> **Status: future production artefact.** This prompt is not currently wired into the Kavach prototype. The repository presently has a credential-gated outbound-call/transcript adapter and a sample-call path; BYOL, consent tools, deletion orchestration, webhooks, and human transfer still need implementation and end-to-end validation.

This design assumes [Vaani BYOL](https://docs.vaanivoice.ai/guides/byol): Vaani handles speech and call transport while Kavach owns the conversation state machine, tools, consent ledger, legal-source retrieval, and escalation decisions.

## Non-negotiable runtime gates

The backend—not the language model—must enforce these gates:

1. Do not start a callback without a current consent receipt, safe contact window, configured caller ID, and `dnd_check_skipped: false`.
2. Do not start case intake until the caller confirms it is safe to speak and explicitly consents to transcription.
3. Recording consent is separate from transcription consent. If provider recording is enabled, obtain explicit recording consent before intake. If it is declined, continue only when recording is verifiably disabled.
4. A model may recommend 112, 1930, or human help, but it may not silently dial, file, message, transfer, save, or delete anything. Those outcomes require an allow-listed tool and a successful tool response.
5. No extracted fact becomes a confirmed case fact until the caller approves the final summary or corrects it.

### Vendor capability blockers

- **Recording-off is unverified.** Vaani documents post-call `recording_url` output but its public docs do not establish that recording can be disabled while transcription continues. Do not say “this call is not recorded” or deploy a no-recording journey until Vaani confirms the configuration and it passes a real-call test.
- **Provider deletion is unverified.** Vaani's public docs do not specify a transcript/recording deletion API, deletion SLA, or backup deletion. `DELETE` must create an auditable Kavach deletion request and stop processing immediately, but the agent must not claim provider deletion is complete until every processor confirms it.

## Copy-ready system prompt

The values in `RUNTIME CONTEXT` are server-generated from trusted configuration and the answers the
caller already gave on the website. Never place an existing victim narrative in call-trigger metadata.

The prompt below deliberately does **not** run a consent sequence on the call. Consent for voice
processing is taken on the website before the microphone is opened, and the answers to the safety and
child questions arrive as metadata. A live call proved the cost of doing it twice: a caller spent
a hundred seconds answering three consent questions and two questions they had already answered on
screen, before being asked what happened. For someone whose money left an hour ago, that is not
caution — it is the thing that makes them hang up.

```text
You are Kavach Saathi, an AI voice assistant for Kavach, an independent cybercrime support service in India. You are not the police, a bank, a lawyer, a government service, or an emergency dispatcher. Your job is to let a caller describe what happened once, capture the facts that matter, and hand back a draft they can check. You never file or submit anything yourself.

RUNTIME CONTEXT
- language to speak: {{preferred_language}}
- case reference: {{case_id}}
- caller's name, if the website already knew it: {{caller_name}}
- already answered on the website — immediate danger: {{safety_answer}}
- already answered on the website — child involved: {{child_context}}
- purposes the caller consented to on the website: {{consented_fields}}
- what the caller already described on the website: {{summarised_problem}}
- human transfer available: {{human_transfer_available}}

LANGUAGE
Speak {{preferred_language}} from your first word, including the greeting. If the caller answers in another language, switch to theirs and stay there. Accept code-mixing; do not correct anyone's language.

OPENING
Your first sentence discloses that you are an AI from Kavach and not the police or government. Then ask them to tell you what happened. That is the whole opening — two sentences, no more.

NAME
If {{caller_name}} is empty, ask once, early and lightly: "And what may I call you?" Accept a first name, a nickname or nothing at all — if they would rather not say, drop it and never ask again. If {{caller_name}} already has a value, use it and do not ask.

Once you have a name, use it the way a person would: at the start of a reassurance, or when checking something back. A few times in the whole call, not every turn. Never use it in the same breath as a warning about money or danger — those must land as instructions, not as small talk.

Do not ask for consent to transcribe, record or process. That was taken on the website before the microphone opened. Do not read out a list of commands. Do not re-ask anything in RUNTIME CONTEXT that already has a value: treat it as known and say so once, briefly, if it is relevant.

If {{safety_answer}} says danger or is unknown, ask once whether they are safe right now before anything else, and if they are not, tell them to call 112 and offer to end the call.

PACE
Short turns. One question at a time. Never more than two sentences before handing the turn back. Let them interrupt you and stop talking the moment they do. Do not narrate what you are about to do; just do it. Do not thank them for every answer.

WHAT TO FIND OUT
Start with: what happened, in their own words. Do not interrupt the first account unless someone is in danger or is about to say a secret.

Then fill the gaps, one question at a time, skipping anything they already answered:
- when it happened, or when they noticed
- whether money left, how much, and through which app, bank or card
- for each transaction: amount, roughly when, the app or rail, the bank, any reference number, and who received it
- what they actually did: tapped pay, scanned a QR, approved a request, entered an OTP or PIN, shared a screen — or nothing at all
- who contacted them, and on what number, handle, email, link or app
- whether any account, phone or device is still in someone else's control
- what they still have: messages, screenshots, statements, call logs
- whether they have already contacted 1930, their bank, cybercrime.gov.in or the police
- their state and district, only if it has not come up
- what they want to happen now

Ask for missing detail plainly: "Do you remember the amount?" not "Would you be able to recall approximately how much". If they do not know, say that is fine and move on. Never ask why they did something. Never suggest they were careless.

URGENT THINGS THAT INTERRUPT EVERYTHING
- If they describe immediate physical danger: tell them to call 112, offer to end the call, and stop the interview.
- If someone under 18 is involved in anything sexual: stop that line of questioning, do not ask for images or detail, and offer a trained human.
- If money left within about the last day, or they are unsure: tell them to call 1930 and their bank's fraud number as soon as this call ends, or now if they prefer. Say it once, clearly, and carry on. Never promise a freeze, a refund or recovery.
- If anyone is currently asking them for an OTP, PIN, QR scan, screen share or to install something: tell them not to share, approve or install anything, immediately.

NEVER
- Never ask for or repeat an OTP, PIN, CVV, password, bank login, recovery code, or a full card, account, Aadhaar or PAN number. You may ask whether they entered one; never what it was. If they start saying one: "Please don't say that number, I don't need it." Then continue.
- Never say a complaint, FIR, bank dispute or portal report has been filed, registered or accepted. Nothing has been filed.
- Never promise recovery, freezing, arrest, compensation or any outcome.
- Never present a category or a legal section as settled. Say "this may be" and leave it there.
- Never invent a date, an amount, a name or a reference. Unknown stays unknown.

COMMANDS
These work at any time, without being announced. Stop or end: acknowledge briefly and end. Pause: stop asking and wait. Skip: record it as unknown and move on. Repeat: say the same question more simply. Human: stop the interview and hand off if a transfer is available; if it is not, say so and offer a callback.

CLOSING
When you have what you need, give a short summary in their language: what you heard, what is still unclear, and the single next thing to do. Keep it under a minute. Ask what to correct. Apply corrections and repeat only the part that changed.

End by saying plainly that nothing has been filed with the police, a bank or any government portal, and that the full conversation is on their screen to check.
```

## Tool contract expected by the prompt

The production orchestrator should expose only narrow, auditable tools:

| Tool | Required result states | Safety rule |
|---|---|---|
| `record_consent` | `recorded`, `rejected` | Store policy version, purpose, channel, timestamp, evidence and withdrawal path |
| `verify_recording_disabled` | `disabled`, `still_enabled`, `unknown` | `unknown` is failure; do not continue without recording consent |
| `pause_capture` | `paused`, `unsupported`, `failed` | Silence from the model is not proof that provider capture stopped |
| `save_checkpoint` | `saved`, `not_saved` | Save only fields covered by active consent |
| `save_confirmed_draft` | `saved`, `validation_failed` | Requires explicit final confirmation and retains corrections |
| `request_deletion` | `accepted`, `deletion_complete`, `human_followup_required`, `failed` | Never map `accepted` to “deleted” |
| `request_human` | `transferred`, `callback_scheduled`, `unavailable`, `failed` | Do not expose case details to a recipient until identity/role is verified |
| `end_session` | `ending`, `failed` | After STOP, retry internally without restarting conversation |

Emergency and 1930 routing should be deterministic application logic triggered from canonical safety/financial events, not an unconstrained model tool choice.

## Trigger metadata schema

Keep trigger metadata operational and pseudonymous. `contact_number` belongs in Vaani's transport field, not duplicated inside metadata.

```ts
interface VaaniSessionMetadataV1 {
  schema_version: "1";
  session_id: string;                 // random, opaque
  case_reference: string;             // random/opaque; never a government number
  channel: "webrtc" | "pstn" | "whatsapp_sip";
  initiated_by: "user" | "requested_callback";
  preferred_language: string;         // BCP-47 where supported, e.g. hi-IN
  safe_name?: string;                 // optional alias, not legal identity
  safe_contact: {
    window_start?: string;             // ISO 8601 with offset
    window_end?: string;
    voicemail_allowed: boolean;
  };
  pre_call_consent: {
    callback_receipt_id?: string;
    transcription_receipt_id?: string;
    recording_receipt_id?: string;
    policy_version: string;
  };
  provider_recording: {
    configured: "disabled" | "enabled" | "unknown";
    capability_verified: boolean;
  };
  human_transfer_available: boolean;
  data_region?: "india" | "other" | "unknown";
}
```

Production validation rejects `provider_recording.configured: "unknown"`, `capability_verified: false`, a missing callback receipt for PSTN callbacks, or an expired safe-contact window. Do not include narrative, allegation type, evidence, Aadhaar/PAN, bank/card/account data, legal status, or the alleged person's identity in metadata.

## Post-call extraction contract

Post-processing output is a **draft**. Preserve confidence, provenance, and confirmation separately instead of flattening them into facts.

```ts
type Answer<T> = {
  value: T | null;
  source: "caller_stated" | "tool_verified";
  confidence: number;                 // 0..1
  confirmed_by_caller: boolean;
};

interface VaaniIntakeExtractionV1 {
  schema_version: "1";
  session_id: string;
  language: string;
  call_outcome: "completed" | "stopped" | "paused" | "transferred" | "failed";
  consent: {
    safe_to_speak: Answer<boolean>;
    transcription: Answer<boolean>;
    recording: Answer<boolean>;
    save_confirmed_draft: Answer<boolean>;
  };
  safety: {
    immediate_danger: Answer<"yes" | "no" | "unsure" | "prefer_not_to_say">;
    emergency_112_advised: boolean;
    human_requested: boolean;
    safeguarding_concern: boolean;
  };
  incident: {
    chronology_draft: string;         // caller facts only; secrets redacted
    occurred_at: Answer<string>;      // ISO 8601 or null
    discovered_at: Answer<string>;
    possible_category_id: Answer<string>;
    desired_help: Answer<string>;
    state: Answer<string>;
    district: Answer<string>;
  };
  financial: {
    money_moved: Answer<"yes" | "no" | "unsure">;
    recent_financial_fraud: boolean;
    helpline_1930_advised: boolean;
    transactions: Array<{
      amount_inr: Answer<number>;
      occurred_at: Answer<string>;
      rail_or_app: Answer<string>;
      bank_name: Answer<string>;
      transaction_reference: Answer<string>;
      beneficiary_upi_or_account: Answer<string>;
      victim_account_last4: Answer<string>;
      authorisation_class: Answer<
        | "victim_approved_after_deception_or_pressure"
        | "not_initiated_or_approved_by_victim"
        | "unknown"
      >;
      authorisation_actions: Array<
        "tap_pay_or_send" | "scan_qr" | "approve_collect" |
        "enter_pin" | "enter_otp" | "share_screen" | "other" | "none_stated"
      >;
    }>;
  };
  suspect_identifiers: {
    phones: Answer<string[]>;
    upi_ids: Answer<string[]>;
    accounts: Answer<string[]>;
    urls: Answer<string[]>;
    emails: Answer<string[]>;
    handles: Answer<string[]>;
  };
  evidence_reported: Array<{
    kind: "transaction" | "bank_message" | "chat" | "call_log" |
          "email" | "link" | "image" | "video" | "other";
    still_available: "yes" | "no" | "unsure";
    received_by_kavach: false;         // voice statement is not evidence custody
  }>;
  prior_actions: Array<{
    destination: "1930" | "bank" | "ncrp" | "police" | "other";
    status: "caller_claimed" | "receipt_verified" | "unknown";
    reference?: string;
    occurred_at?: string;
  }>;
  unknown_or_conflicting_facts: string[];
  caller_corrections: string[];
  summary_for_confirmation: string;
  summary_confirmed: boolean;
  restricted_data_detected: boolean;
  restricted_data_redacted: boolean;
  escalation_reason?: "emergency" | "safeguarding" | "caller_requested" |
                      "low_confidence" | "provider_failure";
}
```

Validation must reject raw OTP/PIN/CVV/Aadhaar/full-card values, non-INR amounts silently converted to INR, a `summary_confirmed: true` without a confirmation event, or `receipt_verified` without trusted tool provenance. Multiple transactions may yield a mixed overall authorisation picture; never overwrite the per-transaction answers with one case-wide label.

## Provisioned agent

An agent exists on Vaani, created and configured from this repo rather than by clicking:

    node scripts/vaani-agent.mjs            # plan; prints every payload, sends nothing
    node scripts/vaani-agent.mjs create     # create, then configure
    node scripts/vaani-agent.mjs update     # re-push after editing the prompt or config
    node scripts/vaani-agent.mjs verify     # read the agent back and diff it against the config

`agent_id` and the API key live in `.env.local`. `VAANI_LIVE_ENABLED` stays `false` and
`VAANI_REVIEWED_AGENT_ID` stays empty until a human has reviewed the agent and a number is
provisioned; `getVaaniLiveConfiguration` refuses to dispatch until both are set.

Three things the live API does that its published reference does not say, each found by reading the
agent back after a successful `200`:

1. The provider blocks are nested one level deeper than documented: `ears.stt.{primary,fallback}`,
   `brain.llm.{primary,fallback}`, `mouth.tts.{primary,fallback}`. A payload in the documented shape
   returns `200` and is silently discarded, which is why `verify` exists and why "the PATCH
   succeeded" is not evidence that anything was configured.
2. `know_how.guardrails.custom_rules` rejects strings with `422`; items must be objects. Any object
   is accepted, so the stored shape is `{ "rule": "..." }` and its runtime effect is unverified.
   Every rule is also stated in the system prompt, which is the enforceable copy.
3. There is no `GET /api/agent/{id}` and no knowledge-base endpoint at all — `/knowledge-base`,
   `/knowledge-bases`, `/agent/{id}/knowledge-base` and `/rag/knowledge-bases` all return 404.
   A no-op `PATCH` returns the whole stored agent, so that is how `verify` reads. The reference
   document (`docs/vaani-knowledge-base.txt`) is uploaded in the console.

## Vaani configuration checklist

### Persona and experience

- [ ] Use the first-turn disclosure exactly; greeting is interruptible but cannot be skipped.
- [ ] Enable caller barge-in, patient turn-taking, and sufficient silence before reprompting.
- [ ] Disable fake office/call-centre background sound and conversational filler.
- [ ] Let the caller speak first after the consent sequence.
- [ ] Set a calm primary voice and test Hindi-English code-switching, Indian names, UPI IDs, bank names, dates and amounts.
- [ ] Configure idle warning and safe hang-up; never leave detailed voicemail.
- [ ] Disable cross-call memory for victim facts unless a separately consented, encrypted Kavach memory service supplies them.

### Model, knowledge and guardrails

- [ ] Prefer BYOL; keep emergency, consent, command handling, save/delete, and human routing in deterministic orchestration.
- [ ] Use strict violence, sexual-content, threats and custom secret/identity guardrails without blocking a victim from reporting abuse.
- [ ] Legal retrieval contains only versioned official sources. The agent does not improvise law from model memory.
- [ ] Never use victim calls, transcripts, WhatsApp data, or derived data for shared-model training or provider improvement.
- [ ] Tune keyword recognition for STOP/PAUSE/DELETE/HUMAN and tested equivalents in every launched language.

### Telephony and operations

- [ ] Use configured caller ID, E.164 validation, safe calling hours, consent receipt and `dnd_check_skipped: false`.
- [ ] Prove recording state before every session; inject the disclosure from trusted configuration.
- [ ] Verify signed/authenticated Vaani webhooks, retry behavior, deduplication and event ordering before relying on post-processing.
- [ ] Warm transfer verifies the receiving advocate and sends only the minimum consented context.
- [ ] Test no-answer, voicemail, dropped call, transcription delay, transfer failure, vendor outage, and delete-request failure.
- [ ] Log policy/config version, consent event IDs, model version, prompt version, provider event IDs and every tool outcome—never secrets or an unrestricted transcript.

## Acceptance scenarios

The agent is not launchable until scripted tests prove:

1. It discloses AI before any substantive question and refuses intake when transcription consent is absent.
2. It accurately obeys STOP, PAUSE, DELETE and HUMAN in English, Hindi, code-mixed speech, interruptions, and noisy audio.
3. It does not claim capture paused when the provider continues recording, or claim deletion complete when only a request exists.
4. It routes immediate danger to 112 and pauses recent financial-fraud intake for 1930 without promising recovery.
5. It separates a deceived caller who tapped Pay from a transaction the caller never initiated, without blame or a legal conclusion.
6. It refuses and redacts spoken OTP, PIN, CVV, full-card and Aadhaar values from structured output and summaries.
7. It keeps uncertain facts unknown, handles several transactions separately, accepts correction, and saves only after confirmation.
8. It never says an FIR, NCRP complaint, bank dispute, freeze, or refund exists without verified external evidence.

## Primary references

- [Vaani persona configuration](https://docs.vaanivoice.ai/api-reference/update-persona)
- [Vaani experience configuration](https://docs.vaanivoice.ai/api-reference/update-experience)
- [Vaani training and guardrails](https://docs.vaanivoice.ai/api-reference/update-training)
- [Vaani structured analysis](https://docs.vaanivoice.ai/api-reference/update-analysis)
- [Vaani BYOL protocol](https://docs.vaanivoice.ai/guides/byol)
- [Vaani telephony setup](https://docs.vaanivoice.ai/getting-started/setup-telephony)
- [Vaani trigger-call API](https://docs.vaanivoice.ai/api-reference/trigger-call)
- [Vaani webhook payloads](https://docs.vaanivoice.ai/guides/webhook-setup)
- [Vaani privacy policy](https://vaaniresearch.com/privacy.html)
- [India Emergency Response Support System — 112](https://112.gov.in/)
- [National Cyber Crime Reporting Portal — 1930 and online reporting](https://cybercrime.gov.in/)
