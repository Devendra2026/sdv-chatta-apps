"use client"

import { useQuery } from "@tanstack/react-query"
import { Filter } from "lucide-react"
import * as React from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { api } from "@/lib/api"

import { ReportsTaxWorkspace } from "./reports-tax-workspace"

export default function ReportsPage() {
  const [wardId, setWardId] = React.useState("")
  const [propertyUse, setPropertyUse] = React.useState("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")

  const surveys = useQuery({
    queryKey: ["report-surveys", wardId, propertyUse, from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (wardId) params.set("wardId", wardId)
      if (propertyUse.trim()) params.set("propertyUse", propertyUse.trim())
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const qs = params.toString()
      return (
        await api.get<{
          total: number
          byUse: Array<{ propertyUse: string | null; _count: { _all: number } }>
        }>(`/api/v1/reports/surveys${qs ? `?${qs}` : ""}`)
      ).data
    },
  })

  const payments = useQuery({
    queryKey: ["report-payments", wardId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (wardId) params.set("wardId", wardId)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const qs = params.toString()
      return (
        await api.get<{ successTotal: number; successCount: number }>(
          `/api/v1/reports/payments${qs ? `?${qs}` : ""}`
        )
      ).data
    },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Reports & tax demand
      </h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4" aria-hidden />
            Summary filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="report-property-use">Property use</Label>
            <Input
              id="report-property-use"
              value={propertyUse}
              onChange={(e) => setPropertyUse(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-from">Surveyed from</Label>
            <Input
              id="report-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">Surveyed to</Label>
            <Input
              id="report-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <ReportsTaxWorkspace
        wardId={wardId}
        propertyUse={propertyUse}
        from={from}
        to={to}
        onWardChange={setWardId}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Survey summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Total properties: {surveys.data?.total ?? "—"}</p>
            <ul className="space-y-1">
              {(surveys.data?.byUse ?? []).slice(0, 8).map((r) => (
                <li
                  key={String(r.propertyUse)}
                  className="flex justify-between"
                >
                  <span>{r.propertyUse ?? "Unknown"}</span>
                  <span>{r._count._all}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Successful payments: {payments.data?.successCount ?? "—"}</p>
            <p>
              Collection: ₹
              {(payments.data?.successTotal ?? 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
