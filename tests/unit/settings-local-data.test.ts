import { describe, expect, it } from "vitest";

import {
  clearLocalCookbookData,
  migrateLegacyLocalStorage,
} from "@/features/settings/local-data";

function memoryStorage(entries: Record<string, string>) {
  const values = new Map(Object.entries(entries));
  return {
    get length() {
      return values.size;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    keys() {
      return [...values.keys()];
    },
  };
}

describe("clearLocalCookbookData", () => {
  it("removes drafts, cooking sessions, and checklists only", () => {
    const storage = memoryStorage({
      "nanas-recipes:recipe-draft:new": "draft",
      "nanas-recipes:cooking-session:v1:recipe": "session",
      "nanas-recipes:cooking-checklist:recipe": "checklist",
      "nanas-recipes:reduce-motion": "true",
      "another-app:key": "keep",
    });

    expect(clearLocalCookbookData(storage)).toEqual([
      "nanas-recipes:recipe-draft:new",
      "nanas-recipes:cooking-session:v1:recipe",
      "nanas-recipes:cooking-checklist:recipe",
    ]);
    expect(storage.keys()).toEqual([
      "nanas-recipes:reduce-motion",
      "another-app:key",
    ]);
  });
});

describe("migrateLegacyLocalStorage", () => {
  it("moves every legacy Menta value without overwriting newer Nana's data", () => {
    const storage = memoryStorage({
      "menta:recipe-draft:new": "legacy draft",
      "menta:cooking-session:v1:recipe": "session",
      "menta:reduce-motion": "true",
      "nanas-recipes:recipe-draft:new": "newer draft",
      "another-app:key": "keep",
    });

    expect(migrateLegacyLocalStorage(storage)).toEqual([
      "nanas-recipes:cooking-session:v1:recipe",
      "nanas-recipes:reduce-motion",
    ]);
    expect(storage.getItem("nanas-recipes:recipe-draft:new")).toBe(
      "newer draft",
    );
    expect(storage.getItem("nanas-recipes:cooking-session:v1:recipe")).toBe(
      "session",
    );
    expect(storage.getItem("menta:recipe-draft:new")).toBeNull();
    expect(storage.getItem("another-app:key")).toBe("keep");
  });

  it("is safe to run more than once", () => {
    const storage = memoryStorage({
      "menta:cooking-checklist:recipe": "checked",
    });

    expect(migrateLegacyLocalStorage(storage)).toHaveLength(1);
    expect(migrateLegacyLocalStorage(storage)).toEqual([]);
    expect(storage.getItem("nanas-recipes:cooking-checklist:recipe")).toBe(
      "checked",
    );
  });
});
