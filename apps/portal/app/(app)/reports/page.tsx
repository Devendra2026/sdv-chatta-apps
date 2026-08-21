"use client"

import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"

import { api } from "@/lib/api"

export default function ReportsPage() {
  const surveys = useQuery({
    queryKey: ["report-surveys"],
    queryFn: async () =>
      (await api.get<{ total: number; byUse: Array<{ propertyUse: string | null; _count: { _all: number } }> }>("/api/v1/reports/surveys")).data,
  })
  const payments = useQuery({
    queryKey: ["report-payments"],
    queryFn: async () =>
      (await api.get<{ successTotal: number; successCount: number }>("/api/v1/reports/payments")).data,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <Button
          className="cursor-pointer"
          onClick={() => {
            window.open(
              `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/reports/surveys/export`,
              "_blank"
            )
          }}
        >
          Export survey Excel
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Survey summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Total properties: {surveys.data?.total ?? "—"}</p>
            <ul className="space-y-1">
              {(surveys.data?.byUse ?? []).slice(0, 8).map((r) => (
                <li key={String(r.propertyUse)} className="flex justify-between">
                  <span>{r.propertyUse ?? "Unknown"}</span>
                  <span>{r._count._all}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Successful payments: {payments.data?.successCount ?? "—"}</p>
            <p>
              Collection: ₹
              {(payments.data?.successTotal ?? 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
