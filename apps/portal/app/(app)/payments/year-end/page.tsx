"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { buildSelectItems } from "@workspace/ui/lib/select-items"

import { usePermission } from "@/hooks/use-permission"
import { api, ApiError } from "@/lib/api"

type Year = { id: string; code: string; name: string }

type Preview = {
  fromYearId: string
  toYearId: string
  count: number
  totalArrears: number
  alreadyCommitted: boolean
  proposedArrears: Array<{
    municipalSurveyId: string
    ownerName: string | null
    fromOutstanding: number
    ward?: { number: number; name: string } | null
  }>
}

function money(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback
  if (err instanceof Error) return err.message
  return fallback
}

export default function YearEndClosingPage() {
  const { can } = usePermission()
  const canCommit = can("settings:update")

  const [fromYearId, setFromYearId] = React.useState("")
  const [toYearId, setToYearId] = React.useState("")
  const [preview, setPreview] = React.useState<Preview | null>(null)

  const yearsQuery = useQuery({
    queryKey: ["assessment-years-year-end"],
    queryFn: async () =>
      (
        await api.get<Year[]>(
          "/api/v1/reference-entries?category=ASSESSMENT_YEAR&status=ALL"
        )
      ).data,
  })

  const yearItems = React.useMemo(
    () =>
      buildSelectItems(
        yearsQuery.data ?? [],
        (y) => y.id,
        (y) => y.name
      ),
    [yearsQuery.data]
  )

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<Preview>("/api/v1/demands/year-end/preview", {
        fromYearId,
        toYearId,
      })
      return res.data
    },
    onSuccess: (data) => {
      setPreview(data)
      toast.success(
        data.alreadyCommitted
          ? "Year pair already committed (preview only)"
          : `Preview: ${data.count} unpaid demands`
      )
    },
    onError: (err) => toast.error(errorMessage(err, "Preview failed")),
  })

  const commitMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.post<{
          noop?: boolean
          carried?: number
          skipped?: number
        }>("/api/v1/demands/year-end/commit", { fromYearId, toYearId })
      ).data
    },
    onSuccess: (data) => {
      if (data.noop) {
        toast.message("Already committed — no changes")
      } else {
        toast.success(
          `Committed · carried ${data.carried ?? 0}, skipped ${data.skipped ?? 0}`
        )
      }
      previewMutation.mutate()
    },
    onError: (err) => toast.error(errorMessage(err, "Commit failed")),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Year-End Closing
        </h1>
        <p className="text-sm text-muted-foreground">
          Carry unpaid published outstanding into the next assessment year as
          arrears
        </p>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select years</CardTitle>
          <CardDescription>
            Preview unpaid demands, then commit once per year pair
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="w-56 space-y-1.5">
              <Label>From year</Label>
              <Select
                value={fromYearId || undefined}
                items={yearItems}
                onValueChange={(v) => {
                  setFromYearId(v ?? "")
                  setPreview(null)
                }}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="From year" />
                </SelectTrigger>
                <SelectContent>
                  {(yearsQuery.data ?? []).map((y) => (
                    <SelectItem key={y.id} value={y.id} label={y.name}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-56 space-y-1.5">
              <Label>To year</Label>
              <Select
                value={toYearId || undefined}
                items={yearItems}
                onValueChange={(v) => {
                  setToYearId(v ?? "")
                  setPreview(null)
                }}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="To year" />
                </SelectTrigger>
                <SelectContent>
                  {(yearsQuery.data ?? []).map((y) => (
                    <SelectItem key={y.id} value={y.id} label={y.name}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="cursor-pointer"
              disabled={
                !fromYearId ||
                !toYearId ||
                fromYearId === toYearId ||
                previewMutation.isPending
              }
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Previewing…
                </>
              ) : (
                "Preview"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="cursor-pointer"
              disabled={
                !canCommit ||
                !preview ||
                preview.alreadyCommitted ||
                commitMutation.isPending
              }
              onClick={() => commitMutation.mutate()}
            >
              {commitMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Committing…
                </>
              ) : (
                "Commit carry-forward"
              )}
            </Button>
          </div>
          {!canCommit ? (
            <p className="text-xs text-muted-foreground">
              Commit requires settings:update.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {preview ? (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preview summary</CardTitle>
            <CardDescription className="flex flex-wrap gap-2">
              <Badge>{preview.count} properties</Badge>
              <Badge variant="secondary">
                ₹{money(preview.totalArrears)} arrears
              </Badge>
              {preview.alreadyCommitted ? (
                <Badge variant="outline">Already committed</Badge>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2">Survey</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Ward</th>
                  <th className="px-3 py-2 text-right">Outstanding → arrear</th>
                </tr>
              </thead>
              <tbody>
                {preview.proposedArrears.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No unpaid published demands for the from year
                    </td>
                  </tr>
                ) : (
                  preview.proposedArrears.slice(0, 200).map((row) => (
                    <tr
                      key={row.municipalSurveyId}
                      className="border-b"
                    >
                      <td className="px-3 py-2 font-medium">
                        {row.municipalSurveyId}
                      </td>
                      <td className="px-3 py-2">{row.ownerName ?? "—"}</td>
                      <td className="px-3 py-2">
                        {row.ward
                          ? `${String(row.ward.number).padStart(2, "0")} · ${row.ward.name}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ₹{money(row.fromOutstanding)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {preview.proposedArrears.length > 200 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing first 200 of {preview.proposedArrears.length}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
