"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Building2,
  Calculator,
  Download,
  MapPin,
  Search,
  Upload,
} from "lucide-react"
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
import { downloadAuthenticatedExport } from "@/lib/download-blob"

type Ward = { id: string; name: string; number: number }

type RefEntry = {
  id: string
  code: string
  name: string
  category: { code: string }
}

type TaxCell = {
  roadWidthEntryId: string
  constructionEntryId: string
  annualRatePerSqFt: string | number
  roadWidthEntry: RefEntry
  constructionEntry: RefEntry
}

type TaxConfig = {
  id: string
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  version: number
  propertyTaxPct: string | number
  waterTaxPct: string | number
  drainageTaxPct: string | number
  penaltyPct: string | number
  assessablePct: string | number
  commercialAssessablePct: string | number
  cells: TaxCell[]
}

const GIS_USE_PREVIEW_OPTIONS = [
  { code: "R", name: "R - Residential" },
  { code: "C", name: "C - Commercial" },
  { code: "M", name: "M - Mix Property" },
  { code: "P", name: "P - Open plot" },
] as const

function num(v: string | number | undefined): number {
  if (v == null) return 0
  return typeof v === "number" ? v : Number(v)
}

function useDebounced<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
) {
  const ref = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  return React.useCallback(
    (...args: Parameters<T>) => {
      if (ref.current) clearTimeout(ref.current)
      ref.current = setTimeout(() => fn(...args), ms)
    },
    [fn, ms]
  )
}

export function ReportsTaxWorkspace({
  wardId,
  propertyUse,
  from,
  to,
  onWardChange,
}: {
  wardId: string
  propertyUse: string
  from: string
  to: string
  onWardChange: (id: string) => void
}) {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [assessmentYearId, setAssessmentYearId] = React.useState("")
  const [exporting, setExporting] = React.useState(false)
  const [previewArea, setPreviewArea] = React.useState("100")
  const [previewRoadId, setPreviewRoadId] = React.useState("")
  const [previewConstructionId, setPreviewConstructionId] = React.useState("")
  const [previewGisUseCode, setPreviewGisUseCode] = React.useState("R")

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

  const zonesQuery = useQuery({
    queryKey: ["ref-tax-zones"],
    queryFn: async () => {
      const res = await api.get<RefEntry[]>(
        "/api/v1/reference-entries?category=TAX_RATE_ZONE"
      )
      return res.data ?? []
    },
  })

  const constructionsQuery = useQuery({
    queryKey: ["ref-construction"],
    queryFn: async () => {
      const res = await api.get<RefEntry[]>(
        "/api/v1/reference-entries?category=CONSTRUCTION_TYPE"
      )
      return res.data ?? []
    },
  })

  React.useEffect(() => {
    if (!assessmentYearId && yearsQuery.data?.[0]) {
      setAssessmentYearId(yearsQuery.data[0].id)
    }
  }, [yearsQuery.data, assessmentYearId])

  React.useEffect(() => {
    if (!wardId && wardsQuery.data?.[0]) {
      onWardChange(wardsQuery.data[0].id)
    }
  }, [wardId, wardsQuery.data, onWardChange])

  React.useEffect(() => {
    const zones = zonesQuery.data
    const constructions = constructionsQuery.data
    if (zones?.[0] && !previewRoadId) setPreviewRoadId(zones[0].id)
    if (constructions?.[0] && !previewConstructionId) {
      setPreviewConstructionId(constructions[0].id)
    }
  }, [
    zonesQuery.data,
    constructionsQuery.data,
    previewRoadId,
    previewConstructionId,
  ])

  const taxConfigQuery = useQuery({
    queryKey: ["tax-config", wardId, assessmentYearId],
    enabled: Boolean(wardId && assessmentYearId),
    queryFn: async () =>
      (
        await api.get<TaxConfig>(
          `/api/v1/tax-configs?wardId=${wardId}&assessmentYearId=${assessmentYearId}`
        )
      ).data,
  })

  const config = taxConfigQuery.data
  const roads = zonesQuery.data ?? []
  const constructions = constructionsQuery.data ?? []

  const assessmentYearItems = React.useMemo(
    () =>
      buildSelectItems(
        yearsQuery.data ?? [],
        (y) => y.id,
        (y) => y.name
      ),
    [yearsQuery.data]
  )

  const taxZoneItems = React.useMemo(
    () =>
      buildSelectItems(
        roads,
        (r) => r.id,
        (r) => r.name
      ),
    [roads]
  )

  const constructionItems = React.useMemo(
    () =>
      buildSelectItems(
        constructions,
        (c) => c.id,
        (c) => c.name
      ),
    [constructions]
  )

  const gisUseItems = React.useMemo(
    () =>
      buildSelectItems(
        GIS_USE_PREVIEW_OPTIONS,
        (g) => g.code,
        (g) => g.name
      ),
    []
  )

  const configIdentity = config ? `${config.id}:${config.version}` : ""

  const [paramDraft, setParamDraft] = React.useState({
    assessablePct: "",
    commercialAssessablePct: "",
    propertyTaxPct: "",
    waterTaxPct: "",
    drainageTaxPct: "",
    penaltyPct: "",
  })

  React.useEffect(() => {
    if (!config) {
      setParamDraft({
        assessablePct: "",
        commercialAssessablePct: "",
        propertyTaxPct: "",
        waterTaxPct: "",
        drainageTaxPct: "",
        penaltyPct: "",
      })
      return
    }
    setParamDraft({
      assessablePct: String(num(config.assessablePct)),
      commercialAssessablePct: String(num(config.commercialAssessablePct)),
      propertyTaxPct: String(num(config.propertyTaxPct)),
      waterTaxPct: String(num(config.waterTaxPct)),
      drainageTaxPct: String(num(config.drainageTaxPct)),
      penaltyPct: String(num(config.penaltyPct)),
    })
  }, [configIdentity, config])

  const cellMap = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const c of config?.cells ?? []) {
      m.set(
        `${c.roadWidthEntryId}:${c.constructionEntryId}`,
        num(c.annualRatePerSqFt)
      )
    }
    return m
  }, [config?.cells])

  const saveCells = useMutation({
    mutationFn: async (
      cells: Array<{
        roadWidthEntryId: string
        constructionEntryId: string
        annualRatePerSqFt: number
      }>
    ) => {
      if (!config) return
      await api.put(`/api/v1/tax-configs/${config.id}/cells`, { cells })
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["tax-config", wardId, assessmentYearId],
      })
    },
  })

  const saveParams = useMutation({
    mutationFn: async (body: Record<string, number>) => {
      if (!config) return
      await api.patch(`/api/v1/tax-configs/${config.id}`, body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["tax-config", wardId, assessmentYearId],
      })
    },
  })

  const publishMut = useMutation({
    mutationFn: async () => {
      if (!config) return
      await api.post(`/api/v1/tax-configs/${config.id}/publish`, {})
    },
    onSuccess: () => {
      toast.success("Tax rates published")
      void qc.invalidateQueries({
        queryKey: ["tax-config", wardId, assessmentYearId],
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const copyMut = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ updated: number }>(
        "/api/v1/tax-configs/copy-to-wards",
        {
          sourceWardId: wardId,
          assessmentYearId,
        }
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(`Copied rates to ${data.updated ?? 0} wards`)
    },
  })

  const previewQuery = useQuery({
    queryKey: [
      "tax-preview",
      wardId,
      assessmentYearId,
      previewArea,
      previewRoadId,
      previewConstructionId,
      previewGisUseCode,
    ],
    enabled: Boolean(
      wardId && assessmentYearId && previewRoadId && previewConstructionId
    ),
    queryFn: async () =>
      (
        await api.post<{
          calculation: {
            grossAlv: number
            assessableAlv: number
            propertyTax: number
            demand: number
          }
          rates: { annualRate: number }
        }>("/api/v1/tax-configs/preview", {
          wardId,
          assessmentYearId,
          areaSqFt: Number(previewArea) || 0,
          roadWidthEntryId: previewRoadId,
          constructionEntryId: previewConstructionId,
          gisUseCode: previewGisUseCode,
        })
      ).data,
  })

  const debouncedCellSave = useDebounced(
    (roadId: string, constructionId: string, value: number) => {
      if (!config) return
      const cells = roads.flatMap((road) =>
        constructions.map((c) => ({
          roadWidthEntryId: road.id,
          constructionEntryId: c.id,
          annualRatePerSqFt:
            road.id === roadId && c.id === constructionId
              ? value
              : (cellMap.get(`${road.id}:${c.id}`) ?? 0),
        }))
      )
      saveCells.mutate(cells)
    },
    600
  )

  const filteredWards = (wardsQuery.data ?? []).filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleExport = async () => {
    if (!wardId || !assessmentYearId) {
      toast.error("Select ward and assessment year")
      return
    }
    setExporting(true)
    try {
      const params = new URLSearchParams({
        wardId,
        assessmentYearId,
      })
      if (propertyUse.trim()) params.set("propertyUse", propertyUse.trim())
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const ward = wardsQuery.data?.find((w) => w.id === wardId)
      await downloadAuthenticatedExport(
        `/api/v1/reports/surveys/export?${params}`,
        `ward-tax-report-${ward?.number ?? "ward"}.xlsx`
      )
      toast.success("Tax demand Excel downloaded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="size-4" aria-hidden />
            Wards
          </CardTitle>
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[420px] space-y-1 overflow-y-auto p-2 pt-0">
          {filteredWards.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                wardId === w.id ? "bg-primary/10 font-medium" : ""
              }`}
              onClick={() => onWardChange(w.id)}
            >
              {w.name}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <Label htmlFor="assessment-year">Assessment year</Label>
            <Select
              value={assessmentYearId || null}
              items={assessmentYearItems}
              onValueChange={(v) => setAssessmentYearId(v ?? "")}
            >
              <SelectTrigger
                id="assessment-year"
                className="w-[180px] cursor-pointer"
              >
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {(yearsQuery.data ?? []).map((y) => (
                  <SelectItem
                    key={y.id}
                    value={y.id}
                    label={y.name}
                    className="cursor-pointer"
                  >
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {config ? (
            <Badge
              variant={config.status === "PUBLISHED" ? "default" : "secondary"}
            >
              {config.status} v{config.version}
            </Badge>
          ) : null}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={!config || copyMut.isPending}
              onClick={() => copyMut.mutate()}
            >
              Copy to all wards
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!config || publishMut.isPending}
              onClick={() => publishMut.mutate()}
            >
              <Upload className="mr-2 size-4" aria-hidden />
              Publish
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={exporting || config?.status !== "PUBLISHED"}
              onClick={() => void handleExport()}
            >
              <Download className="mr-2 size-4" aria-hidden />
              {exporting ? "Exporting…" : "Export tax Excel"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" aria-hidden />
              Rate matrix (₹ / sq ft / year)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-2 text-left">Road width</th>
                  {constructions.map((c) => (
                    <th key={c.id} className="border p-2 text-left">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roads.map((road) => (
                  <tr key={road.id}>
                    <td className="border p-2 font-medium">{road.name}</td>
                    {constructions.map((c) => {
                      const key = `${road.id}:${c.id}`
                      const value = cellMap.get(key) ?? 0
                      return (
                        <td key={c.id} className="border p-1">
                          <Input
                            key={`${configIdentity}-${key}-${value}`}
                            type="number"
                            step="0.01"
                            min={0}
                            className="h-8 cursor-pointer"
                            defaultValue={value}
                            disabled={!config}
                            onChange={(e) =>
                              debouncedCellSave(
                                road.id,
                                c.id,
                                Number(e.target.value) || 0
                              )
                            }
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tax percentages</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["assessablePct", "Residential assessable %"],
                  ["commercialAssessablePct", "Commercial assessable %"],
                  ["propertyTaxPct", "Property tax %"],
                  ["waterTaxPct", "Water tax %"],
                  ["drainageTaxPct", "Drainage tax %"],
                  ["penaltyPct", "Penalty %"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paramDraft[field]}
                    disabled={!config}
                    onChange={(e) =>
                      setParamDraft((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                    onBlur={() => {
                      if (!config) return
                      const next = Number(paramDraft[field]) || 0
                      if (next === num(config[field])) return
                      saveParams.mutate({ [field]: next })
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="size-4" aria-hidden />
                Live preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Area (sq ft)</Label>
                  <Input
                    value={previewArea}
                    onChange={(e) => setPreviewArea(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Zone</Label>
                  <Select
                    value={previewRoadId || null}
                    items={taxZoneItems}
                    onValueChange={(v) => setPreviewRoadId(v ?? "")}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {roads.map((r) => (
                        <SelectItem
                          key={r.id}
                          value={r.id}
                          label={r.name}
                          className="cursor-pointer"
                        >
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>GIS Use Code</Label>
                <Select
                  value={previewGisUseCode || null}
                  items={gisUseItems}
                  onValueChange={(v) => setPreviewGisUseCode(v ?? "R")}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="GIS Use Code" />
                  </SelectTrigger>
                  <SelectContent>
                    {GIS_USE_PREVIEW_OPTIONS.map((g) => (
                      <SelectItem
                        key={g.code}
                        value={g.code}
                        label={g.name}
                        className="cursor-pointer"
                      >
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Construction</Label>
                <Select
                  value={previewConstructionId || null}
                  items={constructionItems}
                  onValueChange={(v) => setPreviewConstructionId(v ?? "")}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Construction" />
                  </SelectTrigger>
                  <SelectContent>
                    {constructions.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        label={c.name}
                        className="cursor-pointer"
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {previewQuery.data ? (
                <dl className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-3">
                  <div>
                    <dt className="text-muted-foreground">Monthly rate</dt>
                    <dd>{previewQuery.data.rates.annualRate}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Gross ALV</dt>
                    <dd>{previewQuery.data.calculation.grossAlv.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Property tax</dt>
                    <dd>
                      {previewQuery.data.calculation.propertyTax.toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Total demand</dt>
                    <dd className="font-semibold">
                      {previewQuery.data.calculation.demand.toFixed(2)}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
