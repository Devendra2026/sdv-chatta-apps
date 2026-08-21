"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { api } from "@/lib/api"

type Payment = {
  id: string
  paymentReference: string
  amount: string
  status: string
  paymentMode: string
  payerName: string | null
  createdAt: string
}

export default function PaymentsPage() {
  const query = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await api.get<Payment[]>("/api/v1/payments")).data,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <Button className="cursor-pointer" render={<Link href="/payments/offline" />}>
          Offline collection
        </Button>
      </div>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Reference</th>
              <th className="p-2">Payer</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Mode</th>
              <th className="p-2">Status</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2 font-medium">{p.paymentReference}</td>
                <td className="p-2">{p.payerName ?? "—"}</td>
                <td className="p-2">₹{Number(p.amount).toLocaleString("en-IN")}</td>
                <td className="p-2">{p.paymentMode}</td>
                <td className="p-2">
                  <Badge variant="secondary">{p.status}</Badge>
                </td>
                <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
