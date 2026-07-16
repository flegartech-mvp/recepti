import { describe, expect, it } from "vitest";

import { clearLocalCookbookData } from "@/features/settings/local-data";

function memoryStorage(entries: Record<string, string>) {
  const values = new Map(Object.entries(entries));
  return {
    get length() {
      return values.size;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
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
      "menta:recipe-draft:new": "draft",
      "menta:cooking-session:v1:recipe": "session",
      "menta:cooking-checklist:recipe": "checklist",
      "menta:reduce-motion": "true",
      "another-app:key": "keep",
    });

    expect(clearLocalCookbookData(storage)).toEqual([
      "menta:recipe-draft:new",
      "menta:cooking-session:v1:recipe",
      "menta:cooking-checklist:recipe",
    ]);
    expect(storage.keys()).toEqual(["menta:reduce-motion", "another-app:key"]);
  });
});
