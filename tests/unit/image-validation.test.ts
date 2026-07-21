import { describe, expect, it } from "vitest";

import { matchesImageSignature } from "@/lib/images/validation";

describe("image signature validation", () => {
  it("accepts the supported container signatures", () => {
    expect(
      matchesImageSignature(
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
        "image/jpeg",
      ),
    ).toBe(true);
    expect(
      matchesImageSignature(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png",
      ),
    ).toBe(true);
    expect(
      matchesImageSignature(
        new TextEncoder().encode("RIFF0000WEBP"),
        "image/webp",
      ),
    ).toBe(true);
  });

  it("rejects a renamed or mislabeled payload", () => {
    expect(
      matchesImageSignature(
        new TextEncoder().encode("not really an image"),
        "image/png",
      ),
    ).toBe(false);
    expect(
      matchesImageSignature(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        "image/jpeg",
      ),
    ).toBe(false);
  });
});
