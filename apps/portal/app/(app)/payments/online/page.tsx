"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

export default function OnlinePaymentsPage() {
  const query = useQuery({
    queryKey: ["payments", "online"],
    queryFn: async () =>
      (await api.get<Array<{ id: string; paymentReference: string; status: string; amount: string }>>(
        "/api/v1/payments?paymentMode=ONLINE"
      )).data,
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Online Transactions</h1>
      <ul className="space-y-2 text-sm">
        {(query.data ?? []).map((p) => (
          <li key={p.id} className="flex justify-between border-b py-2">
            <span>{p.paymentReference}</span>
            <span>
              ₹{Number(p.amount).toLocaleString("en-IN")} · {p.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
