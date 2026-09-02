import { resolveSessionCookieName as resolveSessionCookieNameFromConfig } from "@workspace/types"

export function resolveSessionCookieName(): string {
  return resolveSessionCookieNameFromConfig(process.env.SESSION_COOKIE_NAME)
}

/** Resolved at runtime from SESSION_COOKIE_NAME env (default chhata_session). */
export function sessionCookieName(): string {
  return resolveSessionCookieName()
}

/** Sliding window cap — also used as cookie Max-Age upper bound. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

/** Rotate session when remaining TTL falls below this (1 day). */
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24

export function sessionIdleTimeoutSeconds(): number {
  const raw = process.env.SESSION_IDLE_TIMEOUT_SECONDS
  const parsed = raw ? Number(raw) : 1800
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1800
}

export function sessionAbsoluteTimeoutSeconds(): number {
  const raw = process.env.SESSION_ABSOLUTE_TIMEOUT_SECONDS
  const parsed = raw ? Number(raw) : SESSION_TTL_SECONDS
  return Number.isFinite(parsed) && parsed > 0 ? parsed : SESSION_TTL_SECONDS
}

export const PASSWORD_RESET_IDENTIFIER_PREFIX = "password-reset:"
export const PASSWORD_RESET_TTL_SECONDS = 30 * 60
export const PASSWORD_RESET_MAX_ATTEMPTS = 5

export const LOGIN_MAX_FAILURES = 10
export const LOGIN_LOCKOUT_SECONDS = 15 * 60
