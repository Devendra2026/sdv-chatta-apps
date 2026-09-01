import { scrypt } from "node:crypto"
import bcrypt from "bcryptjs"

const BCRYPT_PREFIX = "$2"
const BCRYPT_ROUNDS = 12

const LEGACY_SCRYPT = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
  maxmem: 128 * 16384 * 16 * 2,
} as const

function isBcryptHash(hash: string): boolean {
  return hash.startsWith(BCRYPT_PREFIX)
}

function isLegacyBetterAuthHash(hash: string): boolean {
  const [salt, key] = hash.split(":")
  return Boolean(salt && key && /^[0-9a-f]+$/i.test(salt) && /^[0-9a-f]+$/i.test(key))
}

async function verifyLegacyBetterAuthHash(
  hash: string,
  password: string
): Promise<boolean> {
  const [salt, keyHex] = hash.split(":")
  if (!salt || !keyHex) return false
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      LEGACY_SCRYPT.dkLen,
      {
        N: LEGACY_SCRYPT.N,
        r: LEGACY_SCRYPT.r,
        p: LEGACY_SCRYPT.p,
        maxmem: LEGACY_SCRYPT.maxmem,
      },
      (err, key) => {
        if (err) reject(err)
        else resolve(key)
      }
    )
  })
  return derived.toString("hex") === keyHex
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash) return false
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(password, storedHash)
  }
  if (isLegacyBetterAuthHash(storedHash)) {
    return verifyLegacyBetterAuthHash(storedHash, password)
  }
  return false
}

/** Rehash legacy Better Auth scrypt hashes to bcrypt after successful login. */
export function shouldUpgradePasswordHash(storedHash: string): boolean {
  return isLegacyBetterAuthHash(storedHash)
}
