import type { NextConfig } from "next"

const apiInternal =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/types"],
  async rewrites() {
    // Proxy Nest public API under /api/* (same pattern as portal).
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternal}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
