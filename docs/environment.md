# Environment

Every variable the app reads, what breaks without it, and where it comes from.

For development these live in `.env.local`, which is gitignored. For a
deployment, set the same names in the host's environment — on Vercel, *Settings
→ Environment Variables → Production* — and then **redeploy**. Next.js inlines
`NEXT_PUBLIC_*` into the JavaScript bundle at build time, so a variable added
after a build does not reach the browser until the next one.

Nothing here is cosmetic and nothing here is fatal. Each block switches a
feature on, `/api/health` reports which ones are answering, and the footer's
status line shows it to anybody looking. A missing block is not an error — it is
a feature that is off, and the app says so rather than pretending.

---

## The model — health: `ai`

Without it: no triage, no transcription, no drafted documents. The interview
falls back to keyword rules, which are much blunter.

| Variable | Notes |
| --- | --- |
| `OPENAI_API_KEY` | A Google AI Studio key, despite the name. |
| `OPENAI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `OPENAI_MODEL` | e.g. `gemini-3.5-flash-lite` |
| `OPENAI_MODEL_FAST` | Optional. Used for the cheaper calls. |
| `OPENAI_MODEL_TRANSCRIBE`, `GEMINI_TRANSCRIBE_MODEL` | Optional overrides. |
| `OPENAI_TIMEOUT_MS` | Optional. |

Kavach runs on Gemini through its OpenAI-compatible endpoint. Transcription goes
to Gemini's *native* API, because the compatibility layer has no audio endpoint.

## Sign-in — health: `auth`

Without these the gate opens for everybody, `/signin` says so in as many words,
and the account avatar does not appear. **This is the pair behind "sign in and
sign up are not showing."**

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The publishable key |

These two are `NEXT_PUBLIC_` on purpose and are **not** secrets: the publishable
key is designed to sit in a browser, and what it can reach is decided by
row-level security rather than by hiding the string.

One Supabase setting matters as much as the keys: **Authentication → Sign In /
Providers → Email → Confirm email**. With it on, signing up returns a user with
no session and the form correctly says "check your inbox" — which is honest, and
not what you want in a demo.

## Case storage — health: `database`

Without these a case lives only in the browser that made it, so a case link
opens nothing on a second device.

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | Same project, server-side |
| `SUPABASE_SECRET_KEY` | Service role |

The secret key bypasses row-level security. It must never become a
`NEXT_PUBLIC_` variable — `lib/db/supabase.ts` throws if it is constructed in a
browser, which turns a mistake into a loud failure rather than a silent leak.

## The voice call — health: `voice`

Without these the microphone on `/talk` is replaced by "Load a sample voice
interview". **This is the block behind "the Vaani mic is not showing."**

| Variable | Notes |
| --- | --- |
| `VAANI_API_KEY` | Sent as `X-API-Key` |
| `VAANI_AGENT_ID` | The agent to dial |
| `VAANI_REVIEWED_AGENT_ID` | Must **equal** `VAANI_AGENT_ID` |
| `VAANI_LIVE_ENABLED` | Must be `true`, or the call stays off even with a key |
| `VAANI_RECORDING_STATE` | Drives the recording consent notice |
| `VAANI_HUMAN_TRANSFER_AVAILABLE` | Whether the agent offers a transfer |
| `VAANI_ALLOWED_TEST_NUMBERS` | Allowlist for the telephony path |
| `VAANI_DAILY_CALL_LIMIT`, `VAANI_CONSENT_POLICY_VERSION` | Optional |

The two deliberate traps: `VAANI_LIVE_ENABLED` has to be switched on
separately, and the reviewed agent id has to match the live one — a check that
the agent talking to fraud victims is the one somebody actually read.

`/api/vaani/status` names the exact blockers, which is the fastest way to see
what is missing:

```
curl -s https://<your-deployment>/api/vaani/status | python3 -m json.tool
```

## The case email — health: `email`

Without these no case-created email is sent. Everything else still works.

| Variable | Notes |
| --- | --- |
| `GMAIL_USER` | The sending address |
| `GMAIL_APP_PASSWORD` | An app password, not the account password |

---

## Checking a deployment

```
curl -s https://<your-deployment>/api/health | python3 -m json.tool
```

Every service reads `up`, `down` or `off`. `off` means the variables are not
set; `down` means they are set and the service did not answer, which is a
different problem and a worse one.
