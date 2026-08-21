"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

export default function RefundsPage() {
  const query = useQuery({
    queryKey: ["refunds"],
    queryFn: async () =>
      (await api.get<Array<{ id: string; refundReference: string; amount: string; status: string }>>(
        "/api/v1/payments/refunds"
      )).data,
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Refunds</h1>
      <ul className="space-y-2 text-sm">
        {(query.data ?? []).map((r) => (
          <li key={r.id} className="flex justify-between border-b py-2">
            <span>{r.refundReference}</span>
            <span>
              ₹{Number(r.amount).toLocaleString("en-IN")} · {r.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
