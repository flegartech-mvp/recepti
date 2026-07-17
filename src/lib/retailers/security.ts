import { isIP } from "node:net";

const PRIVATE_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "::1",
]);

function isPrivateIp(hostname: string): boolean {
  if (!isIP(hostname)) return false;
  return (
    /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      hostname,
    ) ||
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:")
  );
}

export function isSafeRetailerSourceUrl(
  value: string,
  allowedHosts: readonly string[],
): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLocaleLowerCase("en-US");
    if (
      url.protocol !== "https:" ||
      PRIVATE_HOSTS.has(hostname) ||
      isPrivateIp(hostname)
    )
      return false;
    return allowedHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export function sanitizeCsvCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

const signatures = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
} as const;

export function validateRetailerImageBytes(
  bytes: Uint8Array,
  mime: string,
  maximumBytes = 5 * 1024 * 1024,
): boolean {
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes) return false;
  const signature = signatures[mime as keyof typeof signatures];
  if (!signature || !signature.every((byte, index) => bytes[index] === byte))
    return false;
  if (mime === "image/webp")
    return String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return true;
}
