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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
  async rewrites() {
    const apiProxy = {
      source: "/api/:path*",
      destination: `${apiInternal}/api/:path*`,
    }
    // fallback only: catch-all Route Handlers (/api/auth/[...all], /api/v1/[...path])
    // and static routes (/api/v1/health) run before fallback. afterFiles would steal
    // dynamic API routes and bypass cookie-preserving proxyToApi.
    return {
      fallback: [apiProxy],
    }
  },
}

export default nextConfig
