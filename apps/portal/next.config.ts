import type { NextConfig } from "next"

const apiInternal =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/api-client", "@workspace/types"],
  async rewrites() {
    // Proxy Nest auth/API under /api/* but keep portal-owned handlers local.
    return [
      {
        source: "/api/:path((?!portal(?:/|$)).*)",
        destination: `${apiInternal}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
