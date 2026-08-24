"use client"

import { CheckCircle2, ClipboardList, MapPin, AlertTriangle } from "lucide-react"

import { Card, CardContent } from "@workspace/ui/components/card"

type KpiData = {
  surveysInScope: number
  completeQuality: number
  needsReview: number
  totalWards: number
}

const kpis = [
  { key: "surveysInScope", label: "SURVEYS IN SCOPE", icon: ClipboardList, color: "text-blue-600 bg-blue-100" },
  { key: "completeQuality", label: "COMPLETE", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100" },
  { key: "needsReview", label: "NEEDS REVIEW", icon: AlertTriangle, color: "text-rose-600 bg-rose-100" },
  { key: "totalWards", label: "WARDS", icon: MapPin, color: "text-violet-600 bg-violet-100" },
] as const

export function ReportKpis({ data }: { data: KpiData | undefined }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.key} className="rounded-xl border shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex size-10 items-center justify-center rounded-lg ${kpi.color}`}>
              <kpi.icon className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {data ? data[kpi.key].toLocaleString("en-IN") : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
