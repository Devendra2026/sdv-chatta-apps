import type { DuplicateStrategy } from "@prisma/client"

/**
 * After a successful single-ward UPDATE import, soft-delete surveys in that
 * ward that were not inserted/updated by the job so DB count matches the file.
 *
 * Never reconcile for SKIP/CREATE, multi-ward files, failed imports, or empty
 * touch sets — those paths must not disturb other wards or partial uploads.
 */
export function shouldReconcileWardAfterImport(input: {
  duplicateStrategy: DuplicateStrategy | string
  failedRows: number
  wardIdsSeen: ReadonlySet<string>
  touchedSurveyIds: ReadonlySet<string>
}): string | null {
  if (input.duplicateStrategy !== "UPDATE") return null
  if (input.failedRows !== 0) return null
  if (input.touchedSurveyIds.size === 0) return null
  if (input.wardIdsSeen.size !== 1) return null
  const [wardId] = input.wardIdsSeen
  return wardId ?? null
}

/**
 * Cap auto-prune so a small/partial ward UPDATE cannot wipe the ward.
 * Allows small leftover gaps (e.g. 1441 vs 1439) while blocking mass deletes.
 */
export function shouldPruneOrphanCount(
  orphanCount: number,
  keptCount: number
): boolean {
  if (orphanCount <= 0) return false
  const maxOrphans = Math.max(10, Math.ceil(keptCount * 0.02))
  return orphanCount <= maxOrphans
}

export function orphanSurveyWhere(
  wardId: string,
  keepSurveyIds: ReadonlySet<string>
) {
  return {
    wardId,
    deletedAt: null,
    status: { not: "DELETED" as const },
    id: { notIn: [...keepSurveyIds] },
  }
}
