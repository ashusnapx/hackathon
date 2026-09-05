-- Kavach case storage.
--
-- A case file used to live only in the browser that made it, which meant the
-- link in a victim's email opened nothing on their phone. This table is what
-- makes a case survive the device it was started on.
--
-- Access is deliberately not modelled as "users". Kavach has no accounts: a
-- person in the middle of being defrauded should not have to invent a password
-- first. Instead every case carries a 256-bit key generated in the browser, and
-- only its SHA-256 is stored here. The app's server routes hold the service
-- role and check that hash before they read or write a row, so possession of
-- the key is the whole authorisation story — and a stolen database gives up no
-- keys, only hashes.
--
-- Nothing else may reach this table. RLS is enabled with no policies at all and
-- every grant to the public roles is revoked, so the publishable key is inert
-- against it even if it leaks.

create table if not exists public.cases (
  id          text primary key,
  -- Hex SHA-256 of the case key. The key itself is never sent here.
  key_hash    text not null,
  ref         text not null,
  revision    bigint not null default 1,
  data        jsonb not null,
  -- Read-only projections of the document, so the case load can be answered
  -- without parsing every blob. They are generated, so they cannot drift.
  category    text generated always as (data #>> '{triage,categoryId}') stored,
  state       text generated always as (data #>> '{victim,state}') stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint cases_id_shape check (length(id) between 6 and 64),
  constraint cases_ref_shape check (length(ref) between 3 and 40),
  constraint cases_key_hash_shape check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint cases_revision_positive check (revision > 0)
);

create index if not exists cases_ref_idx on public.cases (ref);
create index if not exists cases_created_at_idx on public.cases (created_at desc);
create index if not exists cases_category_idx on public.cases (category);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cases_touch_updated_at on public.cases;
create trigger cases_touch_updated_at
  before update on public.cases
  for each row execute function public.touch_updated_at();

alter table public.cases enable row level security;
alter table public.cases force row level security;

-- No policies are created on purpose. Only the service role, which bypasses
-- RLS and never leaves the server, may read or write these rows.
revoke all on public.cases from anon, authenticated;
