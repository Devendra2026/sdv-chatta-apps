import { shouldReconcileWardAfterImport } from "./import-reconcile"

describe("import soft-delete revive gates", () => {
  it("still reconciles only when UPDATE succeeds with zero failures", () => {
    expect(
      shouldReconcileWardAfterImport({
        duplicateStrategy: "UPDATE",
        failedRows: 0,
        wardIdsSeen: new Set(["ward-2"]),
        touchedSurveyIds: new Set(["a", "b"]),
      })
    ).toBe("ward-2")
  })

  it("skips reconcile when any row failed (prevents partial prune)", () => {
    expect(
      shouldReconcileWardAfterImport({
        duplicateStrategy: "UPDATE",
        failedRows: 2,
        wardIdsSeen: new Set(["ward-2"]),
        touchedSurveyIds: new Set(["a"]),
      })
    ).toBeNull()
  })
})
