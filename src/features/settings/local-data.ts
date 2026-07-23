export const LOCAL_STORAGE_PREFIX = "nanas-recipes:";
export const REDUCE_MOTION_STORAGE_KEY = `${LOCAL_STORAGE_PREFIX}reduce-motion`;
const STORAGE_MIGRATION_KEY = `${LOCAL_STORAGE_PREFIX}storage-migration:v1`;
const LEGACY_STORAGE_PREFIX = "menta:";

const COOKBOOK_STORAGE_PREFIXES = [
  `${LOCAL_STORAGE_PREFIX}recipe-draft:`,
  `${LOCAL_STORAGE_PREFIX}cooking-session:`,
  `${LOCAL_STORAGE_PREFIX}cooking-checklist:`,
  `${LEGACY_STORAGE_PREFIX}recipe-draft:`,
  `${LEGACY_STORAGE_PREFIX}cooking-session:`,
  `${LEGACY_STORAGE_PREFIX}cooking-checklist:`,
] as const;

interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function localStorageKey(suffix: string): string {
  return `${LOCAL_STORAGE_PREFIX}${suffix}`;
}

/**
 * Preserve browser-only drafts, cooking progress, checklists, and preferences
 * created before the Nana's Recipes rename. Existing Nana's keys always win,
 * so a stale legacy value can never overwrite newer data.
 */
export function migrateLegacyLocalStorage(storage: StorageLike): string[] {
  if (storage.getItem(STORAGE_MIGRATION_KEY) === "complete") return [];

  const legacyKeys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter(
    (key): key is string =>
      key !== null && key.startsWith(LEGACY_STORAGE_PREFIX),
  );
  const migrated: string[] = [];

  for (const legacyKey of legacyKeys) {
    const value = storage.getItem(legacyKey);
    if (value === null) continue;
    const targetKey = `${LOCAL_STORAGE_PREFIX}${legacyKey.slice(
      LEGACY_STORAGE_PREFIX.length,
    )}`;
    if (storage.getItem(targetKey) === null) {
      storage.setItem(targetKey, value);
      migrated.push(targetKey);
    }
    storage.removeItem(legacyKey);
  }

  storage.setItem(STORAGE_MIGRATION_KEY, "complete");
  return migrated;
}

/** Remove local recipe content while retaining display-only preferences. */
export function clearLocalCookbookData(storage: StorageLike): string[] {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => Boolean(key));
  const removed = keys.filter((key) =>
    COOKBOOK_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
  removed.forEach((key) => storage.removeItem(key));
  return removed;
}
