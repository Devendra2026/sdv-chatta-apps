export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: Record<string, unknown>
}

export type ApiError = {
  success: false
  error: {
    code: string
    message: string
    requestId?: string
  }
}

export type PaginatedMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export const PERMISSIONS = [
  "dashboard:read",
  "survey:read",
  "survey:create",
  "survey:update",
  "survey:delete",
  "survey:pii:read",
  "import:read",
  "import:create",
  "export:read",
  "export:create",
  "report:read",
  "report:export",
  "payment:read",
  "payment:create",
  "payment:update",
  "payment:offline:create",
  "payment:requery",
  "refund:create",
  "refund:read",
  "settlement:read",
  "user:read",
  "user:create",
  "user:update",
  "user:delete",
  "role:read",
  "role:create",
  "role:update",
  "role:delete",
  "permission:read",
  "settings:update",
  "audit:read",
  "file:read",
  "file:create",
] as const

export type PermissionCode = (typeof PERMISSIONS)[number]
