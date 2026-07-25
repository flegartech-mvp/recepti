export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return fallback;
  try {
    const url = new URL(value, "https://nanas-recipes.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function applicationOrigin(requestUrl: string | URL): string {
  const requestOrigin = new URL(requestUrl).origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return requestOrigin;

  try {
    const configuredOrigin = new URL(configured).origin;
    if (
      process.env.NODE_ENV !== "production" &&
      /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/u.test(requestOrigin)
    ) {
      return requestOrigin;
    }
    return configuredOrigin;
  } catch {
    return requestOrigin;
  }
}
