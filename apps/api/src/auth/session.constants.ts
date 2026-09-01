/** HttpOnly staff session cookie (no __Secure- prefix). */
export const SESSION_COOKIE_NAME = "chhata_session"

/** Session lifetime: 7 days. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

/** Extend session when remaining TTL falls below this (1 day). */
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24

export const OTP_LENGTH = 6
export const OTP_TTL_SECONDS = 300
export const OTP_MAX_ATTEMPTS = 5

export const PASSWORD_RESET_IDENTIFIER_PREFIX = "password-reset:"
