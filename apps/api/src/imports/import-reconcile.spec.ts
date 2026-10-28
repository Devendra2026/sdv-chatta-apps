import {
  orphanSurveyWhere,
  shouldPruneOrphanCount,
  shouldReconcileWardAfterImport,
} from "./import-reconcile"

describe("import-reconcile", () => {
  describe("shouldReconcileWardAfterImport", () => {
    const touched = new Set(["s1", "s2"])
    const oneWard = new Set(["ward-2"])

    it("returns ward id for successful single-ward UPDATE when pruneMissing is true", () => {
      expect(
        shouldReconcileWardAfterImport({
          duplicateStrategy: "UPDATE",
          failedRows: 0,
          wardIdsSeen: oneWard,
          touchedSurveyIds: touched,
          pruneMissing: true,
        })
      ).toBe("ward-2")
    })

    it("does not reconcile unless pruneMissing is explicitly true (opt-in)", () => {
      expect(
        shouldReconcileWardAfterImport({
          duplicateStrategy: "UPDATE",
          failedRows: 0,
          wardIdsSeen: oneWard,
          touchedSurveyIds: touched,
        })
      ).toBeNull()
      expect(
        shouldReconcileWardAfterImport({
          duplicateStrategy: "UPDATE",
          failedRows: 0,
          wardIdsSeen: oneWard,
          touchedSurveyIds: touched,
          pruneMissing: false,
        })
      ).toBeNull()
    })

    it("does not reconcile SKIP strategy", () => {
      expect(
        shouldReconcileWardAfterImport({
          duplicateStrategy: "SKIP",
          failedRows: 0,
          wardIdsSeen: oneWard,
          touchedSurveyIds: touched,
          pruneMissing: true,
        })
      ).toBeNull()
    })

    it("does not reconcile when any row failed", () => {
      expect(
        shouldReconcileWardAfterImport({
          duplicateStrategy: "UPDATE",
          failedRows: 1,
          wardIdsSeen: oneWard,
          touchedSurveyIds: touched,
          pruneMissing: true,
        })
      ).toBeNull()
    })

    it("does not reconcile multi-ward imports", () => {
      expect(
        shouldReconcileWardAfterImport({
          duplicateStrategy: "UPDATE",
          failedRows: 0,
          wardIdsSeen: new Set(["ward-1", "ward-2"]),
          touchedSurveyIds: touched,
          pruneMissing: true,
        })
      ).toBeNull()
    })

    it("does not reconcile empty touch set", () => {
      expect(
        shouldReconcileWardAfterImport({
          duplicateStrategy: "UPDATE",
          failedRows: 0,
          wardIdsSeen: oneWard,
          touchedSurveyIds: new Set(),
          pruneMissing: true,
        })
      ).toBeNull()
    })
  })

  describe("shouldPruneOrphanCount", () => {
    it("allows small orphan gaps like Ward 2 (1441 vs 1439)", () => {
      expect(shouldPruneOrphanCount(2, 1439)).toBe(true)
    })

    it("blocks mass delete from a partial ward upload", () => {
      expect(shouldPruneOrphanCount(1431, 10)).toBe(false)
    })

    it("returns false when there are no orphans", () => {
      expect(shouldPruneOrphanCount(0, 1439)).toBe(false)
    })
  })

  describe("orphanSurveyWhere", () => {
    it("builds soft-delete filter excluding touched ids", () => {
      expect(orphanSurveyWhere("ward-2", new Set(["a", "b"]))).toEqual({
        wardId: "ward-2",
        deletedAt: null,
        status: { not: "DELETED" },
        id: { notIn: ["a", "b"] },
      })
    })
  })
})
