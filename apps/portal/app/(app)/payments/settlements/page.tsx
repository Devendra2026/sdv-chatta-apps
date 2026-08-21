"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

export default function SettlementsPage() {
  const query = useQuery({
    queryKey: ["settlements"],
    queryFn: async () =>
      (await api.get<Array<{ id: string; merchTxnId: string | null; amount: string | null; status: string | null }>>(
        "/api/v1/payments/settlements"
      )).data,
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settlements</h1>
      <ul className="space-y-2 text-sm">
        {(query.data ?? []).map((s) => (
          <li key={s.id} className="flex justify-between border-b py-2">
            <span>{s.merchTxnId ?? s.id}</span>
            <span>
              ₹{Number(s.amount ?? 0).toLocaleString("en-IN")} · {s.status ?? "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
