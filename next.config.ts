import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // URL aliases for cleaner routes
  // These allow users to access /tenants instead of /dashboard/tenants
  async rewrites() {
    return [
      // Main dashboard modules
      { source: "/tenants", destination: "/dashboard/tenants" },
      { source: "/tenants/:path*", destination: "/dashboard/tenants/:path*" },
      { source: "/rooms", destination: "/dashboard/rooms" },
      { source: "/rooms/:path*", destination: "/dashboard/rooms/:path*" },
      { source: "/properties", destination: "/dashboard/properties" },
      { source: "/properties/:path*", destination: "/dashboard/properties/:path*" },
      { source: "/bills", destination: "/dashboard/bills" },
      { source: "/bills/:path*", destination: "/dashboard/bills/:path*" },
      { source: "/payments", destination: "/dashboard/payments" },
      { source: "/payments/:path*", destination: "/dashboard/payments/:path*" },
      { source: "/expenses", destination: "/dashboard/expenses" },
      { source: "/expenses/:path*", destination: "/dashboard/expenses/:path*" },
      { source: "/staff", destination: "/dashboard/staff" },
      { source: "/staff/:path*", destination: "/dashboard/staff/:path*" },
      { source: "/reports", destination: "/dashboard/reports" },
      { source: "/complaints", destination: "/dashboard/complaints" },
      { source: "/complaints/:path*", destination: "/dashboard/complaints/:path*" },
      { source: "/notices", destination: "/dashboard/notices" },
      { source: "/notices/:path*", destination: "/dashboard/notices/:path*" },
      { source: "/visitors", destination: "/dashboard/visitors" },
      { source: "/visitors/:path*", destination: "/dashboard/visitors/:path*" },
      { source: "/meter-readings", destination: "/dashboard/meter-readings" },
      { source: "/meter-readings/:path*", destination: "/dashboard/meter-readings/:path*" },
      { source: "/exit-clearance", destination: "/dashboard/exit-clearance" },
      { source: "/exit-clearance/:path*", destination: "/dashboard/exit-clearance/:path*" },
      { source: "/approvals", destination: "/dashboard/approvals" },
      { source: "/architecture", destination: "/dashboard/architecture" },
      { source: "/settings", destination: "/dashboard/settings" },
    ];
  },
};

export default nextConfig;
