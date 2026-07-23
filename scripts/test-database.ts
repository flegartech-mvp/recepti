import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

function docker(args: string[], input?: string) {
  return spawnSync("docker", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    input,
    stdio: input === undefined ? "pipe" : ["pipe", "inherit", "inherit"],
    windowsHide: true,
  });
}

function main() {
  const testPath = resolve(
    process.cwd(),
    "tests",
    "integration",
    "database-smoke.sql",
  );
  const seedPath = resolve(process.cwd(), "supabase", "seed.sql");
  if (!existsSync(testPath))
    throw new Error(`Database test not found: ${testPath}`);
  if (!existsSync(seedPath))
    throw new Error(`Database seed not found: ${seedPath}`);

  const containers = docker(["ps", "--format", "{{.Names}}"]);
  if (containers.error) throw containers.error;
  if (containers.status !== 0)
    throw new Error(containers.stderr.trim() || "Docker is unavailable.");
  const matches = containers.stdout
    .split(/\r?\n/u)
    .map((name) => name.trim())
    .filter((name) => name.startsWith("supabase_db_"));
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? "Start the local Supabase stack before running database tests."
        : "Stop other local Supabase projects so exactly one database is running.",
    );
  }

  const result = docker(
    [
      "exec",
      "--interactive",
      matches[0],
      "psql",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
      "--no-psqlrc",
    ],
    `
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'owner@example.test', '', now(),
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{"full_name":"Nana''s Recipes Owner"}'::jsonb,
  now(), now()
) on conflict (id) do nothing;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'visitor@example.test', '', now(),
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{"full_name":"Private Visitor"}'::jsonb,
  now(), now()
) on conflict (id) do nothing;
select private.configure_owner_email('owner@example.test');
set app.seed_user_id = '00000000-0000-4000-8000-000000000001';
${readFileSync(seedPath, "utf8")}
${readFileSync(testPath, "utf8")}
`,
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Database smoke tests exited with status ${result.status}.`,
    );
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Database smoke tests failed.",
  );
  process.exitCode = 1;
}
