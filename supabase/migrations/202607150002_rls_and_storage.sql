-- Row-level security and private image storage.
--
-- These policies establish per-identity ownership. Migration 008 adds a
-- restrictive private owner-allowlist gate on top, so a session must satisfy
-- both the deployment owner email and auth.uid() row ownership.

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_substitutions enable row level security;
alter table public.tags enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.recipe_images enable row level security;
alter table public.pantry_items enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.cooking_history enable row level security;
alter table public.recipe_shares enable row level security;

-- Root tables use direct ownership. auth.uid() is wrapped in SELECT so PostgreSQL
-- can evaluate it once per statement instead of once per row.
create policy profiles_owner_all
on public.profiles
for all
to authenticated
using (user_id = (select auth.uid()) and id = (select auth.uid()))
with check (user_id = (select auth.uid()) and id = (select auth.uid()));

create policy user_preferences_owner_all
on public.user_preferences
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy recipes_owner_all
on public.recipes
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy ingredients_owner_all
on public.ingredients
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy tags_owner_all
on public.tags
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Substitutions must be owned by the session and both endpoints must belong to
-- that same owner. This prevents cross-user graph edges even if IDs are guessed.
create policy ingredient_substitutions_owner_all
on public.ingredient_substitutions
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.ingredients source
    where source.id = ingredient_substitutions.ingredient_id
      and source.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.ingredients replacement
    where replacement.id = ingredient_substitutions.substitute_ingredient_id
      and replacement.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.ingredients source
    where source.id = ingredient_substitutions.ingredient_id
      and source.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.ingredients replacement
    where replacement.id = ingredient_substitutions.substitute_ingredient_id
      and replacement.user_id = (select auth.uid())
  )
);

-- Recipe child policies intentionally re-check the parent recipe. Composite
-- foreign keys also enforce this invariant below the policy layer.
create policy recipe_ingredients_owner_all
on public.recipe_ingredients
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.ingredients i
    where i.id = recipe_ingredients.ingredient_id
      and i.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.ingredients i
    where i.id = recipe_ingredients.ingredient_id
      and i.user_id = (select auth.uid())
  )
);

create policy recipe_steps_owner_all
on public.recipe_steps
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_steps.recipe_id
      and r.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_steps.recipe_id
      and r.user_id = (select auth.uid())
  )
);

create policy recipe_tags_owner_all
on public.recipe_tags
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_tags.recipe_id
      and r.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.tags t
    where t.id = recipe_tags.tag_id
      and t.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_tags.recipe_id
      and r.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.tags t
    where t.id = recipe_tags.tag_id
      and t.user_id = (select auth.uid())
  )
);

create policy recipe_images_owner_all
on public.recipe_images
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_images.recipe_id
      and r.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_images.recipe_id
      and r.user_id = (select auth.uid())
  )
);

create policy pantry_items_owner_all
on public.pantry_items
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.ingredients i
    where i.id = pantry_items.ingredient_id
      and i.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.ingredients i
    where i.id = pantry_items.ingredient_id
      and i.user_id = (select auth.uid())
  )
);

create policy shopping_list_items_owner_all
on public.shopping_list_items
for all
to authenticated
using (
  user_id = (select auth.uid())
  and (
    ingredient_id is null
    or exists (
      select 1 from public.ingredients i
      where i.id = shopping_list_items.ingredient_id
        and i.user_id = (select auth.uid())
    )
  )
  and (
    recipe_id is null
    or exists (
      select 1 from public.recipes r
      where r.id = shopping_list_items.recipe_id
        and r.user_id = (select auth.uid())
    )
  )
)
with check (
  user_id = (select auth.uid())
  and (
    ingredient_id is null
    or exists (
      select 1 from public.ingredients i
      where i.id = shopping_list_items.ingredient_id
        and i.user_id = (select auth.uid())
    )
  )
  and (
    recipe_id is null
    or exists (
      select 1 from public.recipes r
      where r.id = shopping_list_items.recipe_id
        and r.user_id = (select auth.uid())
    )
  )
);

create policy cooking_history_owner_all
on public.cooking_history
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = cooking_history.recipe_id
      and r.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = cooking_history.recipe_id
      and r.user_id = (select auth.uid())
  )
);

-- Visibility and share rows are metadata only in v1. No public or recipient
-- policy exists, so changing visibility cannot accidentally publish a recipe.
create policy recipe_shares_owner_all
on public.recipe_shares
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_shares.recipe_id
      and r.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_shares.recipe_id
      and r.user_id = (select auth.uid())
  )
);

revoke all on table public.profiles from anon;
revoke all on table public.user_preferences from anon;
revoke all on table public.recipes from anon;
revoke all on table public.ingredients from anon;
revoke all on table public.ingredient_substitutions from anon;
revoke all on table public.tags from anon;
revoke all on table public.recipe_ingredients from anon;
revoke all on table public.recipe_steps from anon;
revoke all on table public.recipe_tags from anon;
revoke all on table public.recipe_images from anon;
revoke all on table public.pantry_items from anon;
revoke all on table public.shopping_list_items from anon;
revoke all on table public.cooking_history from anon;
revoke all on table public.recipe_shares from anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;
grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, update, delete on table public.ingredients to authenticated;
grant select, insert, update, delete on table public.ingredient_substitutions to authenticated;
grant select, insert, update, delete on table public.tags to authenticated;
grant select, insert, update, delete on table public.recipe_ingredients to authenticated;
grant select, insert, update, delete on table public.recipe_steps to authenticated;
grant select, insert, update, delete on table public.recipe_tags to authenticated;
grant select, insert, update, delete on table public.recipe_images to authenticated;
grant select, insert, update, delete on table public.pantry_items to authenticated;
grant select, insert, update, delete on table public.shopping_list_items to authenticated;
grant select, insert, update, delete on table public.cooking_history to authenticated;
grant select, insert, update, delete on table public.recipe_shares to authenticated;

-- The bucket is private. MIME/size limits are defense in depth; the application
-- must still verify extension, MIME and size before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths must start with auth.uid(): <user-id>/<random-name>.<ext>.
-- SELECT is required for authenticated downloads and signed-URL creation.
create policy "recipe images select own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid()::text)
);

create policy "recipe images insert own namespace"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid()::text)
);

create policy "recipe images update own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid()::text)
);

create policy "recipe images delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid()::text)
);

comment on policy recipes_owner_all on public.recipes is
  'Owner isolation only; visibility metadata does not grant public access in v1.';
comment on policy recipe_ingredients_owner_all on public.recipe_ingredients is
  'Child ownership is checked through both recipe and ingredient parents.';
comment on policy recipe_steps_owner_all on public.recipe_steps is
  'Child ownership is checked through the parent recipe.';
comment on policy recipe_tags_owner_all on public.recipe_tags is
  'Both the recipe and tag must belong to auth.uid().';
comment on policy recipe_images_owner_all on public.recipe_images is
  'Database image metadata is owner-only; storage.objects has matching namespace policies.';
