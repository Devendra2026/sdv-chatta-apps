"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

type Permission = { id: string; code: string; resource: string; action: string; description: string | null }

export default function PermissionsPage() {
  const query = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => (await api.get<Permission[]>("/api/v1/permissions")).data,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Permissions catalog</h1>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Code</th>
              <th className="p-2">Resource</th>
              <th className="p-2">Action</th>
              <th className="p-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2 font-mono text-xs">{p.code}</td>
                <td className="p-2">{p.resource}</td>
                <td className="p-2">{p.action}</td>
                <td className="p-2">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
