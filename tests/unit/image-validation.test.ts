import { describe, expect, it } from "vitest";
import sharp from "sharp";

import {
  InvalidImageError,
  matchesImageSignature,
  processRecipeCover,
} from "@/lib/images/validation";

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

  it("decodes, resizes, and re-encodes a cover as metadata-free WebP", async () => {
    const source = await sharp({
      create: {
        width: 3_000,
        height: 2_000,
        channels: 3,
        background: "#2f63b8",
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await processRecipeCover(source, "image/jpeg");
    const metadata = await sharp(result.bytes).metadata();

    expect(result.mimeType).toBe("image/webp");
    expect(Math.max(result.width, result.height)).toBe(2_560);
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
  });

  it("rejects content that cannot be decoded despite a plausible signature", async () => {
    await expect(
      processRecipeCover(
        new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00]),
        "image/jpeg",
      ),
    ).rejects.toBeInstanceOf(InvalidImageError);
  });
});
