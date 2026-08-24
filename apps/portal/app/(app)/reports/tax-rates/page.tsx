"use client"

import * as React from "react"

import { ReportsTaxWorkspace } from "../reports-tax-workspace"

export default function TaxRatesPage() {
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
