"use client"

import { useQuery } from "@tanstack/react-query"
import { ExternalLink, Eye, Loader2, Printer } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
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

import { buildSelectItems } from "@workspace/ui/lib/select-items"

import { api } from "@/lib/api"
import { citizenPropertyTaxUrl } from "@/lib/citizen-web-url"
import { ApiError } from "@workspace/api-client"
import { generateDemandNoticeHtml } from "./_lib/notice-template"

type Ward = { id: string; name: string; number: number }
type SurveyRow = {
  id: string
  surveyId: string
  ownerName: string | null
  ward: { name: string; number: number } | null
  propertyNo: string | null
  propertyUse: string | null
  dataQualityStatus: string
}

type SurveyListMeta = {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function NoticePage() {
  const [wardId, setWardId] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)

  const wardsQuery = useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await api.get<Ward[]>("/api/v1/wards")).data,
  })

  const wardSelectItems = React.useMemo(
    () => [
      { value: "__all__", label: "All wards" },
      ...buildSelectItems(
        wardsQuery.data ?? [],
        (w) => w.id,
        (w) => w.name
      ),
    ],
    [wardsQuery.data]
  )

  const surveysQuery = useQuery({
    queryKey: ["notice-surveys", wardId, search, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", "20")
      if (wardId) params.set("wardId", wardId)
      if (search.trim()) params.set("search", search.trim())
      const res = await api.get<SurveyRow[]>(`/api/v1/surveys?${params}`)
      return {
        items: res.data,
        meta: res.meta as SurveyListMeta | undefined,
      }
    },
  })

  const meta = surveysQuery.data?.meta
  const rows = surveysQuery.data?.items ?? []

  const [printingId, setPrintingId] = React.useState<string | null>(null)

  const handlePrint = async (row: SurveyRow) => {
    setPrintingId(row.id)
    try {
      const survey = (
        await api.get<Record<string, unknown>>(`/api/v1/surveys/${row.id}`)
      ).data

      type DuesPayload = {
        assessmentYear: { name: string }
        floors: Array<{
          floorLabel: string
          usageType: string
          usageFactor: string
          construction: string
          areaSqFt: number
          rate: number
          alv: number
          tax: number
        }>
        tax: {
          propertyTaxPct: number
          waterTaxPct: number
          drainageTaxPct: number
          propertyTax: number
          waterTax: number
          drainageTax: number
          totalDemand: number
          annualBaseRate: number | null
          configFound: boolean
        }
      }

      let dues: DuesPayload
      try {
        dues = (
          await api.get<DuesPayload>(
            `/api/v1/public/property-tax/dues/${row.id}`
          )
        ).data
      } catch (err: unknown) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Published tax rates are not available for this ward. Configure and publish rates on Reports → Tax Rates first."
        toast.error(message)
        return
      }

      if (dues.floors.every((f) => f.rate <= 0) && dues.tax.totalDemand <= 0) {
        toast.warning(
          "Tax matrix rates are zero for this property’s zone/construction. Check published rates on Reports → Tax Rates."
        )
      }

      const logoUrl = `${window.location.origin}/branding/up-government-logo.png`
      const html = generateDemandNoticeHtml(survey, {
        logoUrl,
        floors: dues.floors,
        tax: {
          ...dues.tax,
          assessmentYear: dues.assessmentYear.name,
        },
        assessmentYear: dues.assessmentYear.name,
      })
      const w = window.open("", "_blank")
      if (!w) {
        toast.error("Popup blocked. Please allow popups for this site.")
        return
      }
      w.document.write(html)
      w.document.close()
      w.focus()
      // Wait for emblem to load so print includes the logo
      const imgs = Array.from(w.document.images)
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve()
                return
              }
              img.onload = () => resolve()
              img.onerror = () => resolve()
            })
        )
      )
      w.print()
    } catch {
      toast.error("Failed to load survey details for notice.")
    } finally {
      setPrintingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-2 pt-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Citizens pay property tax online on the public website. Demand
            amounts here use the same API calculation as{" "}
            <span className="font-mono text-xs">/public/property-tax/dues</span>
            .
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 cursor-pointer"
            render={
              <a
                href={citizenPropertyTaxUrl()}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Open citizen pay portal
            <ExternalLink className="size-3.5" aria-hidden />
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demand Notice Register</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="w-48 space-y-1">
            <Label className="text-xs text-muted-foreground">Ward</Label>
            <Select
              value={wardId || "__all__"}
              items={wardSelectItems}
              onValueChange={(v) => {
                setWardId(v === "__all__" || !v ? "" : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="All wards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="__all__"
                  label="All wards"
                  className="cursor-pointer"
                >
                  All wards
                </SelectItem>
                {(wardsQuery.data ?? []).map((w) => (
                  <SelectItem
                    key={w.id}
                    value={w.id}
                    label={w.name}
                    className="cursor-pointer"
                  >
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-56 space-y-1">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input
              placeholder="Owner, survey ID, property no..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto rounded-xl border shadow-sm">
        <CardContent className="p-0">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Survey ID</th>
                <th className="px-4 py-2 text-left font-medium">Owner</th>
                <th className="px-4 py-2 text-left font-medium">Ward</th>
                <th className="px-4 py-2 text-left font-medium">Property No</th>
                <th className="px-4 py-2 text-left font-medium">Use</th>
                <th className="px-4 py-2 text-left font-medium">Quality</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-2 font-mono text-xs">
                    {row.surveyId}
                  </td>
                  <td className="px-4 py-2">{row.ownerName ?? "—"}</td>
                  <td className="px-4 py-2">{row.ward?.name ?? "—"}</td>
                  <td className="px-4 py-2">{row.propertyNo ?? "—"}</td>
                  <td className="px-4 py-2">{row.propertyUse ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className="text-xs">
                      {row.dataQualityStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 cursor-pointer p-0"
                        render={<Link href={`/surveys/${row.id}`} />}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 cursor-pointer p-0"
                        title="Citizen online pay"
                        render={
                          <a
                            href={citizenPropertyTaxUrl(row.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 cursor-pointer p-0"
                        disabled={printingId === row.id}
                        onClick={() => void handlePrint(row)}
                      >
                        {printingId === row.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Printer className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {surveysQuery.isLoading
                      ? "Loading..."
                      : "No surveys found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} ({meta.total} records)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
