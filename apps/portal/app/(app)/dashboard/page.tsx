"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Droplets,
  Home,
  IndianRupee,
  MapPin,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { buildSelectItems } from "@workspace/ui/lib/select-items"
import { cn } from "@workspace/ui/lib/utils"

import { useCan } from "@/hooks/use-permission"
import { api } from "@/lib/api"

type WardCardStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED"

type DashboardSummary = {
  totalProperties: number
  draftSurveys: number
  activeSurveys: number
  archivedSurveys: number
  completeQuality: number
  needsReviewQuality: number
  totalWards: number
  wardsWithSurveys: number
  wardsInProgress: number
  totalCollection: number
  onlineCollection: number
  offlineCollection: number
  pendingCollection: number
  pendingPayments: number
  successPayments: number
  failedPayments: number
  wardBreakdown: Array<{
    wardId: string
    number: number
    code: string
    name: string
    surveyCount: number
    onlineCollection: number
    offlineCollection: number
    pendingCollection: number
    totalCollection: number
    status: WardCardStatus
  }>
}

type Ward = { id: string; number: number; name: string; code: string }

const WARD_ACCENTS = [
  "border-t-blue-500",
  "border-t-emerald-500",
  "border-t-violet-500",
  "border-t-amber-500",
  "border-t-rose-500",
  "border-t-cyan-500",
] as const

const taxChartConfig = {
  property: { label: "Property Tax", color: "var(--chart-2)" },
  drainage: { label: "Drainage Tax", color: "var(--chart-3)" },
  water: { label: "Water Tax", color: "var(--chart-4)" },
} satisfies ChartConfig

const wardChartConfig = {
  surveyCount: { label: "Properties", color: "var(--chart-1)" },
} satisfies ChartConfig

function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function formatRs(value: number): string {
  return `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function wardTaxTotal(ward: DashboardSummary["wardBreakdown"][number]): number {
  return ward.onlineCollection + ward.offlineCollection + ward.pendingCollection
}

export default function DashboardPage() {
  const {
    allowed,
    isLoading: permLoading,
    isError: permError,
  } = useCan("dashboard:read")
  const [wardId, setWardId] = React.useState<string>("all")

  const wardsQuery = useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await api.get<Ward[]>("/api/v1/wards")).data,
    enabled: allowed,
  })

  const wardSelectItems = React.useMemo(
    () => [
      { value: "all", label: "All Wards" },
      ...buildSelectItems(
        wardsQuery.data ?? [],
        (w) => w.id,
        (w) => `Ward ${w.number} — ${w.name}`
      ),
    ],
    [wardsQuery.data]
  )

  const summaryQuery = useQuery({
    queryKey: ["dashboard", wardId],
    queryFn: async () => {
      const qs = wardId !== "all" ? `?wardId=${wardId}` : ""
      return (await api.get<DashboardSummary>(`/api/v1/dashboard/summary${qs}`))
        .data
    },
    enabled: allowed,
  })

  if (permLoading) {
    return <DashboardSkeleton />
  }

  if (permError) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not verify access. Confirm the API is running and try refreshing.
      </p>
    )
  }

  if (!allowed) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          You do not have access to the dashboard.
        </p>
        <p className="text-xs text-muted-foreground">
          Ask an administrator for{" "}
          <code className="text-foreground">dashboard:read</code>.
        </p>
      </div>
    )
  }

  const data = summaryQuery.data
  const loading = summaryQuery.isLoading

  const propertyTax = data?.onlineCollection ?? 0
  const drainageTax = data?.offlineCollection ?? 0
  const waterTax = data?.pendingCollection ?? 0
  const totalTax = propertyTax + drainageTax + waterTax

  const taxMix = [
    {
      key: "property",
      name: "Property Tax",
      value: propertyTax,
      fill: "var(--color-property)",
    },
    {
      key: "drainage",
      name: "Drainage Tax",
      value: drainageTax,
      fill: "var(--color-drainage)",
    },
    {
      key: "water",
      name: "Water Tax",
      value: waterTax,
      fill: "var(--color-water)",
    },
  ]
  const taxMixTotal = taxMix.reduce((s, r) => s + r.value, 0)

  const wardBars = (data?.wardBreakdown ?? []).map((w) => ({
    ward: String(w.number),
    name: w.name,
    surveyCount: w.surveyCount,
  }))

  return (
    <div className="space-y-8">
      {/* Page header — Bakewar PDF style */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav aria-label="Breadcrumb" className="mb-1">
            <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <li>Dashboard</li>
            </ol>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Nagar Panchayat Chhata
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={wardId}
            items={wardSelectItems}
            onValueChange={(v) => setWardId(v ?? "all")}
          >
            <SelectTrigger className="w-64 cursor-pointer rounded-xl">
              <SelectValue placeholder="All wards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All Wards">
                All Wards
              </SelectItem>
              {(wardsQuery.data ?? []).map((w) => (
                <SelectItem
                  key={w.id}
                  value={w.id}
                  label={`Ward ${w.number} — ${w.name}`}
                >
                  Ward {w.number} — {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="cursor-pointer rounded-xl"
            render={<Link href="/surveys" />}
          >
            Open surveys
          </Button>
        </div>
      </div>

      {/* 1. Ward Wise Survey Statistics */}
      <section className="space-y-3">
        <SectionHeading title="Ward Wise Survey Statistics" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SolidStatCard
            title="Total Wards"
            value={data?.totalWards}
            loading={loading}
            icon={MapPin}
            tone="blue"
          />
          <SolidStatCard
            title="Survey Completed in Ward"
            value={data?.wardsWithSurveys}
            loading={loading}
            icon={ClipboardCheck}
            tone="green"
          />
          <SolidStatCard
            title="Survey in Progress"
            value={data?.wardsInProgress}
            loading={loading}
            icon={Clock3}
            tone="amber"
          />
          <SolidStatCard
            title="Survey Completed"
            value={data?.totalProperties}
            loading={loading}
            icon={CheckCircle2}
            tone="purple"
          />
        </div>
      </section>

      {/* 2. Property Wise Survey Statistics */}
      <section className="space-y-3">
        <SectionHeading title="Property Wise Survey Statistics" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TaxStatCard
            title="Total Property Tax"
            value={data ? formatRs(propertyTax) : undefined}
            loading={loading}
            icon={Home}
            tone="green"
          />
          <TaxStatCard
            title="Total Drainage Tax"
            value={data ? formatRs(drainageTax) : undefined}
            loading={loading}
            icon={Droplets}
            tone="amber"
          />
          <TaxStatCard
            title="Total Water Tax"
            value={data ? formatRs(waterTax) : undefined}
            loading={loading}
            icon={Wallet}
            tone="purple"
          />
          <TaxStatCard
            title="Total Tax"
            value={data ? formatRs(totalTax) : undefined}
            loading={loading}
            icon={IndianRupee}
            tone="blue"
          />
        </div>
      </section>

      {/* 3. Charts & Analytics */}
      <section className="space-y-3">
        <SectionHeading title="Charts & Analytics" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tax Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="mx-auto size-48 rounded-full" />
              ) : taxMixTotal === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No tax collection data yet for this filter.
                </p>
              ) : (
                <>
                  <ChartContainer
                    config={taxChartConfig}
                    className="mx-auto aspect-square max-h-56"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            nameKey="key"
                            hideLabel
                            formatter={(value) => formatInr(Number(value ?? 0))}
                          />
                        }
                      />
                      <Pie
                        data={taxMix}
                        dataKey="value"
                        nameKey="key"
                        innerRadius={58}
                        outerRadius={84}
                        strokeWidth={2}
                      >
                        {taxMix.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend
                        content={<ChartLegendContent nameKey="key" />}
                      />
                    </PieChart>
                  </ChartContainer>
                  <table className="mt-2 w-full text-xs text-muted-foreground">
                    <caption className="sr-only">
                      Tax collection amounts by category
                    </caption>
                    <tbody>
                      {taxMix.map((row) => (
                        <tr key={row.key} className="border-t">
                          <td className="py-1.5">{row.name}</td>
                          <td className="py-1.5 text-right font-medium text-foreground">
                            {formatInr(row.value)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold">
                        <td className="py-1.5 text-foreground">Total Tax</td>
                        <td className="py-1.5 text-right text-foreground">
                          {formatInr(totalTax)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ward Property Count</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ChartContainer
                  config={wardChartConfig}
                  className="aspect-auto h-64 w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={wardBars}
                    margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="ward"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            const row = payload?.[0]?.payload as
                              { ward?: string; name?: string } | undefined
                            return row?.name
                              ? `Ward ${row.ward} — ${row.name}`
                              : `Ward ${row?.ward ?? ""}`
                          }}
                        />
                      }
                    />
                    <Bar
                      dataKey="surveyCount"
                      fill="var(--color-surveyCount)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Ward Tax Collection Cards */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionHeading title="Ward Tax Collection Cards" />
          <p className="text-sm text-muted-foreground">
            {data?.totalWards ?? "—"} wards mapped
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {(data?.wardBreakdown ?? []).map((ward, index) => (
              <WardCollectionCard
                key={ward.wardId}
                ward={ward}
                accent={WARD_ACCENTS[index % WARD_ACCENTS.length]!}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-base font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
      {title}
    </h2>
  )
}

const solidTones = {
  blue: "from-blue-500 to-blue-600",
  green: "from-emerald-500 to-emerald-600",
  amber: "from-amber-400 to-orange-500",
  purple: "from-violet-500 to-violet-600",
} as const

function SolidStatCard({
  title,
  value,
  loading,
  icon: Icon,
  tone,
}: {
  title: string
  value?: number
  loading?: boolean
  icon: React.ComponentType<{ className?: string }>
  tone: keyof typeof solidTones
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-linear-to-br p-5 text-white shadow-md transition-shadow duration-200 hover:shadow-lg",
        solidTones[tone]
      )}
    >
      <div className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-white/20">
        <Icon className="size-5" />
      </div>
      <p className="pr-12 text-sm font-medium text-white/90">{title}</p>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-20 bg-white/30" />
      ) : (
        <p className="mt-2 text-3xl font-bold tracking-tight">
          {value?.toLocaleString("en-IN") ?? "—"}
        </p>
      )}
    </div>
  )
}

const taxCardTones = {
  green: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900/40",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/40",
  },
  purple: {
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    border: "border-violet-100 dark:border-violet-900/40",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/40",
  },
} as const

function TaxStatCard({
  title,
  value,
  loading,
  icon: Icon,
  tone,
}: {
  title: string
  value?: string
  loading?: boolean
  icon: React.ComponentType<{ className?: string }>
  tone: keyof typeof taxCardTones
}) {
  const styles = taxCardTones[tone]
  return (
    <Card
      className={cn(
        "transition-shadow duration-200 hover:shadow-md",
        styles.border
      )}
    >
      <CardContent className="relative pt-5 pb-5">
        <div
          className={cn(
            "absolute top-4 right-4 flex size-11 items-center justify-center rounded-full",
            styles.icon
          )}
        >
          <Icon className="size-5" />
        </div>
        <p className="pr-14 text-sm font-medium text-muted-foreground">
          {title}
        </p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-32" />
        ) : (
          <p className="mt-1 truncate text-xl font-bold tracking-tight">
            {value ?? "—"}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function WardCollectionCard({
  ward,
  accent,
}: {
  ward: DashboardSummary["wardBreakdown"][number]
  accent: string
}) {
  const propertyAmount = ward.onlineCollection
  const waterAmount = ward.offlineCollection
  const drainageAmount = ward.pendingCollection
  const total = wardTaxTotal(ward)

  const propertyPct = total > 0 ? Math.round((propertyAmount / total) * 100) : 0
  const waterPct = total > 0 ? Math.round((waterAmount / total) * 100) : 0
  const drainagePct = total > 0 ? Math.round((drainageAmount / total) * 100) : 0

  return (
    <Card
      className={cn(
        "border-t-4 transition-shadow duration-200 hover:shadow-md",
        accent
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Ward {String(ward.number).padStart(2, "0")}
          </p>
          <p className="truncate font-(family-name:--font-deva) text-sm font-semibold">
            {ward.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <Building2 className="size-3.5" />
          {ward.surveyCount}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <MetricRow
          label="Property Tax Rate 10%"
          value={formatRs(propertyAmount)}
          pct={propertyPct}
          barClass="bg-blue-500"
        />
        <MetricRow
          label="Water Tax Rate 7.5%"
          value={formatRs(waterAmount)}
          pct={waterPct}
          barClass="bg-cyan-500"
        />
        <MetricRow
          label="Drainage Tax Rate 2.5%"
          value={formatRs(drainageAmount)}
          pct={drainagePct}
          barClass="bg-amber-500"
        />
        <div className="flex items-center justify-between border-t pt-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Total Tax
            </p>
            <p className="text-sm font-bold">{formatRs(total)}</p>
          </div>
          <StatusBadge status={ward.status} />
        </div>
      </CardContent>
    </Card>
  )
}

function MetricRow({
  label,
  value,
  pct,
  barClass,
}: {
  label: string
  value: string
  pct: number
  barClass: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            barClass
          )}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: WardCardStatus }) {
  if (status === "COMPLETED") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
        Completed
      </Badge>
    )
  }
  if (status === "IN_PROGRESS") {
    return (
      <Badge className="bg-amber-500/15 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300">
        In progress
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Pending
    </Badge>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  )
}
