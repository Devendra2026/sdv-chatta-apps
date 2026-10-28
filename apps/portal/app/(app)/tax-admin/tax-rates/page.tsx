"use client"

import * as React from "react"

import { ReportsTaxWorkspace } from "../../reports/reports-tax-workspace"

export default function TaxAdminTaxRatesPage() {
  const [wardId, setWardId] = React.useState("")

  return (
    <ReportsTaxWorkspace
      wardId={wardId}
      propertyUse=""
      from=""
      to=""
      onWardChange={setWardId}
    />
  )
}
