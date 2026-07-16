const COOKBOOK_STORAGE_PREFIXES = [
  "menta:recipe-draft:",
  "menta:cooking-session:",
  "menta:cooking-checklist:",
] as const;

interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
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
