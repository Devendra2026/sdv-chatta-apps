"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

type AuditLog = {
  id: string
  action: string
  entity: string
  entityId: string | null
  createdAt: string
  actor?: { name: string; email: string } | null
}

export default function AuditLogsPage() {
  const query = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await api.get<AuditLog[]>("/api/v1/audit-logs")).data,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">When</th>
              <th className="p-2">Action</th>
              <th className="p-2">Entity</th>
              <th className="p-2">Actor</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((log) => (
              <tr key={log.id} className="border-b">
                <td className="p-2">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="p-2 font-medium">{log.action}</td>
                <td className="p-2">
                  {log.entity}
                  {log.entityId ? `:${log.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="p-2">{log.actor?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
