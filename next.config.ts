import type { NextConfig } from "next";

const configuredSupabaseUrl = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
})();
const buildVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "development";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/images": [
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
  images: {
    remotePatterns: [
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
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "X-Nanas-Recipes-Version", value: buildVersion },
        ],
      },
    ];
  },
};

export default nextConfig;
