import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardList,
  Minus,
  XCircle,
} from "lucide-react"

import { Card, CardContent } from "@workspace/ui/components/card"

import type { ImportJob } from "./types"

const KPIS = [
  {
    key: "totalRows",
    label: "TOTAL",
    icon: ClipboardList,
    color: "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-950/50",
  },
  {
    key: "successRows",
    label: "SUCCESS",
    icon: CheckCircle2,
    color:
      "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50",
  },
  {
    key: "failedRows",
    label: "FAILED",
    icon: XCircle,
    color: "text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/50",
  },
  {
    key: "skippedRows",
    label: "SKIPPED",
    icon: Minus,
    color: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-900",
  },
] as const

export function ImportKpis({ job }: { job: ImportJob }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {KPIS.map((kpi) => (
        <Card key={kpi.key} className="rounded-xl border shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${kpi.color}`}
            >
              <kpi.icon className="size-4" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {job[kpi.key].toLocaleString("en-IN")}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card className="rounded-xl border shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
            <ArrowLeftRight className="size-4" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              IN / UPD
            </p>
            <p className="text-xl font-semibold tabular-nums">
              {job.insertedRows.toLocaleString("en-IN")}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {job.updatedRows.toLocaleString("en-IN")}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ImportProgress({
  processed,
  total,
}: {
  processed: number
  total: number
}) {
  const pct =
    total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Processing rows</span>
        <span className="tabular-nums">
          {processed.toLocaleString("en-IN")} / {total.toLocaleString("en-IN")}{" "}
          ({pct}%)
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Import progress"
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full bg-primary transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
