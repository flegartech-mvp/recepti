function configuredSupabaseOrigin(): string | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.protocol === "https:" ||
      (process.env.NODE_ENV === "development" && url.protocol === "http:")
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function createContentSecurityPolicy(nonce: string): string {
  const development = process.env.NODE_ENV === "development";
  const supabaseOrigins = [
    configuredSupabaseOrigin(),
    ...(development
      ? ["http://127.0.0.1:54321", "http://localhost:54321"]
      : []),
  ].filter((origin): origin is string => Boolean(origin));
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(development ? ["'unsafe-eval'"] : []),
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `img-src 'self' data: blob: ${supabaseOrigins.join(" ")} https://lh3.googleusercontent.com`,
    `connect-src 'self' ${supabaseOrigins.join(" ")}`,
    "font-src 'self' data:",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ]
    .join("; ")
    .replace(/\s+/g, " ")
    .trim();
}
