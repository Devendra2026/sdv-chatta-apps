"use client"

import { TaxAdjustmentRulesWorkspace } from "../_components/tax-adjustment-rules-workspace"

export default function PropertyTaxRebatesPage() {
  return (
    <TaxAdjustmentRulesWorkspace
      kind="REBATE"
      head="PROPERTY"
      title="Property tax rebates"
      description="Published rebate rules applied to property tax when demands are computed."
    />
  )
}
