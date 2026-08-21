"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Droplets,
  Home,
  ImageIcon,
  IndianRupee,
  MapPin,
  Wallet,
} from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
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
import { cn } from "@workspace/ui/lib/utils"

import { api } from "@/lib/api"
import { useCan } from "@/hooks/use-permission"

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
  recentAttachments: Array<{
    id: string
    originalFileName: string
    mimeType: string
    createdAt: string
    url: string | null
    survey: { id: string; surveyId: string; ownerName: string | null }
  }>
  wardBreakdown: Array<{
    wardId: string
    number: number
    code: string
    name: string
    surveyCount: number
    onlineCollection: number
    offlineCollection: number
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

const collectionChartConfig = {
  online: { label: "Online", color: "var(--chart-1)" },
  offline: { label: "Offline", color: "var(--chart-2)" },
  pending: { label: "Pending", color: "var(--chart-3)" },
} satisfies ChartConfig

const wardChartConfig = {
  surveyCount: { label: "Properties", color: "var(--chart-1)" },
} satisfies ChartConfig

function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function formatInrCompact(value: number): string {
  return `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function DashboardPage() {
  const { allowed, isLoading: permLoading, isError: permError } =
    useCan("dashboard:read")
  const [wardId, setWardId] = React.useState<string>("all")

  const wardsQuery = useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await api.get<Ward[]>("/api/v1/wards")).data,
    enabled: allowed,
  })

  const summaryQuery = useQuery({
    queryKey: ["dashboard", wardId],
    queryFn: async () => {
      const qs = wardId !== "all" ? `?wardId=${wardId}` : ""
      return (
        await api.get<DashboardSummary>(`/api/v1/dashboard/summary${qs}`)
      ).data
    },
    enabled: allowed,
  })

  if (permLoading) {
    return <DashboardSkeleton />
  }

  if (permError) {
    return (
      <p className="text-muted-foreground text-sm">
        Could not verify access. Confirm the API is running and try refreshing.
      </p>
    )
  }

  if (!allowed) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          You do not have access to the dashboard.
        </p>
        <p className="text-muted-foreground text-xs">
          Ask an administrator for{" "}
          <code className="text-foreground">dashboard:read</code>.
        </p>
      </div>
    )
  }

  const data = summaryQuery.data
  const loading = summaryQuery.isLoading
  const maxWardCollection = Math.max(
    1,
    ...(data?.wardBreakdown.map((w) => w.totalCollection) ?? [1])
  )

  const collectionMix = [
    {
      key: "online",
      name: "Online",
      value: data?.onlineCollection ?? 0,
      fill: "var(--color-online)",
    },
    {
      key: "offline",
      name: "Offline",
      value: data?.offlineCollection ?? 0,
      fill: "var(--color-offline)",
    },
    {
      key: "pending",
      name: "Pending",
      value: data?.pendingCollection ?? 0,
      fill: "var(--color-pending)",
    },
  ]
  const collectionMixTotal = collectionMix.reduce((s, r) => s + r.value, 0)

  const wardBars = (data?.wardBreakdown ?? []).map((w) => ({
    ward: String(w.number),
    name: w.name,
    surveyCount: w.surveyCount,
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-primary text-sm font-medium">Dashboard</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Nagar Panchayat Chhata
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ward survey progress, property records &amp; collection analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={wardId} onValueChange={(v) => setWardId(v ?? "all")}>
            <SelectTrigger className="w-64 cursor-pointer rounded-xl">
              <SelectValue placeholder="All wards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wards</SelectItem>
              {(wardsQuery.data ?? []).map((w) => (
                <SelectItem key={w.id} value={w.id}>
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
        <SectionHeading
          title="Ward Wise Survey Statistics"
          accent="text-emerald-600 dark:text-emerald-400"
        />
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
            value={data?.draftSurveys}
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
        <SectionHeading
          title="Property Wise Survey Statistics"
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SoftStatCard
            title="Total Properties"
            value={
              data ? data.totalProperties.toLocaleString("en-IN") : undefined
            }
            hint="Survey records"
            loading={loading}
            icon={Home}
            tone="blue"
          />
          <SoftStatCard
            title="Online Collection"
            value={data ? formatInrCompact(data.onlineCollection) : undefined}
            hint="Successful online payments"
            loading={loading}
            icon={Wallet}
            tone="green"
          />
          <SoftStatCard
            title="Offline Collection"
            value={data ? formatInrCompact(data.offlineCollection) : undefined}
            hint="Cash, cheque, UPI & other"
            loading={loading}
            icon={Droplets}
            tone="cyan"
          />
          <SoftStatCard
            title="Total Collection"
            value={data ? formatInrCompact(data.totalCollection) : undefined}
            hint="All successful payments"
            loading={loading}
            icon={IndianRupee}
            tone="purple"
          />
        </div>
      </section>

      {/* 3. Charts & Analytics */}
      <section className="space-y-3">
        <SectionHeading
          title="Charts & Analytics"
          icon={Wallet}
        />
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Collection Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="mx-auto size-48 rounded-full" />
              ) : collectionMixTotal === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">
                  No collection data yet for this filter.
                </p>
              ) : (
                <>
                  <ChartContainer
                    config={collectionChartConfig}
                    className="mx-auto aspect-square max-h-56"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            nameKey="key"
                            hideLabel
                            formatter={(value) =>
                              formatInr(Number(value ?? 0))
                            }
                          />
                        }
                      />
                      <Pie
                        data={collectionMix}
                        dataKey="value"
                        nameKey="key"
                        innerRadius={58}
                        outerRadius={84}
                        strokeWidth={2}
                      >
                        {collectionMix.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend
                        content={<ChartLegendContent nameKey="key" />}
                      />
                    </PieChart>
                  </ChartContainer>
                  <table className="text-muted-foreground mt-2 w-full text-xs">
                    <caption className="sr-only">
                      Collection amounts by channel
                    </caption>
                    <tbody>
                      {collectionMix.map((row) => (
                        <tr key={row.key} className="border-t">
                          <td className="py-1.5">{row.name}</td>
                          <td className="text-foreground py-1.5 text-right font-medium">
                            {formatInr(row.value)}
                          </td>
                        </tr>
                      ))}
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
                              | { ward?: string; name?: string }
                              | undefined
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
          <div>
            <SectionHeading title="Ward Tax Collection Cards" />
            <p className="text-muted-foreground text-sm">
              Ward wise survey data &amp; successful collection
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
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
                maxCollection={maxWardCollection}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent uploads */}
      <section className="grid gap-4 xl:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="size-4" />
              Recent uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (data?.recentAttachments?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm">
                No survey images yet. Open a survey and upload photos.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data!.recentAttachments.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    {a.url && a.mimeType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.url}
                        alt={a.originalFileName}
                        className="size-14 rounded-md object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex size-14 items-center justify-center rounded-md">
                        <ImageIcon className="text-muted-foreground size-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/surveys/${a.survey.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {a.survey.surveyId}
                      </Link>
                      <p className="text-muted-foreground truncate text-xs">
                        {a.originalFileName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {a.survey.ownerName ?? "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function SectionHeading({
  title,
  accent,
  icon: Icon,
}: {
  title: string
  accent?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <h2
      className={cn(
        "flex items-center gap-2 text-base font-semibold tracking-tight",
        accent ?? "text-foreground"
      )}
    >
      {Icon ? <Icon className="text-primary size-4" /> : null}
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
        "relative overflow-hidden rounded-2xl bg-linear-to-br p-5 text-white shadow-md",
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

const softTones = {
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  purple: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
} as const

function SoftStatCard({
  title,
  value,
  hint,
  loading,
  icon: Icon,
  tone,
}: {
  title: string
  value?: string
  hint: string
  loading?: boolean
  icon: React.ComponentType<{ className?: string }>
  tone: keyof typeof softTones
}) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="flex items-start gap-3 pt-5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            softTones[tone]
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-28" />
          ) : (
            <p className="mt-1 truncate text-xl font-bold tracking-tight">
              {value ?? "—"}
            </p>
          )}
          <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function WardCollectionCard({
  ward,
  accent,
  maxCollection,
}: {
  ward: DashboardSummary["wardBreakdown"][number]
  accent: string
  maxCollection: number
}) {
  const onlinePct =
    maxCollection > 0
      ? Math.round((ward.onlineCollection / maxCollection) * 100)
      : 0
  const offlinePct =
    maxCollection > 0
      ? Math.round((ward.offlineCollection / maxCollection) * 100)
      : 0
  const totalPct =
    maxCollection > 0
      ? Math.round((ward.totalCollection / maxCollection) * 100)
      : 0

  return (
    <Card
      className={cn(
        "border-t-4 transition-shadow duration-200 hover:shadow-md",
        accent
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            Ward {String(ward.number).padStart(2, "0")}
          </p>
          <p className="truncate font-(family-name:--font-deva) text-sm font-semibold">
            {ward.name}
          </p>
        </div>
        <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs font-medium">
          <Building2 className="size-3.5" />
          {ward.surveyCount}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <MetricRow
          icon={Home}
          label="Online collection"
          value={formatInrCompact(ward.onlineCollection)}
          pct={onlinePct}
          barClass="bg-blue-500"
        />
        <MetricRow
          icon={Droplets}
          label="Offline collection"
          value={formatInrCompact(ward.offlineCollection)}
          pct={offlinePct}
          barClass="bg-cyan-500"
        />
        <MetricRow
          icon={Wallet}
          label="Share of max ward"
          value={`${totalPct}%`}
          pct={totalPct}
          barClass="bg-amber-500"
        />
        <div className="flex items-center justify-between border-t pt-3">
          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Total tax
            </p>
            <p className="text-sm font-bold">
              {formatInrCompact(ward.totalCollection)}
            </p>
          </div>
          <StatusBadge status={ward.status} />
        </div>
      </CardContent>
    </Card>
  )
}

function MetricRow({
  icon: Icon,
  label,
  value,
  pct,
  barClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  pct: number
  barClass: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-all duration-300", barClass)}
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
