# Shared household migration and cover import

## Architecture

`20260726113040_shared_household_cookbook.sql` adds one primary
`public.cookbooks` row and one `public.cookbook_members` row for each allowlisted
Google identity. Existing cookbook tables keep their composite foreign keys and
their `user_id` columns, but `user_id` now stores the cookbook's canonical data
owner. `private.current_user_id()` resolves every enrolled member to that same
canonical owner.

This compatibility layer avoids copying recipes per member and lets the
existing transactional RPCs continue to operate on one underlying data set.
Profiles remain per Google account. Cookbook settings, recipes, ingredients,
pantry, shopping list, cooking history, and image metadata are shared.

RLS still requires the signed Google provider claim and private email allowlist.
Membership policies then require the caller to belong to the cookbook whose
canonical owner is stored on the row. New private Storage objects use the
cookbook UUID as their first path segment. Existing member-UUID paths remain
readable and removable so the migration does not rename or duplicate objects.

## Data migration safety

Before changing an owner ID, the migration copies every cookbook row to
`private.household_merge_backup` with migration version `20260726113040`.
Application roles have no access to that table.

The migration:

1. Chooses the allowlisted Google owner with the most recipes as the canonical
   data owner, with stable creation-time and UUID tie-breakers.
2. Refuses to continue if normalized recipe slugs, ingredient identities, tag
   identities, or a self-conflicting legacy share are ambiguous.
3. Defers composite foreign keys, consolidates all owner IDs in one
   transaction, and preserves primary IDs and relationship IDs.
4. Deterministically merges only active pantry or shopping rows whose identity
   becomes identical after consolidation.
5. Preserves the canonical settings row and keeps removed member preference
   snapshots in the private backup.
6. Replaces per-user RLS and Storage policies with cookbook-membership checks.

Apply the file with the Supabase CLI or another migration runner that wraps the
file in one transaction. If a remote migration API executes statements
individually, inspect `supabase_migrations.schema_migrations`, the three image
constraints, cookbook/member counts, and `private.household_merge_backup`
before retrying; an API error can otherwise hide a completed statement batch.

## Fifteen cover matches

All source files are 1254 × 1254 PNGs. The visible food, normalized filename,
recipe title, and existing recipe context agree for every row. Each file was
processed through the existing safe decoder, metadata removal, bounded resize,
and WebP encoder. The resulting 12-character content hash exactly matches the
hash already present in the corresponding private production object path.

| Source image                               | Shared recipe                     | Visual confirmation                                | WebP hash      | Confidence |
| ------------------------------------------ | --------------------------------- | -------------------------------------------------- | -------------- | ---------- |
| `01_borovnicevi_mafini.png`                | Borovničevi mafini                | Blueberry muffins                                  | `541d0d2bdea3` | Exact      |
| `02_kvaseni_rogljicki_z_marmelado.png`     | Kvašeni rogljički z marmelado     | Jam-filled crescent rolls                          | `28e4362eb6bd` | Exact      |
| `03_testo_za_pico.png`                     | Testo za pico                     | Pizza dough beside a baked pizza                   | `103a2d518035` | Exact      |
| `04_sirove_strucke.png`                    | Sirove štručke                    | Baked cheese rolls                                 | `33e84c50e271` | Exact      |
| `05_slivova_pita.png`                      | Slivova pita                      | Open plum tart                                     | `fd427c1cffca` | Exact      |
| `06_jabolcna_pita.png`                     | Jabolčna pita                     | Sliced covered apple pie                           | `7b6636633e1e` | Exact      |
| `07_orehova_in_makova_potica.png`          | Orehova in makova potica          | Walnut and poppy-seed rolled loaves                | `01dcf2762b6f` | Exact      |
| `08_limonini_razpokancki.png`              | Limonini razpokančki              | Powdered lemon crinkle cookies                     | `5c21fbd97414` | Exact      |
| `09_mafini_s_pomaranco_in_cokolado.png`    | Mafini s pomarančo in čokolado    | Orange and chocolate muffins                       | `0a856221a3c7` | Exact      |
| `10_rahlo_pecivo.png`                      | Rahlo pecivo                      | Light sponge squares with chocolate glaze          | `7b5066fdde4e` | Exact      |
| `11_visnjevo_pecivo.png`                   | Višnjevo pecivo                   | Cherry sponge squares                              | `47b48bbcce49` | Exact      |
| `12_pijana_nevesta.png`                    | Pijana nevesta                    | Layered chocolate, custard, banana, and cream cake | `701ccd105048` | Exact      |
| `13_browniji.png`                          | Browniji                          | Chocolate brownies with berries                    | `215238f8be2c` | Exact      |
| `14_skutne_kocke_z_limono_in_jagodami.png` | Skutne kocke z limono in jagodami | Curd squares with strawberry topping               | `d5b9dddeef91` | Exact      |
| `15_marry_me_piscanec.png`                 | Marry Me Piščanec                 | Creamy chicken, tomato, and pasta skillet          | `75dc838a61c1` | Exact      |

`pnpm covers:import -- --archive <zip>` is dry-run by default. Add `--apply`
only for an administrative environment that has server-only `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. The script matches exact normalized titles/slugs,
uses content-addressed cookbook paths, skips recipes with covers, checks for an
existing object, and updates a recipe only when its image path is still null.
Running it twice therefore does not create duplicate recipes or images.

## Deployment

1. Take a Supabase database backup and confirm Storage recovery is available.
2. Confirm `OWNER_EMAILS` in the application includes every existing owner plus
   `vukovic.nadia7@gmail.com`, then deploy the membership-aware application.
3. Apply migrations through
   `20260726113040_shared_household_cookbook.sql`.
4. Verify `get_cookbook_context()`, cross-owner recipe CRUD, private image
   reads, and non-member denial.
5. Run Supabase database and security advisors and review any private-schema
   findings separately.

## Recovery and rollback

With a transactional migration runner, an apply-time failure needs no cleanup.
After any remote API error, audit the recorded migration and the objects listed
above before deciding whether cleanup is needed. For a post-deployment problem,
prefer a forward-fix migration while keeping the membership-aware application
deployed.

Do not roll back only the application to a version that creates user-prefixed
uploads; the shared Storage insert policy requires cookbook-prefixed paths.
For a full rollback, restore the pre-migration Supabase database snapshot and
its matching Storage state, then deploy the previous application. The
`private.household_merge_backup` table is a row-level recovery aid, not a
replacement for a complete database and Storage backup.
