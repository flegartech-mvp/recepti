import { describe, expect, it } from "vitest";

import { isSafeExternalUrl, safeExternalUrlSchema } from "@/lib/validation/url";

describe("safe external URLs", () => {
  it("accepts public http and https recipe sources", () => {
    expect(isSafeExternalUrl("https://example.com/recipes/soup?lang=sl")).toBe(
      true,
    );
    expect(isSafeExternalUrl("http://recipes.example.org/path")).toBe(true);
    expect(safeExternalUrlSchema.safeParse("https://example.com").success).toBe(
      true,
    );
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,bad",
    "ftp://example.com/file",
    "//example.com/path",
    "https://user:secret@example.com",
    "http://localhost:3000",
    "http://127.0.0.1/admin",
    "http://10.0.0.1",
    "http://192.168.1.1",
    "http://[::1]/",
    "https://printer.local",
    " https://example.com",
  ])("rejects unsafe or non-external URL %s", (url) => {
    expect(isSafeExternalUrl(url)).toBe(false);
  });
});
