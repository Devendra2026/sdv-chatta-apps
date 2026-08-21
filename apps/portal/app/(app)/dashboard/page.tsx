"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { ImageIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@workspace/ui/components/button"

import { api } from "@/lib/api"
import { useCan } from "@/hooks/use-permission"

type DashboardSummary = {
  totalProperties: number
  totalCollection: number
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
  }>
}

type Ward = { id: string; number: number; name: string; code: string }

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
      return (await api.get<DashboardSummary>(`/api/v1/dashboard/summary${qs}`)).data
    },
    enabled: allowed,
  })

  if (permLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    )
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
          Sign in as the seeded admin or ask an administrator to assign a role
          with <code className="text-foreground">dashboard:read</code>.
        </p>
      </div>
    )
  }

  const data = summaryQuery.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Executive view across Chhata wards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={wardId} onValueChange={(v) => setWardId(v ?? "all")}>
            <SelectTrigger className="w-70 cursor-pointer">
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
          <Button variant="outline" className="cursor-pointer" render={<Link href="/surveys" />}>
            Open surveys
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          title="Total Properties"
          value={data?.totalProperties}
          loading={summaryQuery.isLoading}
        />
        <Kpi
          title="Total Collection"
          value={
            data
              ? `₹${data.totalCollection.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}`
              : undefined
          }
          loading={summaryQuery.isLoading}
        />
        <Kpi
          title="Pending Payments"
          value={data?.pendingPayments}
          loading={summaryQuery.isLoading}
        />
        <Kpi
          title="Successful Payments"
          value={data?.successPayments}
          loading={summaryQuery.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ward-wise surveys</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-3 font-medium">Ward</th>
                      <th className="py-2 pr-3 font-medium">Name</th>
                      <th className="py-2 font-medium">Surveys</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.wardBreakdown ?? []).map((w) => (
                      <tr key={w.wardId} className="border-b last:border-0">
                        <td className="py-2 pr-3">{w.number}</td>
                        <td className="py-2 pr-3 font-(family-name:--font-deva)">
                          {w.name}
                        </td>
                        <td className="py-2">{w.surveyCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="size-4" />
              Recent uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (data?.recentAttachments?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm">
                No survey images yet. Open a survey and upload photos — files are
                stored in MinIO via Docker.
              </p>
            ) : (
              <ul className="space-y-3">
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
      </div>
    </div>
  )
}

function Kpi({
  title,
  value,
  loading,
}: {
  title: string
  value?: string | number
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-3xl font-semibold tracking-tight">{value ?? "—"}</p>
        )}
      </CardContent>
    </Card>
  )
}
