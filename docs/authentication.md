# Authentication and owner authorization

Nana's Recipes uses Google OAuth through Supabase Auth, the current `@supabase/ssr`
cookie pattern, a server-only owner allowlist, and PostgreSQL row-level security.
These are complementary controls:

- `OWNER_EMAIL` decides which Google address may enter this private deployment.
- Server Components, Server Actions, and Route Handlers re-check the verified
  user and its signed Google provider metadata before protected work.
- Restrictive RLS requires the same allowlisted email and Google claim, then
  ensures the identity can access only rows whose `user_id` equals `auth.uid()`.

The browser receives the Supabase project URL and publishable/anon key. It never
receives `OWNER_EMAIL`, a database password, or a Supabase secret/service-role
key.

## Request flow

```mermaid
sequenceDiagram
  participant Browser
  participant Nana as Nana's Recipes server
  participant Supabase as Supabase Auth
  participant Google

  Browser->>Nana: Owner sign in with Google
  Nana->>Supabase: signInWithOAuth(redirectTo=/auth/callback)
  Supabase->>Google: OAuth authorization
  Google->>Supabase: authorization response
  Supabase->>Browser: redirect with PKCE code
  Browser->>Nana: GET /auth/callback?code=...
  Nana->>Supabase: exchangeCodeForSession(code)
  Supabase-->>Nana: cookie-backed session and verified user
  Nana->>Nana: require Google provider; normalize email and compare OWNER_EMAIL
  alt owner
    Nana-->>Browser: redirect to safe internal destination
  else different account
    Nana-->>Browser: redirect to /private
  end
```

`src/proxy.ts` refreshes Supabase cookies with `getClaims()` on applicable
requests. Protected layouts and mutation boundaries call `requireOwner()`;
client-side visibility is never the only authorization check.

The requested post-login destination is accepted only when it is a relative
internal path. Protocol-relative URLs, backslashes, and external origins fall
back to `/dashboard`.

## Required environment

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-client-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OWNER_EMAIL=owner@example.com
```

`OWNER_EMAIL` comparison uses Unicode NFKC normalization, trimming, and
locale-stable lowercasing. Configure the same address the intended Google
account returns. Do not prefix it with `NEXT_PUBLIC_`.

`NEXT_PUBLIC_SITE_URL` must be an origin without a path. A trailing slash is
removed by the application. In Vercel Preview, omit a static production value
so the code can fall back to that deployment's `VERCEL_URL`, or assign an exact
stable preview origin for the branch.

## Two different callback URLs

OAuth setup involves two callbacks that are easy to confuse:

1. **Google -> Supabase Auth callback**: entered in Google Cloud as an
   authorized redirect URI.
2. **Supabase Auth -> Nana's Recipes callback**: entered in Supabase Auth's redirect
   allow list and passed by Nana's Recipes as `redirectTo`.

For a hosted project named `<project-ref>`:

```text
Google authorized redirect URI:
https://<project-ref>.supabase.co/auth/v1/callback

Nana's Recipes application callback:
https://your-app.example/auth/callback
```

Do not put `/auth/callback` from the Next.js application into Google's
authorized redirect URI field. Google returns to Supabase first; Supabase then
returns to Nana's Recipes.

## Configure Google OAuth for hosted Supabase

The current Supabase guide calls these areas Google Auth Platform and Supabase
Auth Providers; dashboard labels may move without changing the values.

1. Create or select a Google Cloud project.
2. In Google Auth Platform, configure Branding, Audience, and Data Access.
3. For a private cookbook, keep the app in Testing and add only the owner as a
   test user, or otherwise restrict the audience appropriately.
4. Ensure the scopes include `openid`, email, and profile. Nana's Recipes does not need
   Google Drive, Contacts, Calendar, or other sensitive scopes.
5. Create an OAuth client of type **Web application**.
6. Add exact application origins under Authorized JavaScript origins:

   ```text
   http://localhost:3000
   https://your-production-domain.example
   ```

7. Add the Supabase callback under Authorized redirect URIs:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

8. Copy the Google Client ID and Client Secret into Supabase Dashboard ->
   Authentication -> Providers -> Google, then enable the provider.
9. In Authentication -> Providers -> Email, disable Email sign-ins/signups for
   this Google-only application. Do not add password, magic-link, phone, or
   anonymous login paths.

Provider configuration is defense in depth: both the Next.js authorization
boundary and `private.is_app_owner()` inspect Supabase's signed
`app_metadata.provider/providers` claim and require Google. A password token
using the allowlisted address is still rejected if Email auth is accidentally
re-enabled.

Google does not allow a useful wildcard for arbitrary Vercel preview origins.
Because Nana's Recipes uses the Supabase-hosted redirect URI, preview deployments do not
need a preview-specific Google redirect URI. If Google requires a JavaScript
origin for a preview workflow, use an exact stable preview/branch domain rather
than adding every commit URL.

Official reference: [Supabase Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Configure Supabase URL allowlists

In Supabase Dashboard -> Authentication -> URL Configuration:

- Set **Site URL** to the canonical production origin.
- Add exact local and production application callbacks.
- Add the Vercel preview pattern only if previews must authenticate.

Recommended entries:

```text
http://localhost:3000/auth/callback
https://your-production-domain.example/auth/callback
https://*-<team-or-account-slug>.vercel.app/**
```

The preview glob follows Supabase's documented Vercel pattern. Production
should use an exact URL rather than a wildcard. Keep the allow list as narrow as
the workflow permits.

Official reference: [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Local Supabase Google provider

When the application uses a local Supabase stack rather than a hosted project,
Google must return to the local Auth service:

```text
http://127.0.0.1:54321/auth/v1/callback
```

This repository already includes `supabase/config.toml`. For interactive local
Google login, first make its application redirect values match the hostname
used by Next.js:

```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]

[auth.email]
enable_signup = false
```

Then enable the provider without committing its secret:

```toml
[auth.external.google]
enabled = true
client_id = "your-google-web-client-id"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
skip_nonce_check = false
```

Provide the secret to the Supabase CLI environment. An untracked root `.env`
is one practical local option because this repository ignores `.env*` files:

```dotenv
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Restart the local stack after provider changes:

```bash
pnpm exec supabase stop
pnpm exec supabase start
```

The Next.js `.env.local` then uses the local project URL and publishable/anon
key printed by `pnpm exec supabase status`. Keep `NEXT_PUBLIC_SITE_URL` on the
same `http://localhost:3000` origin configured above. Never expose the local
Supabase stack to a public network.

After signing in once through the configured local Google provider, run the
strict owner configuration from Studio's SQL editor using the same email as
local `OWNER_EMAIL`. A user created with Studio's Email form is intentionally
ineligible and will not receive a Nana's Recipes profile:

```sql
select private.configure_owner_email('owner@example.test');
```

`pnpm test:db` performs this step automatically for its isolated test identity.

## Environment URL matrix

| Environment                 | `NEXT_PUBLIC_SITE_URL`                                        | Supabase application redirect allowlist        | Google redirect URI                       |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Local app + hosted Supabase | `http://localhost:3000`                                       | `http://localhost:3000/auth/callback`          | Hosted Supabase `/auth/v1/callback`       |
| Local app + local Supabase  | `http://localhost:3000`                                       | Local config permits Nana's Recipes callback   | `http://127.0.0.1:54321/auth/v1/callback` |
| Vercel Preview              | Omit for dynamic `VERCEL_URL`, or exact stable preview origin | Narrow Vercel preview glob or exact branch URL | Hosted Supabase `/auth/v1/callback`       |
| Production                  | Exact `https://...` production origin                         | Exact production `/auth/callback`              | Hosted Supabase `/auth/v1/callback`       |

## Authorization states

| State                                                   | Result                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| No valid session                                        | Public landing page; protected routes redirect to `/?next=...`             |
| Verified Google session and email matches `OWNER_EMAIL` | Owner routes and mutations are available                                   |
| Non-Google session or a different email                 | `/private` explains the cookbook is private and offers sign-out            |
| Supabase public environment missing                     | Landing page shows setup guidance; sign-in routes to a configuration error |
| `OWNER_EMAIL` missing after sign-in                     | The authenticated account is denied rather than implicitly trusted         |

The database cannot read a Vercel environment variable directly. After applying
the migrations, configure the same address once from the Supabase SQL editor:

```sql
select private.configure_owner_email('owner@example.com');
```

Migration 008 combines that private JWT-email allowlist, the signed Google
provider claim, and per-identity row ownership. A non-owner or non-Google
authenticated session therefore cannot read the owner's rows, create its own
Nana's Recipes rows, execute owner workflows, or upload into the private recipe bucket.
If the SQL value and `OWNER_EMAIL` drift, access fails closed until they are
made identical.

The owner can verify both layers without revealing either configured value at
`/settings/diagnostics`. The page also checks the Google provider, required
tables and RPCs, migration-dependent contracts, RLS, and private Storage
access. Logged-out and non-owner identities are redirected before diagnostics
run.

## Test-only authentication

`E2E_TEST_MODE=1` enables deterministic cookie-backed test identities only when
the process is not production. The cookie `nanas-recipes-e2e-role` may represent
`owner` or `denied`; otherwise the test user is signed out.

Never set `E2E_TEST_MODE` in Vercel Development, Preview, or Production
configuration. The code additionally requires non-production `NODE_ENV`, no
`VERCEL=1`, and no `VERCEL_ENV`, but omission is the primary operational
safeguard. The test path does not alter production Google OAuth or RLS.

## Security checklist

- Keep the Google client secret only in Google/Supabase configuration, never in
  browser variables or Git.
- Keep Email, phone, and anonymous authentication disabled; Google is Nana's Recipes'
  only supported identity provider.
- Use only the Supabase publishable/anon client key in
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Do not add a service-role key for ordinary CRUD, seeding, or deployment.
- Keep `private.configure_owner_email(...)` identical to `OWNER_EMAIL`.
- Keep RLS enabled and apply every migration before deploying application code.
- Keep production and preview redirect allowlists narrower than `https://**`.
- Leave recipe visibility/share metadata owner-only until recipient RLS and UI
  are deliberately implemented and tested.
- Rotate the Google secret and Supabase keys if they are ever exposed.
- Verify logout, expired-session handling, the denied-account page, and a direct
  cross-user database request before launch.

## Troubleshooting

### Google reports `redirect_uri_mismatch`

Compare the URI character-for-character with the callback shown on Supabase's
Google provider page. For hosted Supabase it is normally
`https://<project-ref>.supabase.co/auth/v1/callback`, not the Next.js callback.

### Supabase says the redirect is not allowed

Add the exact Nana's Recipes `/auth/callback` URL to Authentication -> URL Configuration.
For preview deployments, verify the Vercel account/team slug in the wildcard.

### Preview login returns to production

A production `NEXT_PUBLIC_SITE_URL` was probably assigned to the Preview
environment. Remove it from Preview and redeploy so `VERCEL_URL` is used, or set
an exact preview origin. Environment changes do not alter an existing
deployment.

### The correct Google account sees “This cookbook is private”

Check `OWNER_EMAIL` in the environment that built the deployment. Remove hidden
whitespace, confirm the Google account exposes an email, confirm its signed
Supabase `app_metadata` contains the Google provider, and redeploy after an
environment change.

### OAuth repeatedly returns to the login page

Confirm cookies are not blocked, the callback can exchange the code once, the
Supabase URL/key belong to the same project, and the deployment hostname is in
the redirect allow list. Inspect the `/auth/auth-code-error` reason and server
logs without logging tokens or authorization codes.
