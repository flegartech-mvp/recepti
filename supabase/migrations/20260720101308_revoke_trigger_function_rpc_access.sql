-- These functions are invoked by database triggers only. They should not be
-- callable through PostgREST/RPC by anonymous or signed-in clients. Some local
-- stacks do not install Supabase's optional rls_auto_enable event trigger, so
-- guard every signature while preserving the same hosted-project revocations.
do $migration$
declare
  signature text;
  target regprocedure;
begin
  foreach signature in array array[
    'public.handle_new_auth_user()',
    'public.rls_auto_enable()',
    'public.sync_recipe_cooking_stats()',
    'public.sync_recipe_cover()'
  ]
  loop
    target := to_regprocedure(signature);
    if target is not null then
      execute format(
        'revoke execute on function %s from public, anon, authenticated',
        target
      );
    end if;
  end loop;
end;
$migration$;
