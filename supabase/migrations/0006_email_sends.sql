-- One email per case per reason, decided by the database.
--
-- Kavach sends two kinds of unprompted mail: the reference when a case is
-- created, and a nudge on the morning a step falls due. Both were guarded by a
-- record kept somewhere that could not hold it, and both repeated.
--
-- ── What was wrong with the case-created guard ──────────────────────────────
--
-- It was a key in the browser's local storage, written only if the tab was
-- still mounted when the request came back. Every case screen is its own route
-- now, so tapping a step within a second of opening a case unmounted the
-- sender, the write was skipped, and the next screen sent the mail again. Local
-- storage could not have been right in any case: it is per-device, so a person
-- signed in on a phone and a laptop was always going to be mailed twice.
--
-- ── What was wrong with the reminder guard ─────────────────────────────────
--
-- It was a `remindedAt` stamp written into the case document itself. The
-- browser is the author of that document and has never heard of the field, so
-- the next thing the person edited pushed a copy without it and erased the
-- record — and the following night's job, finding no stamp, sent the reminder
-- again.
--
-- ── Why this table fixes both ──────────────────────────────────────────────
--
-- The record now lives where nothing else writes, and the claim is the insert
-- rather than a read followed by a write: two tabs racing the same email both
-- attempt the same primary key and exactly one of them wins. A sender claims
-- first and gives the claim back if delivery fails, so a refused SMTP
-- connection costs a retry rather than the message.
--
-- ── Why there is no foreign key onto public.cases ──────────────────────────
--
-- The claim is made when a route decides to send, which can be before the
-- browser's debounced push has stored the case at all — the person is looking
-- at their case page while the first copy is still in flight. A foreign key
-- would turn that ordinary race into a suppressed email, which is the one
-- outcome worth avoiding here. Deletion is handled explicitly instead: see
-- `forgetEmailSends`, called from `deleteCaseRow`, because "delete this case"
-- has to take the address we mailed about it too.

create table if not exists public.email_sends (
  case_id   text not null,
  -- 'case-created', or 'reminder:<track id>'. Freeform on purpose: a new kind
  -- of message is a new string, not a migration.
  kind      text not null,
  -- Kept so a duplicate report can be answered without guessing, and deleted
  -- with the case. It is the only personal data here.
  to_email  text not null,
  sent_at   timestamptz not null default now(),

  primary key (case_id, kind),
  constraint email_sends_kind_shape check (length(kind) between 3 and 64),
  constraint email_sends_email_shape check (length(to_email) between 3 and 254)
);

-- No separate index on case_id: it is the leading column of the primary key,
-- which already serves both the claim and the delete-by-case sweep.

-- Same posture as public.cases and public.case_owners: RLS on, no policies, no
-- grants. Only the service role reaches this, and only from a route that has
-- already decided who it is mailing.
alter table public.email_sends enable row level security;
alter table public.email_sends force row level security;

revoke all on public.email_sends from anon, authenticated;
