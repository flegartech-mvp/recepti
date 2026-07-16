import { z } from "zod";

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return false;
  }

  const octets = hostname.split(".").map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return true;
  }

  const [first = 0, second = 0] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host.includes(":")) {
    return false;
  }

  if (
    host === "::" ||
    host === "::1" ||
    /^fe[89ab]/.test(host) ||
    /^f[cd]/.test(host) ||
    host.startsWith("::ffff:")
  ) {
    return true;
  }

  const mappedIpv4 = host.match(/(?:^|:)ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false;
}

/**
 * Safe for rendering as an external link and conservative enough to reuse for a
 * future recipe-import fetch: only public HTTP(S) URLs without embedded secrets.
 */
export function isSafeExternalUrl(value: string): boolean {
  if (!value || value !== value.trim() || /[\u0000-\u001F\u007F]/.test(value)) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username !== "" ||
    url.password !== ""
  ) {
    return false;
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    (!hostname.includes(".") && !hostname.includes(":")) ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  ) {
    return false;
  }

  return true;
}

export const safeExternalUrlSchema = z
  .string()
  .trim()
  .max(2_048, "URL is too long.")
  .refine(isSafeExternalUrl, "Enter a safe public http or https URL.");

export const optionalSafeExternalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  safeExternalUrlSchema.nullable().optional(),
);
