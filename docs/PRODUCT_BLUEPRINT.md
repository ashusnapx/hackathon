# Kavach product blueprint

> Product and integration direction as of 4 September 2026. This document separates what the repository demonstrates today from what requires provider access, production infrastructure, policy approval, and security review.

## The eureka

Kavach should not be a prettier government form. A portal records a complaint; a victim needs to understand what happened, navigate several conditional time windows, preserve evidence, reach the right institution, and avoid repeating a distressing story at every hand-off.

The product unit is therefore not a CRUD `case` row. It is a **consented, verified event journey**:

```text
one account, in the victim's language
  -> structured facts and explicit unknowns
  -> immediate safety and money-recovery actions
  -> evidence and deadline graph
  -> human-reviewed documents and referrals
  -> neutral reminders and an auditable outcome
```

WhatsApp is the familiar front door, Vaani is the optional conversational voice, and Kavach is the system of record and decision boundary. We can replace the experience of navigating fragmented government websites; we must not impersonate government, invent an acknowledgement, or imply that a complaint has been filed when it has not.

## Current product truth

### Implemented prototype

- `/assist` runs a deterministic intake state machine covering boundaries, immediate physical safety, financial urgency, narrative, AI/rules analysis, victim confirmation, evidence inventory, and routing.
- The unfinished interview survives refresh in browser `localStorage` and can resume across the prototype's web, WhatsApp-simulation, and voice views.
- The WhatsApp view is an **end-to-end local UX preview** of the shared interview: contact header, wallpaper, bubbles, reply controls, timestamps and delivery ticks. One clear start/resume action replaces the old opt-in/window/webhook/cost dashboard, and synthetic delivery callbacks advance automatically. The full journey is shown only because this preview never contacts Meta; it is not the production WhatsApp data boundary described below.
- Beneath that simple UI, the simulator still models opt-in/opt-out, the rolling 24-hour service window, delivery ordering, replay protection, templates and date-versioned Meta fees. State survives reload and the window is re-evaluated against real time. No Meta account is connected, no webhook is received, and no message leaves the browser.
- Browser speech/text intake, deterministic fallback analysis, editable extracted facts, case creation, deadline tracks, evidence checklist, and document generation are present. If model-generated documents contradict the citizen's confirmed payment-initiation answer, the entire model bundle is rejected in favour of deterministic, answer-backed templates. This guard covers that known first-person contradiction; it is not a general legal-verification engine.
- The long-form `/report` file picker retains only file name, type and size; the citizen must reattach the original inside the case Evidence Vault. Evidence attached in that vault is stored as the original browser `Blob` in IndexedDB, paired with a SHA-256 digest and a small `localStorage` manifest. It can be downloaded or removed locally. This is useful prototype preservation, not encrypted production custody, malware scanning, notarisation, or proof that the source material is authentic.
- A server-only Vaani adapter and API routes contain a deliberately narrow live-test path. Credentials are not enough: live mode also requires `VAANI_LIVE_ENABLED=true`, an exact reviewed-agent ID match, and a non-empty exact-E.164 test-number allowlist. Dispatch requires safe-to-speak, callback, transcription, and recording consent; rejects unknown fields; bounds and validates same-origin JSON; sends no user-supplied name, narrative, or case reference; and does not bypass DND checks.
- Every call attempt requires a client request UUID. The browser stores that UUID, request state and—when issued—the opaque transcript capability in same-tab `sessionStorage`. Switching channels and mounting the voice panel again restores the same request; reloading while dispatch was in flight becomes an explicit unknown state rather than offering a fresh call. This browser guard works with process-local server idempotency records to prevent automatic duplicate dispatch after an ambiguous result. It is not a durable, cross-device or cross-replica call ledger.
- Process-local IP, destination-number, and total-daily limits provide a prototype circuit breaker. Provider call IDs and live-caption URLs are not exposed to the browser; transcript import uses a random one-hour capability bound to an HTTP-only server session cookie and a same-origin `POST`.
- Voice remains locked until the boundaries, immediate-safety, and age/child-safety gates are complete. Without Vaani credentials, the UI stages a clearly marked sample interview. Live or sample text is editable in a review area and enters the narrative only after an explicit confirmation; transcript filtering keeps victim turns rather than treating agent questions as victim testimony.
- Cases remain local to the browser. Government submission, complaint status, police routing, WhatsApp delivery, durable server storage, and generated reference numbers are not real.

The presence of a live-provider code path is not evidence of production readiness or successful vendor certification. The current prototype does not implement Vaani webhook verification, a durable consent ledger, provider-side recording controls, a queue, or a human transfer console. Its sessions, transcript capabilities, idempotency receipts, and rate/circuit-breaker counters are in one application process and disappear on restart or deployment; they do not coordinate across replicas. Forwarded-IP rate limiting also assumes a trusted proxy. These are development tripwires, not production abuse, replay, or delivery guarantees.

The four `true` safety/consent fields are server-validated request guards, not independent proof of identity or informed consent: an allowlisted tester can still forge them in a same-origin request. That is why this path is restricted to controlled test numbers. Production needs an authenticated, versioned consent receipt tied to the interview state, recipient verification, withdrawal and deletion—not another boolean in the request body.

The local Evidence Vault also has an unavoidable prototype transaction boundary: case/manifest data is in `localStorage`, while blobs are in IndexedDB, and the two cannot commit atomically. An interrupted attach or removal can therefore leave a stale manifest or orphaned blob. Full-case deletion writes the case removal first, attempts blob cleanup second, and exposes an incomplete-cleanup warning when that second step fails. Production needs transactional metadata, idempotent cleanup jobs and an auditable reconciliation process.

### Current Vaani HTTP contract

- `GET /api/vaani/status` returns only whether all live-test gates are ready; it never returns the missing secret/configuration details.
- `POST /api/vaani/dispatch` accepts same-origin `application/json` up to 2,048 bytes. Its closed schema is `contactNumber`, `language`, `requestId`, `safeToSpeak`, `callbackConsent`, `transcriptionConsent`, and `recordingConsent`. The number must already be exact E.164, the request ID must be a UUID retained for that one deliberate request, and all four consent/safety fields must be `true`.
- A successful dispatch returns `state: "requested"`—not “connected”—plus an opaque transcript capability. It sets an HTTP-only, `SameSite=Strict` session cookie. It does not return the provider call ID or live-caption URL.
- `POST /api/vaani/transcript` accepts only that opaque capability in a JSON `token` field, requires the same server session and origin, and returns either a transcript or a typed not-ready/rate-limited/auth/unavailable/invalid-provider-response error. Every response is `no-store`.
- A dispatch timeout or ambiguous provider response is recorded as unknown and returns `retryable: false`. The browser must not invent a new request ID or automatically place another call. Transcript polling may follow only a `retryable: true` response and its `Retry-After` header.
- The browser persists the request receipt in `sessionStorage`: requested calls can resume transcript import after a channel switch or same-tab reload, while an interrupted in-flight request restores as unknown and remains non-retryable. Clearing that browser session removes this client receipt; production still requires durable server-side idempotency.

### Future work

Everything below involving the WhatsApp Cloud API, native WhatsApp calling, Vaani BYOL/WebRTC, durable case storage, production-grade evidence custody, scheduled reminders, or external submission is a production design—not a claim about the running prototype.

## Victim journey

1. **Enter safely.** The victim starts on the web, sends `START` on WhatsApp, or scans a QR code. Before any case question, explain that chats and notification previews may be visible and offer `Continue here`, `Open private mode`, or `Exit`.
2. **Choose language and establish trust.** Offer Hindi, English, and more languages. State that Kavach is an independent AI-assisted service, not police, government, or an emergency dispatcher, and that a human is available.
3. **Triage safety first.** Ask `Danger now`, `Safe for now`, or `Can't say`. For immediate danger, show 112 and a human route before intake. For recent financial loss, surface 1930 immediately without discarding progress.
4. **Choose the safest channel.** Offer only coarse, low-sensitivity gates on WhatsApp, then hand narrative, identifiers, bank details and evidence to private in-app chat or consented voice. A requested safe callback or human route remains available. Switching channel must resume the same interview state.
5. **Consent in layers.** Before voice, capture whether it is safe to speak, safe name, time window, caller-ID expectation, voicemail safety, transcription consent, and separate recording consent. If recording cannot be disabled and consent is absent, do not start the call.
6. **Tell it once.** Let the victim narrate before clarification. Ask only for necessary gaps: what, when, where, involved people, injury, money, available evidence, prior reporting, and the help wanted. Never ask for an OTP, PIN, password, CVV, full card number, Aadhaar, or bank login.
7. **Verify, do not infer.** Read back the timeline, extracted identifiers, uncertainties, and intended next step. The victim edits or confirms each material fact. Missing facts remain unknown.
8. **Act.** Create the deadline/evidence graph, retrieve current law and official procedures with citations, draft the appropriate documents, and route high-risk or low-confidence cases to a trained human. No model autonomously contacts police, files a complaint, or decides emergency intervention.
9. **Follow up discreetly.** WhatsApp sends only neutral messages such as “Your requested summary is ready,” with a short-lived authenticated link. `STOP`, `PAUSE`, `DELETE`, `HELP`, and `HUMAN` work at every stage.

## Channel and data boundaries

| Boundary | Allowed | Must not be placed there |
|---|---|---|
| WhatsApp | Entry, language, coarse safety choice, consent, safe callback window, low-sensitivity quick replies, opt-out, neutral status and secure links | Full allegation, Aadhaar or financial credentials, intimate/medical material, evidence archive, legal case record, detailed notification copy, victim groups |
| Vaani | A consented voice session, minimum operational metadata, a transcript returned through a server-held provider identifier for victim review, requested human transfer | Existing case narrative or user-supplied name/case reference in trigger metadata, provider caption URLs in the browser, unnecessary identifiers, silent recording, autonomous legal/emergency decisions, training on victim or WhatsApp data |
| Kavach application | Canonical case state, consent receipts, verified facts and explicit unknowns, deadline graph, source citations, audit events | Provider API secrets in the browser; unreviewed AI output represented as fact |
| Identity vault | Phone, safe name, contact preferences and provider identifiers, separately encrypted and access-controlled | Narrative or evidence unless technically unavoidable |
| Evidence store | Original encrypted object, malware scan result, cryptographic hash, provenance and access log | Public URLs or long-lived provider download links |
| Legal knowledge index | Versioned official legislation, judgments, schemes, procedures and service directory | Raw victim conversations or evidence used as retrieval corpus |

Uploaded WhatsApp media is transport, not storage. Fetch permitted media promptly, scan and hash it, copy it to the encrypted evidence store, and delete provider-hosted uploads when the API and retention policy permit.

The running prototype demonstrates the entire conversation in a WhatsApp-like local surface so the UX can be tested without a provider. That is deliberately broader than the production boundary above: a real WhatsApp integration must stop before detailed allegations and hand off through an authenticated private route.

## Production architecture

```text
WhatsApp Cloud API ---- signed webhook ----+
                                            |--> ingress --> durable queue
Vaani WebRTC/PSTN ----- call events --------+       |          |
                                                     |          v
web/private mode ----- authenticated API ------------+   consent-aware
                                                            orchestrator
                                                               |
                +--------------------+-------------------------+------------------+
                |                    |                         |                  |
          case/event DB       identity + consent       encrypted evidence   human console
                |                    vault                     store              |
                +--------------------+-------------------------+------------------+
                                                               |
                                                    legal-source retrieval
                                                               |
                                            transactional outbox/provider adapters
```

Required mechanics:

- Verify Meta's `X-Hub-Signature-256` HMAC over the unmodified request body before parsing; use TLS and optionally mTLS.
- Normalize provider payloads into one versioned event envelope. Deduplicate by provider event/message/call ID and tolerate retries and out-of-order status events.
- Persist inbound events before acknowledging them. Use a durable queue, dead-letter queue, and transactional outbox for outbound messages.
- Keep the conversation state machine and safety rules in Kavach. Prefer [Vaani BYOL](https://docs.vaanivoice.ai/guides/byol) so Vaani supplies speech/transport while Kavach owns the prompt, tool allow-list, legal retrieval, and deterministic escalation rules.
- Separate a public-source legal index from case data. Every recommendation records source URL, title, jurisdiction, effective/version date, retrieved timestamp, and human-review state.
- Make human transfer a first-class event with requested, accepted, failed, fallback, and resolved states.
- Start with in-app Vaani WebRTC or an explicitly requested PSTN callback. Treat native WhatsApp Calling through SIP/TLS as a later proof of concept; Meta and Vaani do not document turnkey interoperability.

## Provider contract: mock and live must behave alike

```ts
type ProviderMode = "mock" | "live";

interface MessagingProvider {
  send(command: SendMessage): Promise<{ providerMessageId: string }>;
  verify(rawBody: Uint8Array, headers: Headers): Promise<boolean>;
  normalize(rawBody: unknown): CanonicalEvent[];
}

interface VoiceProvider {
  start(command: StartVoiceSession): Promise<{ callId: string; connectionUrl?: string }>;
  fetchTranscript(callId: string): Promise<Transcript | "not-ready">;
  normalize(rawEvent: unknown): CanonicalEvent[];
  transfer(callId: string, destination: string): Promise<TransferResult>;
}

interface CanonicalEvent {
  id: string;
  provider: "mock-whatsapp" | "whatsapp" | "mock-vaani" | "vaani";
  kind: string;
  occurredAt: string;
  correlationId: string;
  payloadVersion: 1;
  payload: unknown;
}
```

Configuration should make the boundary visible:

```env
WHATSAPP_PROVIDER=mock
VOICE_PROVIDER=mock
DRY_RUN=true
PRICING_EFFECTIVE_DATE=2026-09-04

# Voice remains simulated unless every fail-closed gate is satisfied.
VAANI_LIVE_ENABLED=false
VAANI_AGENT_ID=
VAANI_REVIEWED_AGENT_ID=
VAANI_ALLOWED_TEST_NUMBERS=
```

The current browser simulator exercises the core WhatsApp policy state below an intentionally simple conversation: local sent/delivered/read progression, duplicate and out-of-order protection, approved-template enforcement, a 24-hour service window, and persistent opt-out/window anchoring. Delivery and fee internals remain tested but are no longer a victim-facing dashboard. The next mock-provider layer should express those decisions as Cloud API-shaped, development-signed webhooks and add failure fixtures, buttons, lists, Flows and media. The mock Vaani provider should mirror trigger-call results and stream ringing, pickup, transcript, no-answer, transfer and post-processing fixtures. Browser microphone/speech APIs may power the demo, with typed fixtures as the reliable fallback.

Contract tests must run the same canonical-event and state-machine assertions against mock fixtures and captured, redacted sandbox payloads. A mock is successful only when switching to live providers does not change product decisions.

## Staged implementation

| Stage | Deliverable | Exit condition |
|---|---|---|
| 0 — current | Browser state-machine intake; end-to-end local WhatsApp-style UX over a tested policy engine with automatic synthetic delivery and persisted opt-out/window state; report metadata followed by Evidence Vault reattachment and local hashed blobs; payment-contradiction document fallback; staged sample voice review; explicitly enabled/reviewed/allowlisted Vaani callback path with browser-persisted request receipt; session-bound transcript adapter; and non-durable safety limits | Clearly labeled demo; automated state-machine and safety tests pass |
| 1 — provider foundation | Canonical events, provider interfaces, signed Cloud-shaped mock webhooks, failure fixtures, buttons/lists/Flows/media, and contract tests | Entire victim journey runs locally against provider-shaped events without paid calls |
| 2 — WhatsApp test WABA | Cloud API test number, webhook verification, inbound/outbound text, buttons/lists, delivery states, opt-in/out and template registry | Test phone completes a minimal, non-sensitive journey; failure injection passes |
| 3 — private Vaani | In-app WebRTC, BYOL state machine, separate transcription/recording consent, post-processing import and human fallback | Victim confirms transcript; no unconfirmed fact enters a case |
| 4 — consented callback | PSTN safe-time scheduling, DND controls, caller identity, no-answer/voicemail policy and warm transfer | Consent receipt matches every call; deletion and outage drills pass |
| 5 — WhatsApp Calling POC | Meta call permission plus SIP/TLS edge to Vaani | Codec, TLS/digest auth, lifecycle, region eligibility, pricing and fallback proven end to end |
| 6 — controlled pilot | Encrypted backend, evidence custody, advocate console, reviewed legal corpus, observability and incident response | Privacy/security/legal gates signed off and pilot metrics meet safety thresholds |

Meta creates a test WABA and test number for Cloud API development; use that only after Stage 1. Vaani's public documentation does not promise a free sandbox, so its live path remains disabled by default and restricted to explicitly reviewed, allowlisted testing.

## WhatsApp cost model for India

Meta bills messaging per delivered message, using the recipient's market and message category. The official India rate card effective 1 July 2026 lists approximately:

| Category | INR per delivered message |
|---|---:|
| Marketing | ₹0.8631 |
| Utility | ₹0.1150 |
| Authentication | ₹0.1150 |
| International authentication | ₹2.4971 |

As of 4 September 2026, service messages and qualifying utility responses inside the 24-hour customer-service window are free. Meta has published a change effective **1 October 2026**: every delivered service message becomes ₹0.115, utility messages inside the service window become chargeable, and the published service-message schedule has no volume tier or legacy 1,000-message allowance. The simulator prices each message at its own delivery timestamp so crossing the change date does not retroactively reprice earlier traffic.

For calling, user-initiated WhatsApp calls are free from Meta; business-initiated calls require permission and are billed in six-second increments. The published first India tier is approximately ₹0.3885 per minute before volume discounts.

These figures are planning inputs, not a vendor quote. Keep prices and effective dates in configuration, display the active rate-card version in the simulator, and re-check [Meta's messaging pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) and [calling pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/pricing) before every release.

## Vaani vendor checklist

No production victim data should reach Vaani until written answers and contract terms cover:

- Webhook signature scheme, retry schedule, ordering, idempotency key, IP ranges and maximum payloads. Current webhook docs do not specify these controls and use inconsistent call-duration units.
- Ability to disable recording while retaining consented transcription; retention per artefact; deletion API and deletion SLA; backup deletion.
- India-region, dedicated VPC or on-prem processing; all subprocessors and transfer locations; encryption and key ownership.
- Contractual zero-training/no-improvement use for calls, transcripts, metadata and WhatsApp Business Solution Data.
- Direct compatibility with Meta Calling SIP/TLS: certificate and digest-auth behavior, `wa.meta.vc`, routing, ICE/DTLS-SRTP, Opus/G.711, concurrency and call-event mapping.
- What the advertised ₹5/minute includes: PSTN/SIP/WebRTC, numbers, recording, post-processing, transfer, concurrency, taxes and minimum commitment; trial/sandbox terms.
- Supported language/dialect matrix and measured accuracy for Hindi-English code-switching, names, addresses and distressed/quiet speech.
- DND enforcement, consent evidence, caller ID, voicemail detection, call-hour controls and suppression lists.
- Human-transfer SLA, emergency disclaimer configuration, outage fallback, uptime/status page and support escalation.
- Data path and ownership when using Vaani's dashboard WhatsApp OAuth integration, including webhook ownership, templates, retention and deletion.

## Privacy and security release gates

Production remains blocked until all of these are true:

- A reviewed privacy notice and granular, revocable consent receipts exist for WhatsApp contact, callback, transcription, recording, storage and human disclosure.
- The Vaani/AI/vendor DPAs, subprocessor list, retention schedule, deletion proof, data-location decision and WhatsApp zero-training restriction are signed.
- Meta webhook signatures are enforced and replay-tested. Vaani has an authenticated webhook mechanism or an accepted compensating control; an unverified public callback URL is not sufficient.
- Identity and narrative are separated, encrypted in transit and at rest, protected by least-privilege RBAC/MFA, and covered by immutable access/audit logs.
- Evidence has provenance, malware scanning, hashing, encrypted storage, short-lived access, retention/deletion policy and a tested export path.
- Logs, analytics, traces and support tools redact phone numbers, narratives, tokens and provider URLs. Secrets are server-only and rotated.
- `STOP`, consent withdrawal, data access, correction and deletion work across Kavach and every processor; backup behavior is disclosed.
- Neutral notification copy, accurate non-government identity, human escalation, emergency messaging, minors/safeguarding handling and abuse/threat modelling pass UX review.
- Queue replay, duplicate delivery, provider outage, transfer failure, transcript error, accidental disclosure and breach-response drills pass before pilot.

## Primary integration sources

### Vaani

- [Product and indicative pricing](https://vaaniresearch.com/)
- [API introduction and authentication](https://docs.vaanivoice.ai/introduction)
- [Agent persona and language configuration](https://docs.vaanivoice.ai/api-reference/update-persona)
- [Telephony and BYO SIP](https://docs.vaanivoice.ai/getting-started/setup-telephony)
- [Trigger-call API](https://docs.vaanivoice.ai/api-reference/trigger-call)
- [SDK and WebRTC](https://docs.vaanivoice.ai/sdk)
- [Webhook event payloads](https://docs.vaanivoice.ai/guides/webhook-setup)
- [Structured analysis and extraction](https://docs.vaanivoice.ai/api-reference/update-analysis)
- [RAG and guardrails](https://docs.vaanivoice.ai/api-reference/update-training)
- [Bring Your Own LLM](https://docs.vaanivoice.ai/guides/byol)
- [Vaani WhatsApp integration overview](https://docs.vaanivoice.ai/guides/integrations)
- [Privacy policy](https://vaaniresearch.com/privacy.html)

### WhatsApp / Meta

- [Cloud API overview, test resources, permissions and throughput](https://developers.facebook.com/docs/whatsapp/cloud-api/overview)
- [Cloud API setup](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Message types and 24-hour customer-service window](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)
- [Interactive reply buttons](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages)
- [Interactive lists](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-list-messages)
- [WhatsApp Flows](https://developers.facebook.com/docs/whatsapp/flows)
- [Media lifecycle and limits](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media)
- [Webhook delivery behavior](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)
- [Webhook endpoint verification and `X-Hub-Signature-256`](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint)
- [Templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)
- [Opt-in requirements](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in)
- [Business Messaging Policy](https://whatsappbusiness.com/policy/)
- [Business Solution Terms, including AI-provider restrictions](https://www.whatsapp.com/legal/business-solution-terms)
- [Calling API overview](https://developers.facebook.com/docs/whatsapp/cloud-api/calling)
- [Business-call permissions](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/user-call-permissions)
- [SIP calling](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/sip)
- [Official Meta Postman collection](https://www.postman.com/meta/whatsapp-business-platform/overview/)
