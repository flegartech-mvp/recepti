import sharp from "sharp";

import {
  COVER_WEBP_QUALITY,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  type SupportedImageMimeType,
} from "@/lib/images/constants";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** MIME and extension are user-controlled; inspect the container signature too. */
export function matchesImageSignature(
  bytes: Uint8Array,
  mimeType: string,
): boolean {
  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  if (mimeType === "image/png") {
    return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export class InvalidImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidImageError";
  }
}

export interface ProcessedImage {
  bytes: Buffer;
  width: number;
  height: number;
  mimeType: "image/webp";
  extension: "webp";
}

/**
 * Decode before upload, enforce a decompression-bomb ceiling, orient pixels,
 * resize oversized covers, and encode without carrying EXIF/GPS metadata.
 */
export async function processRecipeCover(
  input: Uint8Array,
  mimeType: SupportedImageMimeType,
): Promise<ProcessedImage> {
  if (!matchesImageSignature(input, mimeType)) {
    throw new InvalidImageError(
      "The file contents do not match the selected image type.",
    );
  }

  try {
    const decoder = sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
      sequentialRead: true,
    });
    const metadata = await decoder.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS
    ) {
      throw new InvalidImageError(
        "The image dimensions are missing or exceed the safe pixel limit.",
      );
    }

    const { data, info } = await decoder
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: COVER_WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return {
      bytes: data,
      width: info.width,
      height: info.height,
      mimeType: "image/webp",
      extension: "webp",
    };
  } catch (error) {
    if (error instanceof InvalidImageError) throw error;
    throw new InvalidImageError(
      "The image is corrupted, unsupported, or too large to decode safely.",
    );
  }
}
