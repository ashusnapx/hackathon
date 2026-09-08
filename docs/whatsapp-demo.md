# WhatsApp live in five minutes (Twilio sandbox)

For a demo. `docs/whatsapp.md` is the real Meta Cloud API route — use that for
anything a real victim will touch. This one trades a shared sandbox number and a
join code for skipping business verification, app review and template approval
entirely.

You are already deployed, so there is no tunnel and no `ngrok`.

---

## 1. Twilio account — 2 min

<https://twilio.com/try-twilio>. A free trial is enough. From the console
homepage copy:

- **Account SID** (starts `AC…`)
- **Auth Token** (click to reveal)

## 2. Env on Vercel — 1 min

```bash
vercel env add TWILIO_AUTH_TOKEN production      # paste the auth token
vercel env add TWILIO_ACCOUNT_SID production     # paste the SID
vercel env ls                                    # confirm both landed
vercel --prod                                    # redeploy so they take effect
```

`TWILIO_AUTH_TOKEN` is the only one that is strictly required — it is what
verifies the webhook signature. The SID is needed only to fetch voice notes;
typed messages work without it.

> Check `vercel env ls` rather than trusting the dashboard. Keys have gone into
> a scope this project could not read before.

## 3. Sandbox — 2 min

Console → **Messaging → Try it out → Send a WhatsApp message**.

1. The **Sandbox** tab shows a number (`+1 415 523 8886`) and a join code
   (`join something-word`).
2. Open the **Sandbox settings** tab.
3. **When a message comes in** →

   ```
   https://<your-production-domain>/api/whatsapp/twilio
   ```

   Method **POST**. Save.

## 4. Join, from every phone that will be on stage

Each participant sends `join <your-code>` to **+1 415 523 8886** on WhatsApp,
once. Twilio replies confirming. Do this for the demo phone *and* a spare,
before you are in front of anyone.

## 5. Say hello

Message anything to that number. Expect:

1. What Kavach is, and is not
2. Are you safe right now?
3. Is this about you, or someone under 18?
4. Has money actually left your account?
5. What should I call you?
6. Tell me what happened — typed **or a voice note**
7. A read-back of the amount and identifiers it picked out
8. A link to the case file

Reply **STOP** at any point and the conversation is deleted.

---

## If it does not answer

| Symptom | Cause |
|---|---|
| Twilio console shows `11200` / `401` | `TWILIO_AUTH_TOKEN` is wrong, or the deploy that set it has not finished |
| `401` and the token *is* right | The signed URL differs from the received one. Set `TWILIO_WEBHOOK_URL` to the exact URL you pasted into Twilio and redeploy |
| "not connected right now" | `TWILIO_AUTH_TOKEN` is unset in the environment that served the request |
| "cannot take an interview" | Supabase env vars are missing, or `0005_whatsapp_conversations.sql` has not been applied — `supabase db push` |
| Nothing at all | The phone never sent the join code, or it went to the wrong sandbox number |

## Before you present

- Run through the whole flow once on the demo phone. The conversation is stored
  per number, so **send `STOP` afterwards** or you will resume mid-interview on
  stage instead of starting fresh.
- The handoff link lands on `/assist`, which is **behind the sign-in gate**. Add
  `"/assist"` and `"/api/whatsapp/claim"` to `PUBLIC_PATHS` in
  `src/lib/auth/routes.ts` if you want to open the case file on stage without
  signing in first. See the same note in `docs/whatsapp.md`.
- If Twilio stalls for any reason, `/whatsapp` still has the replica, and it
  still says it is a replica. That is the fallback and it is not embarrassing:
  the page has always been honest about what it is.

## What to say about it

It is worth being straight that this is a sandbox: a shared Twilio number, a
join code, a demo transport. The interview behind it is the real one — same
engine, same extraction, same case file, and the Meta Cloud API path is written
and tested and needs only credentials. Claiming the sandbox is a production
WhatsApp deployment is the one thing that would undercut a product whose whole
argument is that it does not overstate what it has done.
