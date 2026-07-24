-- Expand Nana's Recipes from a single configured owner to a small,
-- server-controlled owner allowlist and add the two semantic pink themes.
--
-- Existing allowlist rows are preserved by default. Administrators may pass
-- p_replace => true only when they intentionally want exact synchronization.

alter type public.theme_preference add value if not exists 'pink';
alter type public.theme_preference add value if not exists 'pink-dark';

create or replace function private.configure_owner_emails(
  p_emails text[],
  p_replace boolean default false
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_emails text[];
  configured_count integer;
begin
  if p_emails is null or cardinality(p_emails) = 0 then
    raise exception using
      errcode = '22023',
      message = 'At least one owner email is required.';
  end if;

  if cardinality(p_emails) > 20 then
    raise exception using
      errcode = '54000',
      message = 'At most 20 owner emails may be configured.';
  end if;

  if exists (
    select 1
    from unnest(p_emails) supplied(email)
    where btrim(coalesce(email, '')) = ''
  ) then
    raise exception using
      errcode = '22023',
      message = 'Every owner email must be a valid non-empty address.';
  end if;

  normalized_emails := array(
    select distinct lower(btrim(email))
    from unnest(p_emails) supplied(email)
    where btrim(coalesce(email, '')) <> ''
    order by lower(btrim(email))
  );

  if cardinality(normalized_emails) = 0
    or cardinality(normalized_emails) > 20
    or exists (
      select 1
      from unnest(normalized_emails) normalized(email)
      where char_length(email) not between 3 and 320
        or email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    )
  then
    raise exception using
      errcode = '22023',
      message = 'Every owner email must be a valid non-empty address.';
  end if;

  if p_replace then
    delete from private.owner_allowlist allowed
    where allowed.email <> all(normalized_emails);
  end if;

  insert into private.owner_allowlist (email)
  select email
  from unnest(normalized_emails) configured(email)
  on conflict (email) do nothing;

  -- Re-run the existing Auth user trigger for matching Google identities so an
  -- already-created account receives its profile and default preferences.
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  where lower(btrim(coalesce(email, ''))) = any(normalized_emails);

  select count(*)::integer
  into configured_count
  from private.owner_allowlist;

  return configured_count;
end;
$$;

revoke all on function private.configure_owner_emails(text[], boolean)
  from public, anon, authenticated;

-- Preserve the legacy administrative entry point without its former
-- destructive single-owner behavior.
create or replace function private.configure_owner_email(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.configure_owner_emails(array[p_email], false);
end;
$$;

revoke all on function private.configure_owner_email(text)
  from public, anon, authenticated;

comment on function private.configure_owner_emails(text[], boolean) is
  'Administrator-only normalized owner allowlist configuration. Additive by default; exact replacement requires an explicit true flag.';
comment on function private.configure_owner_email(text) is
  'Backward-compatible additive single-owner configuration. Prefer configure_owner_emails for multi-owner deployments.';
