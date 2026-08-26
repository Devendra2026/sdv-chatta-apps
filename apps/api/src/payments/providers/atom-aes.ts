import { createCipheriv, createDecipheriv, pbkdf2Sync } from "node:crypto"

/**
 * Atom NDPS AtomAES (matches official PHP AtomAES.php):
 * PBKDF2-HMAC-SHA512 → AES-256-CBC → uppercase hex.
 * IV is fixed bytes 0..15 (not the merchant "IV/salt" string).
 * Merchant key + salt strings are the PBKDF2 password and salt.
 */
const ATOM_FIXED_IV = Buffer.from([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
])

function deriveAesKey(key: string, salt: string): Buffer {
  // PHP openssl_pbkdf2(..., 256, ...) yields 256 bytes; AES-256 uses first 32.
  return pbkdf2Sync(key, salt, 65_536, 256, "sha512").subarray(0, 32)
}

export function atomAesEncrypt(
  plain: string,
  key: string,
  salt: string
): string {
  if (!key || !salt) {
    throw new Error("Atom AES key and salt are required")
  }
  const derived = deriveAesKey(key, salt)
  const cipher = createCipheriv("aes-256-cbc", derived, ATOM_FIXED_IV)
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ])
  return encrypted.toString("hex").toUpperCase()
}

export function atomAesDecrypt(
  encHex: string,
  key: string,
  salt: string
): string {
  if (!key || !salt) {
    throw new Error("Atom AES key and salt are required")
  }
  const derived = deriveAesKey(key, salt)
  const decipher = createDecipheriv("aes-256-cbc", derived, ATOM_FIXED_IV)
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final(),
  ]).toString("utf8")
}
