-- These functions are invoked by database triggers only. They should not be
-- callable through PostgREST/RPC by anonymous or signed-in clients.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.sync_recipe_cooking_stats() from public, anon, authenticated;
revoke execute on function public.sync_recipe_cover() from public, anon, authenticated;
