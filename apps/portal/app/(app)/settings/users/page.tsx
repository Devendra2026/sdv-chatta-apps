"use client"

import { useQuery } from "@tanstack/react-query"

import { Badge } from "@workspace/ui/components/badge"

import { api } from "@/lib/api"

type User = {
  id: string
  name: string
  email: string
  status: string
  roles: Array<{ code: string; name: string }>
}

export default function UsersPage() {
  const query = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/api/v1/users")).data,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Roles</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-2 font-medium">{u.name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {(u.roles ?? []).map((r) => (
                      <Badge key={r.code} variant="secondary">
                        {r.code}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-2">{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
