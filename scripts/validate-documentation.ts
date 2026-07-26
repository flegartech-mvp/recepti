import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

const root = process.cwd();
const documentationFiles = [
  "README.md",
  "docs/authentication.md",
  "docs/database.md",
  "docs/deployment.md",
] as const;

function read(relativePath: string): string {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath))
    throw new Error(`Required documentation path is missing: ${relativePath}`);
  return readFileSync(absolutePath, "utf8");
}

const documentation = new Map(
  documentationFiles.map((path) => [path, read(path)]),
);
const readme = documentation.get("README.md")!;
const themeSource = read("src/lib/theme.ts");
const callbackSource = read("src/app/auth/callback/route.ts");
const authorizationSource = read("src/lib/auth/authorization.ts");
const packageJson = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
};

const migrations = readdirSync(resolve(root, "supabase", "migrations"))
  .filter((name) => /^\d{14}_.+\.sql$/u.test(name))
  .sort();
const latestMigration = migrations.at(-1);
if (!latestMigration)
  throw new Error("No timestamped Supabase migrations found.");
const latestMigrationName = latestMigration.slice(
  0,
  -extname(latestMigration).length,
);

const migrationClaims = [...documentation.values()].flatMap((source) => {
  const lines = source.split(/\r?\n/u);
  return lines.flatMap((line, index) => {
    const claimWindow = lines.slice(index, index + 3).join(" ");
    if (!/migration[\s\S]*?\bthrough\b/iu.test(claimWindow)) return [];
    return [...claimWindow.matchAll(/`(\d{14}_[^`]+?)(?:\.sql)?`/gu)].map(
      (match) => match[1],
    );
  });
});
if (migrationClaims.length === 0)
  throw new Error("Documentation does not declare the current migration head.");
for (const claim of migrationClaims) {
  if (claim !== latestMigrationName) {
    throw new Error(
      `Stale migration-head claim: ${claim}. Expected ${latestMigrationName}.`,
    );
  }
}

const appThemesMatch = themeSource.match(
  /export const APP_THEMES = \[([\s\S]*?)\] as const;/u,
);
if (!appThemesMatch)
  throw new Error("Could not derive supported themes from src/lib/theme.ts.");
const supportedThemes = [
  ...appThemesMatch[1].matchAll(/["']([^"']+)["']/gu),
].map((match) => match[1]);
if (!readme.includes(`${supportedThemes.length} theme choices`)) {
  throw new Error(
    `README must describe the ${supportedThemes.length} theme choices derived from APP_THEMES.`,
  );
}

const markdownLinkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu;
for (const [documentPath, source] of documentation) {
  for (const match of source.matchAll(markdownLinkPattern)) {
    const target = match[1].trim().split(/\s+["']/u)[0];
    if (
      !target ||
      target.startsWith("#") ||
      /^[a-z][a-z\d+.-]*:/iu.test(target)
    ) {
      continue;
    }
    const localTarget = decodeURIComponent(target.split("#")[0]);
    const absoluteTarget = resolve(root, dirname(documentPath), localTarget);
    if (!existsSync(absoluteTarget)) {
      throw new Error(
        `${documentPath} references a missing local file: ${target}`,
      );
    }
  }
}

const ignoredPnpmCommands = new Set(["dlx", "exec", "install"]);
for (const [documentPath, source] of documentation) {
  for (const match of source.matchAll(
    /(?:^|\n)\s*pnpm ([\w:-]+)|`pnpm ([\w:-]+)/gu,
  )) {
    const command = match[1] ?? match[2];
    if (
      ignoredPnpmCommands.has(command) ||
      Object.hasOwn(packageJson.scripts ?? {}, command)
    ) {
      continue;
    }
    throw new Error(
      `${documentPath} references missing package script: pnpm ${command}`,
    );
  }
}

if (
  !/if \(!isOwnerEmail\([\s\S]*?redirect\(new URL\("\/private"/u.test(
    callbackSource,
  ) ||
  !authorizationSource.includes(
    'if (state.status === "guest") redirect("/private")',
  )
) {
  throw new Error(
    "Non-owner authorization no longer consistently routes to /private.",
  );
}
const authDocumentation = documentation.get("docs/authentication.md")!;
if (
  !authDocumentation.includes("| Non-Google session or a different email") ||
  !authDocumentation.includes("`/private` explains the cookbook is private")
) {
  throw new Error(
    "Authentication documentation must describe the non-owner /private route.",
  );
}

console.log(
  [
    `Documentation valid: ${documentation.size} files checked.`,
    `Migration head: ${latestMigrationName}.`,
    `Theme choices: ${supportedThemes.length}.`,
    "Local links, package scripts, and non-owner auth routing are consistent.",
  ].join(" "),
);
