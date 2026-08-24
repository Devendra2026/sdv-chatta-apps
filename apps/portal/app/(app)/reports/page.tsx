"use client"

import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { downloadAuthenticatedExport } from "@/lib/download-blob"

import {
  FilterControlPanel,
  type ReportFilters,
} from "./_components/filter-control-panel"
import { ReportKpis } from "./_components/report-kpis"
import { VisualReportBuilder } from "./_components/visual-report-builder"

type Ward = { id: string; name: string; number: number }

type TaxConfig = {
  id: string
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  version: number
}

type RefEntry = { id: string; code: string; name: string }

export default function ReportBuilderPage() {
  const [filters, setFilters] = React.useState<ReportFilters>({
    wardId: "",
    propertyUse: "",
    from: "",
    to: "",
    autoFilter: false,
  })

  const [assessmentYearId, setAssessmentYearId] = React.useState("")

  const wardsQuery = useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await api.get<Ward[]>("/api/v1/wards")).data,
  })

  const yearsQuery = useQuery({
    queryKey: ["ref-assessment-years"],
    queryFn: async () => {
      const res = await api.get<RefEntry[]>(
        "/api/v1/reference-entries?category=ASSESSMENT_YEAR"
      )
      return res.data ?? []
    },
  })

  React.useEffect(() => {
    if (!assessmentYearId && yearsQuery.data?.[0]) {
      setAssessmentYearId(yearsQuery.data[0].id)
    }
  }, [yearsQuery.data, assessmentYearId])

  const taxConfigQuery = useQuery({
    queryKey: ["tax-config", filters.wardId, assessmentYearId],
    enabled: Boolean(filters.wardId && assessmentYearId),
    queryFn: async () =>
      (
        await api.get<TaxConfig>(
          `/api/v1/tax-configs?wardId=${filters.wardId}&assessmentYearId=${assessmentYearId}`
        )
      ).data,
  })

  const surveysQuery = useQuery({
    queryKey: ["report-surveys", filters.wardId, filters.propertyUse, filters.from, filters.to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.wardId) params.set("wardId", filters.wardId)
      if (filters.propertyUse.trim()) params.set("propertyUse", filters.propertyUse.trim())
      if (filters.from) params.set("from", filters.from)
      if (filters.to) params.set("to", filters.to)
      const qs = params.toString()
      return (
        await api.get<{ total: number }>(`/api/v1/reports/surveys${qs ? `?${qs}` : ""}`)
      ).data
    },
  })

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", filters.wardId || "all"],
    queryFn: async () => {
      const qs = filters.wardId ? `?wardId=${filters.wardId}` : ""
      return (
        await api.get<{
          totalProperties: number
          completeQuality: number
          needsReviewQuality: number
          totalWards: number
        }>(`/api/v1/dashboard/summary${qs}`)
      ).data
    },
  })

  const kpiData = dashboardQuery.data
    ? {
        surveysInScope: surveysQuery.data?.total ?? dashboardQuery.data.totalProperties,
        completeQuality: dashboardQuery.data.completeQuality,
        needsReview: dashboardQuery.data.needsReviewQuality,
        totalWards: dashboardQuery.data.totalWards,
      }
    : undefined

  const taxPublished = taxConfigQuery.data?.status === "PUBLISHED"

  const buildExportParams = () => {
    const params = new URLSearchParams()
    if (filters.wardId) params.set("wardId", filters.wardId)
    if (filters.propertyUse.trim()) params.set("propertyUse", filters.propertyUse.trim())
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.autoFilter) params.set("autoFilter", "1")
    return params
  }

  const handleExportSurvey = async () => {
    const params = buildExportParams()
    params.set("template", "import")
    const ward = wardsQuery.data?.find((w) => w.id === filters.wardId)
    try {
      await downloadAuthenticatedExport(
        `/api/v1/reports/surveys/export?${params}`,
        `survey-report-${ward?.number ?? "all"}.xlsx`
      )
      toast.success("Survey Excel downloaded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed")
    }
  }

  const handleExportTax = async () => {
    if (!filters.wardId || !assessmentYearId) {
      toast.error("Select ward and assessment year")
      return
    }
    if (!taxPublished) {
      toast.error("Publish tax rates before exporting")
      return
    }
    const params = buildExportParams()
    params.set("assessmentYearId", assessmentYearId)
    const ward = wardsQuery.data?.find((w) => w.id === filters.wardId)
    try {
      await downloadAuthenticatedExport(
        `/api/v1/reports/surveys/export?${params}`,
        `ward-tax-report-${ward?.number ?? "ward"}.xlsx`
      )
      toast.success("Tax demand Excel downloaded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed")
    }
  }

  return (
    <div className="space-y-6">
      <FilterControlPanel
        filters={filters}
        onChange={setFilters}
        wards={wardsQuery.data ?? []}
      />

      <ReportKpis data={kpiData} />

      <VisualReportBuilder
        filters={filters}
        taxPublished={taxPublished}
        onExportSurvey={handleExportSurvey}
        onExportTax={handleExportTax}
      />
    </div>
  )
}
