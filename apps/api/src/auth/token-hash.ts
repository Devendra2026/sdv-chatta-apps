import { createHmac, timingSafeEqual } from "node:crypto"

import { resolveSessionSecret } from "./session-options"

/** HMAC-SHA256 session/reset token fingerprint for DB storage. */
export function hashOpaqueToken(raw: string, purpose: string): string {
  return createHmac("sha256", resolveSessionSecret())
    .update(`${purpose}:${raw.trim()}`)
    .digest("hex")
}

export function verifyOpaqueToken(
  raw: string,
  storedHash: string,
  purpose: string
): boolean {
  if (!raw.trim() || !storedHash) return false
  const expected = Buffer.from(storedHash, "hex")
  const actual = Buffer.from(hashOpaqueToken(raw, purpose), "hex")
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
