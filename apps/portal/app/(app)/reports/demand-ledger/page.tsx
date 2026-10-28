"use client"

import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  buildSelectItems,
  buildStringSelectItems,
} from "@workspace/ui/lib/select-items"

import { api } from "@/lib/api"

type Ward = { id: string; name: string; number: number }
type Year = { id: string; code: string; name: string }

type DemandRow = {
  id: string
  status: string
  verified: boolean
  outstanding: number
  totalPayable: number
  amountPaid: number
  propertyTax: number
  waterTax: number
  drainageTax: number
  penalty: number
  rebate: number
  arrears: number
  assessmentYear?: { name: string } | null
  survey?: {
    surveyId: string
    ownerName: string | null
    propertyNo: string | null
    ward?: { number: number; name: string } | null
  } | null
}

type Meta = {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const STATUS_ITEMS = buildStringSelectItems([
  "ALL",
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
])

function money(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function DemandLedgerPage() {
  const [wardId, setWardId] = React.useState("")
  const [yearId, setYearId] = React.useState("")
  const [status, setStatus] = React.useState("ALL")
  const [search, setSearch] = React.useState("")
  const [debounced, setDebounced] = React.useState("")
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [search])

  const wardsQuery = useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await api.get<Ward[]>("/api/v1/wards")).data,
  })

  const yearsQuery = useQuery({
    queryKey: ["assessment-years-demand-ledger"],
    queryFn: async () =>
      (
        await api.get<Year[]>(
          "/api/v1/reference-entries?category=ASSESSMENT_YEAR&status=ALL"
        )
      ).data,
  })

  React.useEffect(() => {
    if (yearId || !yearsQuery.data?.length) return
    const latest = [...yearsQuery.data].sort((a, b) =>
      b.code.localeCompare(a.code)
    )[0]
    if (latest) setYearId(latest.id)
  }, [yearsQuery.data, yearId])

  const listQuery = useQuery({
    queryKey: ["demand-ledger", wardId, yearId, status, debounced, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
      })
      if (wardId) params.set("wardId", wardId)
      if (yearId) params.set("assessmentYearId", yearId)
      if (status !== "ALL") params.set("status", status)
      if (debounced) params.set("search", debounced)
      const res = await api.get<DemandRow[]>(`/api/v1/demands/list?${params}`)
      return { items: res.data, meta: res.meta as Meta | undefined }
    },
  })

  const rows = listQuery.data?.items ?? []
  const meta = listQuery.data?.meta

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Demand Ledger</h1>
        <p className="text-sm text-muted-foreground">
          PropertyDemand list with filters (read-only)
        </p>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Ward, year, status, and property search
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="w-44 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ward</Label>
            <Select
              value={wardId || "__all__"}
              items={[
                { value: "__all__", label: "All wards" },
                ...buildSelectItems(
                  wardsQuery.data ?? [],
                  (w) => w.id,
                  (w) => `${String(w.number).padStart(2, "0")} · ${w.name}`
                ),
              ]}
              onValueChange={(v) => {
                setWardId(v === "__all__" || !v ? "" : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="All wards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" label="All wards">
                  All wards
                </SelectItem>
                {(wardsQuery.data ?? []).map((w) => (
                  <SelectItem
                    key={w.id}
                    value={w.id}
                    label={`${String(w.number).padStart(2, "0")} · ${w.name}`}
                  >
                    {String(w.number).padStart(2, "0")} · {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Year</Label>
            <Select
              value={yearId || "__all__"}
              items={[
                { value: "__all__", label: "All years" },
                ...buildSelectItems(
                  yearsQuery.data ?? [],
                  (y) => y.id,
                  (y) => y.name
                ),
              ]}
              onValueChange={(v) => {
                setYearId(v === "__all__" || !v ? "" : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" label="All years">
                  All years
                </SelectItem>
                {(yearsQuery.data ?? []).map((y) => (
                  <SelectItem key={y.id} value={y.id} label={y.name}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={status}
              items={STATUS_ITEMS}
              onValueChange={(v) => {
                setStatus(v ?? "ALL")
                setPage(1)
              }}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["ALL", "DRAFT", "PUBLISHED", "CLOSED"].map((s) => (
                  <SelectItem key={s} value={s} label={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Owner, survey ID…"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm">
        <CardContent className="pt-(--card-spacing) overflow-x-auto">
          {listQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : listQuery.isError ? (
            <p className="px-3 py-8 text-center text-sm text-destructive">
              {(listQuery.error as Error)?.message ||
                "Failed to load demand ledger"}
            </p>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2">Survey</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Year</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Arrears</th>
                  <th className="px-3 py-2 text-right">Payable</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No demands found. Publish tax rates for this assessment
                      year to generate PropertyDemand rows.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="px-3 py-2 font-medium">
                        {row.survey?.surveyId ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.survey?.ownerName ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.assessmentYear?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary">{row.status}</Badge>
                          {!row.verified ? (
                            <Badge variant="destructive">Unverified</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        ₹{money(row.arrears)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ₹{money(row.totalPayable)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ₹{money(row.amountPaid)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        ₹{money(row.outstanding)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {meta && meta.totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total})
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
