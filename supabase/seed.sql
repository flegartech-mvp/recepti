-- Optional development data for Nana's Recipes.
--
-- This script never creates an auth user. Set a local PostgreSQL session value
-- before running it, or sign in once and let it use the first local profile:
--   set app.seed_user_id = '00000000-0000-0000-0000-000000000000';
--   \i supabase/seed.sql
--
-- It is idempotent and should not be configured as a production seed.

do $seed$
declare
  seed_user uuid;
begin
  seed_user := nullif(current_setting('app.seed_user_id', true), '')::uuid;
  if seed_user is null then
    select p.user_id into seed_user
    from public.profiles p
    order by p.created_at
    limit 1;
  end if;

  if seed_user is null then
    raise notice 'Nana''s Recipes seed skipped: create a local auth user or set app.seed_user_id first.';
    return;
  end if;

  if not exists (select 1 from auth.users where id = seed_user) then
    raise exception 'Nana''s Recipes seed user % does not exist in auth.users.', seed_user;
  end if;

  insert into public.ingredients (
    id, user_id, canonical_name, display_name, normalized_name, category,
    default_unit, aliases, is_staple
  )
  values
    ('10000000-0000-4000-8000-000000000001', seed_user, 'pasta', 'Pasta', 'pasta', 'pasta', 'g', array['spaghetti', 'noodles'], false),
    ('10000000-0000-4000-8000-000000000002', seed_user, 'mushroom', 'Mushrooms', 'mushroom', 'produce', 'g', array['mushrooms'], false),
    ('10000000-0000-4000-8000-000000000003', seed_user, 'cooking cream', 'Cooking cream', 'cooking cream', 'dairy', 'ml', array['cream'], false),
    ('10000000-0000-4000-8000-000000000004', seed_user, 'garlic', 'Garlic', 'garlic', 'produce', 'clove', '{}', false),
    ('10000000-0000-4000-8000-000000000005', seed_user, 'parmesan', 'Parmesan', 'parmesan', 'dairy', 'g', array['parmigiano'], false),
    ('10000000-0000-4000-8000-000000000006', seed_user, 'carrot', 'Carrots', 'carrot', 'produce', 'piece', array['carrots'], false),
    ('10000000-0000-4000-8000-000000000007', seed_user, 'potato', 'Potatoes', 'potato', 'produce', 'piece', array['potatoes'], false),
    ('10000000-0000-4000-8000-000000000008', seed_user, 'onion', 'Onion', 'onion', 'produce', 'piece', array['onions'], false),
    ('10000000-0000-4000-8000-000000000009', seed_user, 'vegetable stock', 'Vegetable stock', 'vegetable stock', 'canned_goods', 'ml', array['vegetable broth'], false),
    ('10000000-0000-4000-8000-000000000010', seed_user, 'water', 'Water', 'water', 'beverages', 'ml', '{}', true),
    ('10000000-0000-4000-8000-000000000011', seed_user, 'chicken breast', 'Chicken breast', 'chicken breast', 'meat', 'g', array['chicken'], false),
    ('10000000-0000-4000-8000-000000000012', seed_user, 'rice', 'Rice', 'rice', 'grains', 'g', '{}', false),
    ('10000000-0000-4000-8000-000000000013', seed_user, 'cucumber', 'Cucumber', 'cucumber', 'produce', 'piece', array['cucumbers'], false),
    ('10000000-0000-4000-8000-000000000014', seed_user, 'soy sauce', 'Soy sauce', 'soy sauce', 'condiments', 'ml', '{}', false),
    ('10000000-0000-4000-8000-000000000015', seed_user, 'banana', 'Bananas', 'banana', 'produce', 'piece', array['bananas'], false),
    ('10000000-0000-4000-8000-000000000016', seed_user, 'rolled oats', 'Rolled oats', 'rolled oats', 'grains', 'g', array['oats', 'oatmeal'], false),
    ('10000000-0000-4000-8000-000000000017', seed_user, 'egg', 'Eggs', 'egg', 'eggs', 'piece', array['eggs'], false),
    ('10000000-0000-4000-8000-000000000018', seed_user, 'milk', 'Milk', 'milk', 'dairy', 'ml', '{}', false),
    ('10000000-0000-4000-8000-000000000019', seed_user, 'tomato', 'Tomatoes', 'tomato', 'produce', 'piece', array['tomatoes'], false),
    ('10000000-0000-4000-8000-000000000020', seed_user, 'feta', 'Feta', 'feta', 'dairy', 'g', array['feta cheese'], false),
    ('10000000-0000-4000-8000-000000000021', seed_user, 'olive', 'Olives', 'olive', 'produce', 'g', array['olives'], false),
    ('10000000-0000-4000-8000-000000000022', seed_user, 'olive oil', 'Olive oil', 'olive oil', 'oils', 'ml', '{}', true),
    ('10000000-0000-4000-8000-000000000023', seed_user, 'salt', 'Salt', 'salt', 'spices', 'pinch', '{}', true),
    ('10000000-0000-4000-8000-000000000024', seed_user, 'black pepper', 'Black pepper', 'black pepper', 'spices', 'pinch', array['pepper'], true)
  on conflict (id) do nothing;

  insert into public.tags (id, user_id, name, normalized_name, type)
  values
    ('20000000-0000-4000-8000-000000000001', seed_user, 'Vegetarian', 'vegetarian', 'dietary'),
    ('20000000-0000-4000-8000-000000000002', seed_user, 'Quick', 'quick', 'custom'),
    ('20000000-0000-4000-8000-000000000003', seed_user, 'Weeknight', 'weeknight', 'custom'),
    ('20000000-0000-4000-8000-000000000004', seed_user, 'Fresh', 'fresh', 'custom')
  on conflict (id) do nothing;

  insert into public.recipes (
    id, user_id, title, slug, description, category, cuisine, difficulty,
    prep_minutes, cook_minutes, rest_minutes, servings, notes, is_favorite, status
  )
  values
    (
      '30000000-0000-4000-8000-000000000001', seed_user,
      'Creamy mushroom pasta', 'creamy-mushroom-pasta',
      'Silky mushrooms and pasta in a cozy cream sauce.', 'dinner', 'Italian-inspired',
      'easy', 10, 20, 0, 2, 'Save a little pasta water before draining.', true, 'published'
    ),
    (
      '30000000-0000-4000-8000-000000000002', seed_user,
      'Garden vegetable soup', 'garden-vegetable-soup',
      'A simple, warming soup packed with everyday vegetables.', 'lunch', 'European',
      'easy', 15, 30, 5, 4, 'Taste before adding extra salt; stock varies.', false, 'published'
    ),
    (
      '30000000-0000-4000-8000-000000000003', seed_user,
      'Chicken rice bowl', 'chicken-rice-bowl',
      'Savory chicken, fluffy rice, and crisp cucumber.', 'dinner', 'Asian-inspired',
      'medium', 15, 25, 5, 2, null, true, 'published'
    ),
    (
      '30000000-0000-4000-8000-000000000004', seed_user,
      'Banana oat pancakes', 'banana-oat-pancakes',
      'Tender breakfast pancakes made with banana and oats.', 'breakfast', 'Home-style',
      'easy', 8, 12, 0, 2, 'Use a ripe, spotty banana for natural sweetness.', true, 'published'
    ),
    (
      '30000000-0000-4000-8000-000000000005', seed_user,
      'Greek-style salad', 'greek-style-salad',
      'Crunchy vegetables, briny olives, and creamy feta.', 'side', 'Greek-inspired',
      'easy', 15, 0, 5, 3,
      'Dietary labels are organizational only; always check ingredients for allergies.',
      false, 'published'
    )
  on conflict (id) do nothing;

  insert into public.recipe_ingredients (
    id, user_id, recipe_id, ingredient_id, quantity, unit, preparation_note,
    is_optional, is_garnish, sort_order
  )
  values
    ('40000000-0000-4000-8000-000000000001', seed_user, '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 200, 'g', null, false, false, 0),
    ('40000000-0000-4000-8000-000000000002', seed_user, '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 200, 'g', 'sliced', false, false, 1),
    ('40000000-0000-4000-8000-000000000003', seed_user, '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 150, 'ml', null, false, false, 2),
    ('40000000-0000-4000-8000-000000000004', seed_user, '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 2, 'clove', 'finely chopped', false, false, 3),
    ('40000000-0000-4000-8000-000000000005', seed_user, '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 30, 'g', 'finely grated', true, true, 4),
    ('40000000-0000-4000-8000-000000000006', seed_user, '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', 3, 'piece', 'sliced', false, false, 0),
    ('40000000-0000-4000-8000-000000000007', seed_user, '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000007', 3, 'piece', 'diced', false, false, 1),
    ('40000000-0000-4000-8000-000000000008', seed_user, '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000008', 1, 'piece', 'chopped', false, false, 2),
    ('40000000-0000-4000-8000-000000000009', seed_user, '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000009', 750, 'ml', null, false, false, 3),
    ('40000000-0000-4000-8000-000000000010', seed_user, '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000010', 250, 'ml', null, false, false, 4),
    ('40000000-0000-4000-8000-000000000011', seed_user, '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000011', 300, 'g', 'sliced', false, false, 0),
    ('40000000-0000-4000-8000-000000000012', seed_user, '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000012', 160, 'g', 'rinsed', false, false, 1),
    ('40000000-0000-4000-8000-000000000013', seed_user, '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000013', 1, 'piece', 'thinly sliced', false, false, 2),
    ('40000000-0000-4000-8000-000000000014', seed_user, '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000014', 30, 'ml', null, false, false, 3),
    ('40000000-0000-4000-8000-000000000015', seed_user, '30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000015', 2, 'piece', 'mashed', false, false, 0),
    ('40000000-0000-4000-8000-000000000016', seed_user, '30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000016', 120, 'g', null, false, false, 1),
    ('40000000-0000-4000-8000-000000000017', seed_user, '30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000017', 2, 'piece', null, false, false, 2),
    ('40000000-0000-4000-8000-000000000018', seed_user, '30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000018', 100, 'ml', null, false, false, 3),
    ('40000000-0000-4000-8000-000000000019', seed_user, '30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000019', 3, 'piece', 'cut into wedges', false, false, 0),
    ('40000000-0000-4000-8000-000000000020', seed_user, '30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000013', 1, 'piece', 'chopped', false, false, 1),
    ('40000000-0000-4000-8000-000000000021', seed_user, '30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000020', 150, 'g', 'crumbled', false, false, 2),
    ('40000000-0000-4000-8000-000000000022', seed_user, '30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000021', 80, 'g', null, false, false, 3),
    ('40000000-0000-4000-8000-000000000023', seed_user, '30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000022', 30, 'ml', null, false, false, 4)
  on conflict (id) do nothing;

  insert into public.recipe_steps (
    id, user_id, recipe_id, instruction, timer_seconds, sort_order
  )
  values
    ('50000000-0000-4000-8000-000000000001', seed_user, '30000000-0000-4000-8000-000000000001', 'Cook the pasta until just al dente, reserving a little pasta water.', 600, 0),
    ('50000000-0000-4000-8000-000000000002', seed_user, '30000000-0000-4000-8000-000000000001', 'Brown the mushrooms, then add garlic and cook until fragrant.', 420, 1),
    ('50000000-0000-4000-8000-000000000003', seed_user, '30000000-0000-4000-8000-000000000001', 'Add cream and pasta, loosen with pasta water, and finish with parmesan.', 300, 2),
    ('50000000-0000-4000-8000-000000000004', seed_user, '30000000-0000-4000-8000-000000000002', 'Soften the onion in a large pot, then add carrot and potato.', 480, 0),
    ('50000000-0000-4000-8000-000000000005', seed_user, '30000000-0000-4000-8000-000000000002', 'Add stock and water, simmer until every vegetable is tender.', 1500, 1),
    ('50000000-0000-4000-8000-000000000006', seed_user, '30000000-0000-4000-8000-000000000002', 'Rest briefly, taste, and season before serving.', 300, 2),
    ('50000000-0000-4000-8000-000000000007', seed_user, '30000000-0000-4000-8000-000000000003', 'Cook the rice according to its package directions.', 1200, 0),
    ('50000000-0000-4000-8000-000000000008', seed_user, '30000000-0000-4000-8000-000000000003', 'Cook the chicken until browned and cooked through, then glaze with soy sauce.', 720, 1),
    ('50000000-0000-4000-8000-000000000009', seed_user, '30000000-0000-4000-8000-000000000003', 'Divide rice between bowls and top with chicken and cucumber.', null, 2),
    ('50000000-0000-4000-8000-000000000010', seed_user, '30000000-0000-4000-8000-000000000004', 'Blend the banana, oats, eggs, and milk into a thick batter.', null, 0),
    ('50000000-0000-4000-8000-000000000011', seed_user, '30000000-0000-4000-8000-000000000004', 'Cook small pancakes over medium-low heat until golden on both sides.', 600, 1),
    ('50000000-0000-4000-8000-000000000012', seed_user, '30000000-0000-4000-8000-000000000005', 'Combine the tomato, cucumber, feta, and olives in a wide bowl.', null, 0),
    ('50000000-0000-4000-8000-000000000013', seed_user, '30000000-0000-4000-8000-000000000005', 'Drizzle with olive oil, toss gently, and rest before serving.', 300, 1)
  on conflict (id) do nothing;

  insert into public.recipe_tags (id, user_id, recipe_id, tag_id)
  values
    ('60000000-0000-4000-8000-000000000001', seed_user, '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
    ('60000000-0000-4000-8000-000000000002', seed_user, '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003'),
    ('60000000-0000-4000-8000-000000000003', seed_user, '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001'),
    ('60000000-0000-4000-8000-000000000004', seed_user, '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003'),
    ('60000000-0000-4000-8000-000000000005', seed_user, '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001'),
    ('60000000-0000-4000-8000-000000000006', seed_user, '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002'),
    ('60000000-0000-4000-8000-000000000007', seed_user, '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001'),
    ('60000000-0000-4000-8000-000000000008', seed_user, '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004')
  on conflict (id) do nothing;

  insert into public.pantry_items (
    id, user_id, ingredient_id, quantity, unit, storage_location,
    expiration_date, low_stock, notes
  )
  values
    ('70000000-0000-4000-8000-000000000001', seed_user, '10000000-0000-4000-8000-000000000015', 4, 'piece', 'counter', null, false, 'Ripe bananas'),
    ('70000000-0000-4000-8000-000000000002', seed_user, '10000000-0000-4000-8000-000000000016', 500, 'g', 'pantry', null, false, null),
    ('70000000-0000-4000-8000-000000000003', seed_user, '10000000-0000-4000-8000-000000000017', 6, 'piece', 'fridge', current_date + 8, false, null),
    ('70000000-0000-4000-8000-000000000004', seed_user, '10000000-0000-4000-8000-000000000018', 500, 'ml', 'fridge', current_date + 2, true, 'Expiring soon'),
    ('70000000-0000-4000-8000-000000000005', seed_user, '10000000-0000-4000-8000-000000000001', 400, 'g', 'pantry', null, false, null),
    ('70000000-0000-4000-8000-000000000006', seed_user, '10000000-0000-4000-8000-000000000002', 6, 'piece', 'fridge', current_date + 3, false, 'Unit intentionally incompatible with recipe grams'),
    ('70000000-0000-4000-8000-000000000007', seed_user, '10000000-0000-4000-8000-000000000004', 5, 'clove', 'pantry', null, false, null),
    ('70000000-0000-4000-8000-000000000008', seed_user, '10000000-0000-4000-8000-000000000023', 1, 'packet', 'pantry', null, false, 'Staple example')
  on conflict (id) do update
  set expiration_date = excluded.expiration_date, notes = excluded.notes;

  insert into public.cooking_history (
    id, user_id, recipe_id, cooked_at, servings, notes
  )
  values (
    '80000000-0000-4000-8000-000000000001',
    seed_user,
    '30000000-0000-4000-8000-000000000002',
    now() - interval '3 days',
    4,
    'Lovely on a rainy evening.'
  )
  on conflict (id) do nothing;

  raise notice 'Nana''s Recipes development data seeded for user %.', seed_user;
end
$seed$;
