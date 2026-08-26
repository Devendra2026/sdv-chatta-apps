export const IMPORT_STATUSES = [
  "UPLOADED",
  "VALIDATING",
  "READY",
  "PROCESSING",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
] as const

export type ImportJobStatus = (typeof IMPORT_STATUSES)[number]

export type DuplicateStrategy = "SKIP" | "UPDATE"

export type ImportErrorRow = {
  id: string
  rowNumber: number
  surveyId: string | null
  field: string | null
  message: string
  severity: string
}

export type ImportJob = {
  id: string
  fileName: string
  fileSize: number
  status: ImportJobStatus | string
  mappingPreset: string | null
  duplicateStrategy: DuplicateStrategy | string
  totalRows: number
  processedRows: number
  successRows: number
  failedRows: number
  skippedRows: number
  insertedRows: number
  updatedRows: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  createdBy?: { id: string; name: string; email: string } | null
  errors?: ImportErrorRow[]
}

export type ImportListMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}
