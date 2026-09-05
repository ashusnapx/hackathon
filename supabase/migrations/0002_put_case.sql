-- Write a case, but only for whoever holds its key.
--
-- "Insert if new, update if the key matches" has to be one statement. Read the
-- row first and decide in the application, and two devices syncing the same
-- case at the same moment can interleave between the read and the write — or
-- worse, a case can be claimed by someone who asked whether it existed. The
-- conditional ON CONFLICT below leaves no such window: a mismatched key updates
-- nothing, returns nothing, and is reported as a refusal.

create or replace function public.put_case(
  p_id text,
  p_key_hash text,
  p_ref text,
  p_data jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
begin
  insert into public.cases as c (id, key_hash, ref, data)
  values (p_id, p_key_hash, p_ref, p_data)
  on conflict (id) do update
    set data = excluded.data,
        ref = excluded.ref,
        revision = c.revision + 1
    where c.key_hash = excluded.key_hash
  returning c.revision into v_revision;

  -- No row came back, so the case exists and the key was wrong.
  if v_revision is null then
    raise exception 'case-key-mismatch' using errcode = '42501';
  end if;

  return v_revision;
end;
$$;

revoke all on function public.put_case(text, text, text, jsonb) from public;
revoke all on function public.put_case(text, text, text, jsonb) from anon, authenticated;
grant execute on function public.put_case(text, text, text, jsonb) to service_role;
