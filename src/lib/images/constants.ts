export const MAX_IMAGE_UPLOAD_BYTES = 6 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_IMAGE_DIMENSION = 2_560;
export const COVER_WEBP_QUALITY = 82;
export const RECIPE_IMAGE_BUCKET = "recipe-images";
export const RECIPE_IMAGE_CACHE_SECONDS = 60 * 60 * 24 * 30;

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedImageMimeType =
  (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];
