import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

type Options = {
  container?: string;
  dryRun: boolean;
  help: boolean;
  userId?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTAINER_PATTERN = /^[a-zA-Z0-9_.-]+$/;

function printHelp() {
  console.log(`Menta local development seed

Usage:
  pnpm db:seed
  pnpm db:seed -- --user <auth-user-uuid>
  pnpm db:seed -- --container <supabase-postgres-container>
  pnpm db:seed -- --dry-run
  pnpm db:seed -- --help

This command applies supabase/seed.sql to a running LOCAL Supabase Postgres
container. It never connects to a hosted project and never uses a service-role
key. The seed is idempotent, but a local Auth user/profile must exist first.

Options:
  --user <uuid>       Seed a specific local Auth user. Otherwise the oldest
                      local profile is selected by supabase/seed.sql.
  --container <name>  Select a container when more than one local Supabase
                      project is running.
  --dry-run           Validate arguments and print the intended operation.
  -h, --help          Show this help.

Optional development-data workflow:
  pnpm dlx supabase start
  pnpm dlx supabase db reset --local
  # Open http://127.0.0.1:54323, create a local Auth user, then:
  pnpm db:seed

Database smoke-test workflow (creates its own local-only test identity/data):
  pnpm dlx supabase start
  pnpm dlx supabase db reset --local
  pnpm test:db
`);
}

function parseArguments(args: string[]): Options {
  const options: Options = { dryRun: false, help: false };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "-h" || argument === "--help") {
      options.help = true;
      continue;
    }
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (argument === "--user" || argument === "--container") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      if (argument === "--user") options.userId = value;
      else options.container = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }

  if (options.userId && !UUID_PATTERN.test(options.userId)) {
    throw new Error("--user must be a valid UUID.");
  }
  if (options.container && !CONTAINER_PATTERN.test(options.container)) {
    throw new Error("--container contains unsupported characters.");
  }

  return options;
}

function runDocker(args: string[], input?: string) {
  return spawnSync("docker", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    input,
    stdio: input === undefined ? "pipe" : ["pipe", "inherit", "inherit"],
    windowsHide: true,
  });
}

function discoverContainer(explicitName?: string): string {
  if (explicitName) return explicitName;

  const result = runDocker(["ps", "--format", "{{.Names}}"]);
  if (result.error) {
    throw new Error(`Docker is unavailable: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = result.stderr.trim() || "Docker Desktop may not be running.";
    throw new Error(`Could not inspect local containers. ${detail}`);
  }

  const candidates = result.stdout
    .split(/\r?\n/u)
    .map((name) => name.trim())
    .filter((name) => name.startsWith("supabase_db_"));

  if (candidates.length === 0) {
    throw new Error(
      "No local Supabase database is running. Run `pnpm dlx supabase start` first.",
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      `Multiple local Supabase databases are running (${candidates.join(", ")}). ` +
        "Choose one with --container <name>.",
    );
  }

  return candidates[0];
}

function queryLocalDatabase(container: string, sql: string): string {
  const result = runDocker([
    "exec",
    container,
    "psql",
    "--username",
    "postgres",
    "--dbname",
    "postgres",
    "--tuples-only",
    "--no-align",
    "--no-psqlrc",
    "--command",
    sql,
  ]);

  if (result.error)
    throw new Error(`Could not run local psql: ${result.error.message}`);
  if (result.status !== 0) {
    const detail =
      result.stderr.trim() || "The local schema may not be migrated.";
    throw new Error(`Local database preflight failed. ${detail}`);
  }
  return result.stdout.trim();
}

function requireSeedProfile(container: string, userId?: string) {
  const predicate = userId ? ` where user_id = '${userId}'::uuid` : "";
  const count = Number(
    queryLocalDatabase(
      container,
      `select count(*) from public.profiles${predicate};`,
    ),
  );

  if (!Number.isFinite(count) || count < 1) {
    const target = userId ? ` for ${userId}` : "";
    throw new Error(
      `No local profile exists${target}. Open local Studio (normally ` +
        "http://127.0.0.1:54323), create an Auth user, then run this command again.",
    );
  }
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const seedPath = resolve(process.cwd(), "supabase", "seed.sql");
  if (!existsSync(seedPath))
    throw new Error(`Seed file not found: ${seedPath}`);

  if (options.dryRun) {
    console.log(
      "Dry run: would apply supabase/seed.sql to a local Supabase database.",
    );
    console.log(
      `Container: ${options.container ?? "auto-detect the only supabase_db_* container"}`,
    );
    console.log(`Auth user: ${options.userId ?? "oldest local profile"}`);
    console.log("Remote connections and service-role keys are not used.");
    return;
  }

  const container = discoverContainer(options.container);
  requireSeedProfile(container, options.userId);

  const seedSql = readFileSync(seedPath, "utf8");
  const userSetting = options.userId
    ? `set app.seed_user_id = '${options.userId}';\n`
    : "";
  const result = runDocker(
    [
      "exec",
      "--interactive",
      container,
      "psql",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
      "--set",
      "ON_ERROR_STOP=1",
      "--no-psqlrc",
    ],
    `${userSetting}${seedSql}`,
  );

  if (result.error)
    throw new Error(`Seed execution failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      `Seed execution exited with status ${result.status ?? "unknown"}.`,
    );
  }

  console.log(
    `Menta development data applied to local container ${container}.`,
  );
  console.log("No hosted database or service-role key was used.");
}

try {
  main();
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unknown seed failure.";
  console.error(`Menta seed failed: ${message}`);
  console.error("Run `pnpm db:seed -- --help` for setup instructions.");
  process.exitCode = 1;
}
