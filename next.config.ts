import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Files are now at clean URLs directly (e.g., /properties, /tenants)
  // No rewrites needed - routes moved from (dashboard)/dashboard/ to (dashboard)/
};

export default nextConfig;
