import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workerPath = resolve(process.cwd(), "public", "sw.js");
const source = readFileSync(workerPath, "utf8");

if (!source.includes('CACHE_NAME = "nanas-recipes-static-v2"'))
  throw new Error("The service-worker cache version was not updated.");
if (/menta/iu.test(source))
  throw new Error("The service worker still contains legacy Menta branding.");
if (
  source.includes('"/offline"') &&
  !existsSync(resolve(process.cwd(), "src", "app", "offline", "page.tsx"))
)
  throw new Error("Service worker references the missing /offline route.");

const publicAssetPaths = [
  ...source.matchAll(/["'](\/(?:images\/[^"']+|icon|apple-icon))["']/gu),
].map((match) => match[1]);

for (const assetPath of new Set(publicAssetPaths)) {
  if (assetPath === "/icon" || assetPath === "/apple-icon") continue;
  const filePath = resolve(process.cwd(), "public", assetPath.slice(1));
  if (!existsSync(filePath))
    throw new Error(`Service worker references a missing asset: ${assetPath}`);
}

console.log(
  `Service worker valid: ${new Set(publicAssetPaths).size} explicit public assets.`,
);
