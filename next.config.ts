import type { NextConfig } from "next";

const supabaseOrigin = "https://*.supabase.co";
const configuredSupabaseUrl = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
})();
const developmentSupabaseOrigins =
  process.env.NODE_ENV === "development"
    ? ["http://127.0.0.1:54321", "http://localhost:54321"]
    : [];
const allowedSupabaseOrigins = [
  supabaseOrigin,
  configuredSupabaseUrl?.origin,
  ...developmentSupabaseOrigins,
]
  .filter((origin): origin is string => Boolean(origin))
  .filter((origin, index, origins) => origins.indexOf(origin) === index)
  .join(" ");
const developmentScriptPolicy =
  process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `img-src 'self' data: blob: ${allowedSupabaseOrigins} https://lh3.googleusercontent.com`,
  `connect-src 'self' ${allowedSupabaseOrigins}`,
  "font-src 'self' data:",
  `script-src 'self' 'unsafe-inline'${developmentScriptPolicy}`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      ...(configuredSupabaseUrl
        ? [
            {
              protocol: configuredSupabaseUrl.protocol.slice(0, -1) as
                "http" | "https",
              hostname: configuredSupabaseUrl.hostname,
              port: configuredSupabaseUrl.port,
            },
          ]
        : []),
      ...(process.env.NODE_ENV === "development"
        ? [
            {
              protocol: "http" as const,
              hostname: "127.0.0.1",
              port: "54321",
            },
            {
              protocol: "http" as const,
              hostname: "localhost",
              port: "54321",
            },
          ]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
