import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const isDev = process.env.NODE_ENV === "development"

// Security headers for all routes
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // HSTS only in production — sending it on localhost permanently breaks HTTP dev access
  ...(!isDev ? [{
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  }] : []),
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  {
    // Content Security Policy
    // 'unsafe-inline' required for Next.js hydration. 'unsafe-eval' required by
    // React in dev mode (Turbopack stack trace reconstruction) but NOT in production.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com",
      "worker-src 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      // Only upgrade insecure requests in production (breaks localhost dev on HTTP)
      ...(!isDev ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Security headers for all routes
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Disable x-powered-by header to reduce fingerprinting
  poweredByHeader: false,

  // Silence Turbopack/webpack coexistence warning from next-pwa
  turbopack: {},
};

export default withPWA({
  dest: "public",
  // Disabled: next-pwa's default NavigationRoute fallback returns precached homepage HTML
  // for all navigation requests (including /login, /dashboard), breaking SSR routing.
  // Re-enable only after configuring a custom service worker that does not intercept navigation.
  disable: true,
})(nextConfig);
