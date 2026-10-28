"use client"

import { TaxAdjustmentRulesWorkspace } from "../_components/tax-adjustment-rules-workspace"

export default function WaterTaxPenaltiesPage() {
  return (
    <TaxAdjustmentRulesWorkspace
      kind="PENALTY"
      head="WATER"
      title="Water tax penalties"
      description="Published penalty rules applied only to the water tax head."
    />
  )
}
