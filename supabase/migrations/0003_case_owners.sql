-- Cases that follow the person rather than the device.
--
-- Kavach's case storage is deliberately account-free: a case is held by whoever
-- has its 256-bit key, and `public.cases` keeps only the SHA-256 of that key, so
-- the server can check a claim without being able to make one. That property is
-- worth having and it is kept, unchanged, for everyone who never signs in.
--
-- It also had a cost that showed up the moment the product grew accounts. The
-- key is made in the browser and lives in that browser's local storage, so the
-- same person, signed in with the same email and password, saw a different list
-- of cases on their phone and on their laptop — and read that as cases having
-- been lost. For somebody keeping a record of a fraud, that is the worst
-- possible failure.
--
-- This table is the deliberate trade. A signed-in person may attach a case to
-- their account, and doing so stores the case key itself, not a hash of it:
-- there is no way to hand a case to a second device without something on the
-- server being able to open it. The exchange is stated in as many words on the
-- account panel and in the honesty section rather than buried here, because a
-- privacy guarantee that quietly weakened is worse than one never claimed.
--
-- What is NOT stored here is any case content. This is a keyring; the case
-- itself still lives in `public.cases`, still addressed by its key hash, and is
-- still fetched through the same route a link-holder uses.
--
-- Signing out, or never signing in, leaves the original model exactly as it was.

create table if not exists public.case_owners (
  user_id     uuid not null references auth.users (id) on delete cascade,
  case_id     text not null references public.cases (id) on delete cascade,
  -- The case key in the clear. See the note above: this is the whole point of
  -- the table and the whole cost of it.
  case_key    text not null,
  created_at  timestamptz not null default now(),

  primary key (user_id, case_id),
  constraint case_owners_key_shape check (case_key ~ '^[A-Za-z0-9_-]{43}$')
);

-- The query this table exists to serve: every case belonging to one account,
-- newest first, which is the order the case list is read in. The primary key
-- already indexes `user_id` as its leading column; this adds the sort order so
-- the list does not have to be sorted after it is fetched.
create index if not exists case_owners_user_idx
  on public.case_owners (user_id, created_at desc);

-- Postgres does not index a foreign key column on its own, and `case_id` is not
-- the leading column of the primary key, so without this it has no index at all.
-- That matters here specifically because of `on delete cascade`: deleting a case
-- — which `deleteCaseRow` does whenever somebody asks Kavach to forget one —
-- would sequentially scan this whole table to find the rows to cascade to.
create index if not exists case_owners_case_idx
  on public.case_owners (case_id);

-- Same posture as `public.cases`: RLS on, no policies, no grants. Only the
-- service role reaches this, and only from a route that has already verified
-- the session with `auth.getUser()` rather than trusting a cookie.
alter table public.case_owners enable row level security;
alter table public.case_owners force row level security;

revoke all on public.case_owners from anon, authenticated;
