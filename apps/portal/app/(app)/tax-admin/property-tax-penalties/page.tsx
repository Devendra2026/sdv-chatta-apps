"use client"

import { TaxAdjustmentRulesWorkspace } from "../_components/tax-adjustment-rules-workspace"

export default function PropertyTaxPenaltiesPage() {
  return (
    <TaxAdjustmentRulesWorkspace
      kind="PENALTY"
      head="PROPERTY"
      title="Property tax penalties"
      description="Published property penalty rules replace the legacy TaxConfig penalty percentage."
    />
  )
}
