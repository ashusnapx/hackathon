-- The scam advisories shown on the Check page.
--
-- The rule engine catches the grammar of a scam, which is stable. The stories
-- are not: the same pressure tactic arrives as a fake courier one month and a
-- fake FASTag KYC notice the next. This table is what lets the board change
-- without a redeploy, refreshed on a schedule from the bodies that publish
-- these — I4C, DoT Sanchar Saathi, CERT-In and RBI.
--
-- Unlike `public.cases`, nothing here is anybody's personal data. It is public
-- safety copy, identical for every reader, and the only reason it is in the
-- database rather than in the bundle is that it has to be replaceable daily.
-- It is still service-role only: a row here is displayed to a frightened person
-- as official guidance, so nothing but the refresh job may write one.

create table if not exists public.advisories (
  -- Stable per advisory, so a refresh updates the row it already wrote instead
  -- of appending a near-duplicate every night.
  id            text primary key,
  title         text not null,
  summary       text not null,
  tell          text not null,
  severity      text not null,
  source_name   text not null,
  source_url    text not null,
  -- The date the source itself carries, not the night we read it.
  published_at  date not null,
  -- The night we read it. Together these let the page say both "issued on" and
  -- "checked on", which are different claims and are often days apart.
  fetched_at    timestamptz not null default now(),
  -- Cleared rather than deleted when a source stops carrying an advisory, so
  -- the history of what was shown to people is not silently rewritten.
  retired_at    timestamptz,

  constraint advisories_severity_shape check (severity in ('high', 'medium')),
  constraint advisories_source_https check (source_url ~ '^https://'),
  constraint advisories_title_len check (length(title) between 1 and 200),
  constraint advisories_summary_len check (length(summary) between 1 and 800),
  constraint advisories_tell_len check (length(tell) between 1 and 400)
);

-- The board's only read: live advisories, worst first, newest first. Partial on
-- `retired_at is null` because that is the only slice ever queried, which keeps
-- the index to the handful of live rows rather than every advisory ever shown.
create index if not exists advisories_live_idx
  on public.advisories (severity, published_at desc)
  where retired_at is null;

-- Same posture as every other table here: RLS on, no policies, no grants. The
-- service role reaches it from the refresh job and from the route that serves
-- the board; the publishable key is inert against it.
alter table public.advisories enable row level security;
alter table public.advisories force row level security;

revoke all on public.advisories from anon, authenticated;
