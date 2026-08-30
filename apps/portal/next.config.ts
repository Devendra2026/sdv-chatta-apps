import type { NextConfig } from "next"
import path from "node:path"
import { fileURLToPath } from "node:url"

const apiInternal =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000"

const repoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
)

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  transpilePackages: [
    "@workspace/ui",
    "@workspace/api-client",
    "@workspace/types",
  ],
  async rewrites() {
    // Filesystem routes win first (/api/portal/*, /api/auth/*). Fallback
    // proxies remaining /api/* (including nested Better Auth if the catch-all
    // is absent) after App Router 404 would otherwise apply.
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${apiInternal}/api/:path*`,
        },
      ],
    }
  },
}

export default nextConfig
