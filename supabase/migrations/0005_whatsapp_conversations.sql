-- The interview in progress on WhatsApp.
--
-- On the web an intake draft lives in the browser: the person holds it, we hold
-- nothing, and a closed tab is the end of it. WhatsApp has no browser to hold
-- it in. The conversation is a sequence of webhooks from Meta with nothing
-- between them, so the half-finished interview has to live on our side or it
-- cannot exist at all.
--
-- That makes this the most sensitive table in the schema. A row is a partial
-- fraud report — the narrative, the amount, sometimes the bank — beside the
-- phone number of the person it happened to. `public.cases` at least holds
-- ciphertext nobody here can open without the key from the link; this holds the
-- thing itself, because the next webhook has to be able to continue it.
--
-- Three consequences, all enforced below rather than remembered:
--
--   1. It is transient by design. The moment the interview reaches a case the
--      draft is emptied and only the case id remains, so the sensitive half of
--      the row exists for the length of one conversation and not a day longer.
--   2. Every row carries `expires_at`, and the reminders job deletes what has
--      passed it. An abandoned interview is not kept in the hope it resumes.
--   3. Service role only, like every other table here. RLS on, no policies, no
--      grants: the publishable key is inert against it.

create table if not exists public.whatsapp_conversations (
  -- The sender's number as Meta gives it: digits only, international, no plus.
  -- It is the natural key — WhatsApp has exactly one conversation per number —
  -- and it is why this table is service-role only.
  wa_id            text primary key,

  -- The IntakeDraft, mid-interview. Emptied to '{}' at handoff.
  draft            jsonb not null default '{}'::jsonb,

  -- Set once the interview has produced a case. From here on the row is a
  -- pointer rather than a record: the case itself lives in `public.cases`,
  -- encrypted, and this side keeps no copy of what is in it.
  case_id          text,

  -- Meta retries webhooks it believes failed, and a retried "yes" must not be
  -- answered twice. The last handful of message ids we have already acted on,
  -- newest first; bounded in the accessor rather than growing without limit.
  seen_message_ids text[] not null default '{}',

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Deleted after this, finished or not. Reset on every inbound message, so an
  -- active conversation never expires under somebody mid-sentence.
  expires_at       timestamptz not null default now() + interval '7 days',

  -- The handoff. When the interview on WhatsApp is done we do not build the
  -- case here: `newCase` and the evidence factory are "use client" modules and
  -- the browser is still where a case is made, which is the whole reason a case
  -- key never has to exist on this side. Instead the finished draft waits under
  -- a one-time token, the link carries the token, and the web app trades it for
  -- the draft exactly once and then continues the interview it was already
  -- built to continue.
  --
  -- Only the SHA-256 is stored, the same posture as `cases.key_hash`: the token
  -- travels in the link we send and nowhere else, so a copy of this table
  -- cannot be used to claim anybody's interview.
  claim_hash       text,
  claim_expires_at timestamptz,

  constraint whatsapp_wa_id_shape check (wa_id ~ '^[0-9]{6,20}$'),
  constraint whatsapp_claim_shape check (claim_hash is null or claim_hash ~ '^[0-9a-f]{64}$'),
  constraint whatsapp_seen_bounded check (array_length(seen_message_ids, 1) is null
                                          or array_length(seen_message_ids, 1) <= 40)
);

-- Claiming a handoff looks the token up on its own, so it needs its own index;
-- partial, because all but a handful of rows have no live token.
create index if not exists whatsapp_conversations_claim_idx
  on public.whatsapp_conversations (claim_hash)
  where claim_hash is not null;

-- The purge job's only query.
create index if not exists whatsapp_conversations_expiry_idx
  on public.whatsapp_conversations (expires_at);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_conversations force row level security;

revoke all on public.whatsapp_conversations from anon, authenticated;
