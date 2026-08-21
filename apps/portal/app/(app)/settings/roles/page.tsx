"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"

import { api } from "@/lib/api"

type Permission = { id: string; code: string; resource: string; action: string }
type Role = {
  id: string
  code: string
  name: string
  isSystem: boolean
  permissions: Permission[]
  _count?: { userRoles: number }
}

export default function RolesPage() {
  const qc = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null)

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get<Role[]>("/api/v1/roles")).data,
  })
  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => (await api.get<Permission[]>("/api/v1/permissions")).data,
  })

  const selected = roles.data?.find((r) => r.id === selectedRoleId) ?? roles.data?.[0]
  const selectedIds = new Set(selected?.permissions.map((p) => p.id) ?? [])

  const save = useMutation({
    mutationFn: async (permissionIds: string[]) => {
      if (!selected) throw new Error("No role selected")
      return api.patch(`/api/v1/roles/${selected.id}`, { permissionIds })
    },
    onSuccess: async () => {
      toast.success("Role permissions updated")
      await qc.invalidateQueries({ queryKey: ["roles"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [draft, setDraft] = React.useState<Set<string>>(new Set())
  React.useEffect(() => {
    setDraft(new Set(selectedIds))
    if (selected && !selectedRoleId) setSelectedRoleId(selected.id)
  }, [selected?.id])

  const byResource = React.useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of permissions.data ?? []) {
      const list = map.get(p.resource) ?? []
      list.push(p)
      map.set(p.resource, list)
    }
    return [...map.entries()]
  }, [permissions.data])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Roles & permission matrix</h1>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="rounded-lg border p-2">
          {(roles.data ?? []).map((r) => (
            <button
              key={r.id}
              type="button"
              className={`hover:bg-muted flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${selected?.id === r.id ? "bg-muted" : ""}`}
              onClick={() => setSelectedRoleId(r.id)}
            >
              <span>{r.name}</span>
              {r.isSystem ? <Badge variant="outline">system</Badge> : null}
            </button>
          ))}
        </div>
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{selected?.name}</p>
              <p className="text-muted-foreground text-xs">{selected?.code}</p>
            </div>
            <Button
              className="cursor-pointer"
              disabled={save.isPending || !selected}
              onClick={() => save.mutate([...draft])}
            >
              Save matrix
            </Button>
          </div>
          {byResource.map(([resource, perms]) => (
            <div key={resource} className="space-y-2">
              <p className="text-sm font-medium capitalize">{resource}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {perms.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.has(p.id)}
                      onCheckedChange={(checked) => {
                        setDraft((prev) => {
                          const next = new Set(prev)
                          if (checked) next.add(p.id)
                          else next.delete(p.id)
                          return next
                        })
                      }}
                    />
                    <span>{p.code}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
