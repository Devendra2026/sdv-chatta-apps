"use client"

import { useQuery } from "@tanstack/react-query"
import { Loader2, Search } from "lucide-react"
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

import { api } from "@/lib/api"

type SurveyRow = {
  id: string
  surveyId: string
  ownerName: string | null
  propertyNo: string | null
  ward: { number: number; name: string } | null
}

type LedgerPayload = {
  survey: {
    id: string
    surveyId: string
    ownerName: string | null
    ownerFatherName: string | null
    mobile: string | null
    propertyNo: string | null
    parcelNo: string | null
    houseNo: string | null
    ward: { number: number; name: string } | null
  }
  demands: Array<{
    id: string
    status: string
    totalPayable: number
    amountPaid: number
    outstanding: number
    assessmentYear?: { name: string } | null
  }>
  payments: Array<{
    id: string
    receiptNumber: string | null
    amount: number
    paymentMode: string
    channel: "ONLINE" | "OFFLINE"
    collectionDate: string
    assessmentYear?: { name: string } | null
  }>
}

function money(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function CustomerLedgerPage() {
  const [search, setSearch] = React.useState("")
  const [debounced, setDebounced] = React.useState("")
  const [surveyId, setSurveyId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const searchQuery = useQuery({
    queryKey: ["ledger-survey-search", debounced],
    enabled: debounced.length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "12",
        search: debounced,
      })
      return (await api.get<SurveyRow[]>(`/api/v1/surveys?${params}`)).data
    },
  })

  const ledgerQuery = useQuery({
    queryKey: ["customer-ledger", surveyId],
    enabled: Boolean(surveyId),
    queryFn: async () =>
      (
        await api.get<LedgerPayload>(
          `/api/v1/demands/ledger?surveyId=${encodeURIComponent(surveyId!)}`
        )
      ).data,
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Customer Ledger
        </h1>
        <p className="text-sm text-muted-foreground">
          Read-only demand and payment history by property
        </p>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find property</CardTitle>
          <CardDescription>
            Search survey ID, owner, property or parcel number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
            />
          </div>
          {searchQuery.isFetching ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : null}
          {(searchQuery.data ?? []).length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2">Survey</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2">Ward</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(searchQuery.data ?? []).map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="px-3 py-2 font-medium">{row.surveyId}</td>
                      <td className="px-3 py-2">{row.ownerName ?? "—"}</td>
                      <td className="px-3 py-2">
                        {row.ward
                          ? `${String(row.ward.number).padStart(2, "0")} · ${row.ward.name}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            surveyId === row.id ? "default" : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => setSurveyId(row.id)}
                        >
                          Open ledger
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {ledgerQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading ledger…
        </div>
      ) : null}

      {ledgerQuery.data ? (
        <>
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {ledgerQuery.data.survey.surveyId}
              </CardTitle>
              <CardDescription>
                {ledgerQuery.data.survey.ownerName ?? "—"} · Father/Husband{" "}
                {ledgerQuery.data.survey.ownerFatherName ?? "—"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Property {ledgerQuery.data.survey.propertyNo ?? "—"} · Parcel{" "}
              {ledgerQuery.data.survey.parcelNo ?? "—"} · House{" "}
              {ledgerQuery.data.survey.houseNo ?? "—"}
            </CardContent>
          </Card>

          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Demands</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Payable</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerQuery.data.demands.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        No demands
                      </td>
                    </tr>
                  ) : (
                    ledgerQuery.data.demands.map((d) => (
                      <tr key={d.id} className="border-b">
                        <td className="px-3 py-2">
                          {d.assessmentYear?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary">{d.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          ₹{money(d.totalPayable)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          ₹{money(d.amountPaid)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          ₹{money(d.outstanding)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payments</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Receipt</th>
                    <th className="px-3 py-2">Channel</th>
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerQuery.data.payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        No successful payments
                      </td>
                    </tr>
                  ) : (
                    ledgerQuery.data.payments.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="px-3 py-2">
                          {new Date(p.collectionDate).toLocaleDateString(
                            "en-IN"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {p.receiptNumber ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              p.channel === "ONLINE" ? "default" : "outline"
                            }
                          >
                            {p.channel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{p.paymentMode}</td>
                        <td className="px-3 py-2">
                          {p.assessmentYear?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          ₹{money(p.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a property to view its ledger.
        </p>
      )}
    </div>
  )
}
