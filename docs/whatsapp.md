# Connecting the real WhatsApp

Everything in `src/lib/whatsapp/`, `src/lib/integrations/whatsapp.ts` and
`src/app/api/whatsapp/` is written and tested. What is not done — because it
cannot be done from inside this repository — is the half that lives in a Meta
account and on a public hostname. This is that half.

Until the four server variables are set, the webhook answers `503`, the live
button on `/whatsapp` does not render, and the page keeps calling itself a
replica. That is deliberate: a deployment with no credentials should not claim
to have an integration.

## 1. Meta app

1. <https://developers.facebook.com> → **Create app** → *Business*.
2. Add the **WhatsApp** product. This gives you a **test number** immediately,
   with no business verification.
3. **API Setup** → copy the **Phone number ID** (not the phone number).
4. Add your own number under **To**, and accept the WhatsApp invite it sends.
   The test number can message up to five recipients registered this way. That
   is enough for a demo, and it is the reason this cannot yet be handed to real
   victims.

## 2. A token that does not expire in 24 hours

The token shown on the API Setup page is temporary. For anything that has to
survive a day:

1. **Business Settings** → **System users** → add one with the *Admin* role.
2. **Assign assets** → your app and your WhatsApp account, with full control.
3. **Generate token** → scopes `whatsapp_business_messaging` and
   `whatsapp_business_management`. That token is permanent.

## 3. Environment

```bash
# Server-only. None of these may become NEXT_PUBLIC_.
WHATSAPP_PHONE_NUMBER_ID=...      # API Setup → Phone number ID
WHATSAPP_ACCESS_TOKEN=...         # the system-user token from step 2
WHATSAPP_APP_SECRET=...           # App settings → Basic → App secret
WHATSAPP_VERIFY_TOKEN=...         # any long random string you invent

# Optional
WHATSAPP_GRAPH_VERSION=v23.0      # bump when Meta retires a version
WHATSAPP_TIMEOUT_MS=12000

# Public: the number people message. Nothing secret about it.
NEXT_PUBLIC_WHATSAPP_NUMBER=+15550000000
```

`WHATSAPP_APP_SECRET` is what proves a webhook came from Meta. Without it the
endpoint is open to anyone who learns the URL, and this one starts fraud
interviews — so the route refuses to run at all rather than skipping the check.

On Vercel, set these for **all three** environments and confirm with
`vercel env ls`. The dashboard has previously saved keys into a scope this
project could not read.

## 4. Database

```bash
supabase db push        # applies 0005_whatsapp_conversations.sql
```

## 5. A public HTTPS URL

Meta will not call `localhost`. For development:

```bash
cloudflared tunnel --url http://localhost:3000
# or: ngrok http 3000
```

Then in the Meta app → **WhatsApp → Configuration**:

- **Callback URL**: `https://<your-host>/api/whatsapp/webhook`
- **Verify token**: the same string as `WHATSAPP_VERIFY_TOKEN`
- **Verify and save** — this fires the `GET` handshake
- **Manage** → subscribe to the **`messages`** field. Nothing arrives without
  this, and forgetting it looks exactly like a broken webhook.

## 5b. One decision that is still yours

`/assist` — where the handoff link lands — is **behind the sign-in gate**
(`src/lib/auth/routes.ts`). The webhook is now allowlisted, because Meta cannot
present a session cookie and could not otherwise complete the handshake. The
landing page was left alone deliberately: opening it changes who can use Kavach
without an account, which is a product decision and not a wiring detail.

As it stands, somebody arriving from WhatsApp is bounced to `/signin?next=…`.
The token survives the round trip, so the interview is not lost — but they are
asked to make an account in the middle of reporting a fraud, which is the exact
thing this project criticises the portal for on the landing page ("It asks who
you are before it asks what happened. We ask last.").

To make the handoff work without an account, add both to `PUBLIC_PATHS`:

```ts
"/assist",
"/api/whatsapp/claim",   // the page cannot claim its draft without this
```

The claim endpoint defends itself without a session: same-origin only, a
single-use token, and only the SHA-256 of that token is stored. Leave both
gated if you would rather WhatsApp users signed in first — the flow still works,
it just costs them an account.

## 6. Try it

Message the test number from a registered handset. Expect: the boundaries, the
safety gate, the age question, whether money has moved, a name, then the story —
typed or as a voice note — then a read-back of what was heard, then a link.

## What is deliberately not built

- **Templates.** Business-initiated messages outside the 24-hour window need a
  Meta-approved template, and approval takes days. Every message this
  integration sends is a reply inside a window the person opened, so none is
  needed — but it also means Kavach cannot send an unprompted reminder about a
  deadline. That is the next thing to build, and the template has to clear
  approval before the code is worth writing.
- **Business verification.** Required to message beyond the five test
  recipients, and to use your own number instead of Meta's test one.
- **The second half of the interview.** WhatsApp does intake and hands over a
  link; the RBI branch, the evidence vault, the drafts and the ten clocks stay
  in the browser. See the note at the top of `src/lib/whatsapp/engine.ts` for
  why that is a design decision rather than a shortcut.

## Privacy notes worth keeping

- No message body, phone number or draft is ever logged, at any level.
- The conversation row holds a partial fraud report next to the number it
  belongs to. It is emptied at handoff, expires seven days after the last
  message, and `STOP` deletes it immediately.
- The handoff token is single-use and stored only as a SHA-256, the same
  posture as `cases.key_hash`.
