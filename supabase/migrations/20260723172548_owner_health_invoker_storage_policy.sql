-- Let the authenticated application owner read only the recipe bucket's
-- configuration metadata. This keeps the public diagnostics RPC on caller
-- privileges instead of exposing a SECURITY DEFINER function via PostgREST.

create policy "Owner can inspect recipe image bucket"
on storage.buckets
for select
to authenticated
using (
  id = 'recipe-images'
  and (select private.is_app_owner())
);

alter function public.owner_health_check()
security invoker;

comment on function public.owner_health_check() is
  'Owner-only, read-only SECURITY INVOKER health contract. Returns safe booleans without configuration values or private cookbook data.';
