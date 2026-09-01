"use client"

import { useQuery } from "@tanstack/react-query"
import type { StaffPaymentReceipt } from "@workspace/types"
import { Loader2, Printer } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { useCan } from "@/hooks/use-permission"
import { api } from "@/lib/api"

import { printOfflinePaymentReceipt } from "./offline/_lib/receipt-template"

type Payment = {
  id: string
  paymentReference: string
  amount: string
  status: string
  paymentMode: string
  payerName: string | null
  createdAt: string
  survey?: {
    id: string
    surveyId: string
    ownerName: string | null
  } | null
  ward?: {
    number: number
    name: string
  } | null
}

type PaymentsMeta = {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function PaymentsPage() {
  const [page, setPage] = React.useState(1)
  const [printingId, setPrintingId] = React.useState<string | null>(null)
  const pageSize = 20
  const { allowed: canCollectOffline } = useCan("payment:offline:create")

  const query = useQuery({
    queryKey: ["payments", page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      const res = await api.get<Payment[]>(`/api/v1/payments?${params}`)
      return {
        items: res.data,
        meta: res.meta as PaymentsMeta | undefined,
      }
    },
  })

  const rows = query.data?.items ?? []
  const meta = query.data?.meta

  const handlePrint = async (payment: Payment) => {
    if (payment.status !== "SUCCESS") {
      toast.error("Receipt is only available for successful payments")
      return
    }
    setPrintingId(payment.id)
    try {
      const receipt = (
        await api.get<StaffPaymentReceipt>(
          `/api/v1/payments/${payment.id}/receipt`
        )
      ).data
      const ok = await printOfflinePaymentReceipt(receipt)
      if (!ok) {
        toast.error("Popup blocked. Please allow popups for this site.")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load receipt")
    } finally {
      setPrintingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        {canCollectOffline ? (
          <Button
            className="cursor-pointer"
            render={<Link href="/payments/offline" />}
          >
            Offline collection
          </Button>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Reference</th>
              <th className="p-2">Property / Owner</th>
              <th className="p-2">Payer</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Mode</th>
              <th className="p-2">Status</th>
              <th className="p-2">Date</th>
              <th className="p-2">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  No payments found
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2 font-medium">{p.paymentReference}</td>
                  <td className="p-2">
                    {p.survey ? (
                      <div>
                        <div className="font-medium">{p.survey.surveyId}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.survey.ownerName ?? "—"}
                          {p.ward
                            ? ` · Ward ${String(p.ward.number).padStart(2, "0")}`
                            : ""}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2">{p.payerName ?? "—"}</td>
                  <td className="p-2">
                    ₹{Number(p.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="p-2">{p.paymentMode}</td>
                  <td className="p-2">
                    <Badge variant="secondary">{p.status}</Badge>
                  </td>
                  <td className="p-2">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2">
                    {p.status === "SUCCESS" && p.paymentMode !== "ONLINE" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={printingId === p.id}
                        onClick={() => void handlePrint(p)}
                      >
                        {printingId === p.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Printer className="size-3.5" />
                        )}
                        Print
                      </Button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} ({meta.total} records)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={page >= meta.totalPages || query.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : meta && meta.total > 0 ? (
        <p className="text-xs text-muted-foreground">
          {meta.total} {meta.total === 1 ? "payment" : "payments"}
        </p>
      ) : null}
    </div>
  )
}
