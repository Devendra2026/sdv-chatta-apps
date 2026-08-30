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
  transpilePackages: ["@workspace/ui", "@workspace/types"],
  async rewrites() {
    const apiProxy = {
      source: "/api/:path*",
      destination: `${apiInternal}/api/:path*`,
    }
    return {
      afterFiles: [apiProxy],
      fallback: [apiProxy],
    }
  },
}

export default nextConfig
