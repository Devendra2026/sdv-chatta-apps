"use client"

import { TaxAdjustmentRulesWorkspace } from "../_components/tax-adjustment-rules-workspace"

export default function WaterTaxRebatesPage() {
  return (
    <TaxAdjustmentRulesWorkspace
      kind="REBATE"
      head="WATER"
      title="Water tax rebates"
      description="Published rebate rules applied to water tax when demands are computed."
    />
  )
}
