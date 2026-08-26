"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Lock, Shield } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { cn } from "@workspace/ui/lib/utils"

import { usePermission } from "@/hooks/use-permission"
import { api } from "@/lib/api"
import {
  filterStaffRoles,
  isStaffRoleCode,
  STAFF_ROLE_META,
  type StaffRoleCode,
} from "@/lib/staff-roles"
import { SettingsEmptyState } from "../_components/settings-empty-state"
import { SettingsMatrixLoading } from "../_components/settings-loading"
import { SettingsPageHeader } from "../_components/settings-page-header"

type Permission = {
  id: string
  code: string
  resource: string
  action: string
}
type Role = {
  id: string
  code: string
  name: string
  description?: string | null
  isSystem: boolean
  permissions: Permission[]
  _count?: { userRoles: number }
}

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

export default function RolesPage() {
  const qc = useQueryClient()
  const { can } = usePermission()
  const canUpdate = can("role:update")
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(
    null
  )

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get<Role[]>("/api/v1/roles")).data,
  })
  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: async () =>
      (await api.get<Permission[]>("/api/v1/permissions")).data,
  })

  const staffRoles = React.useMemo(
    () => filterStaffRoles(roles.data ?? []),
    [roles.data]
  )

  const selected =
    staffRoles.find((r) => r.id === selectedRoleId) ?? staffRoles[0]
  const selectedIds = new Set(selected?.permissions.map((p) => p.id) ?? [])
  const selectedMeta =
    selected && isStaffRoleCode(selected.code)
      ? STAFF_ROLE_META[selected.code]
      : null
  const isFullAccessRole =
    selected?.code === "SUPER_ADMIN" || selected?.code === "ADMIN"
  const canEditMatrix = canUpdate && !isFullAccessRole

  const [draft, setDraft] = React.useState<Set<string>>(new Set())
  React.useEffect(() => {
    setDraft(new Set(selectedIds))
    if (selected && !selectedRoleId) setSelectedRoleId(selected.id)
  }, [selected?.id])

  const isDirty = !setsEqual(draft, selectedIds)

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

  const byResource = React.useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of permissions.data ?? []) {
      const list = map.get(p.resource) ?? []
      list.push(p)
      map.set(p.resource, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [permissions.data])

  function toggleGroup(perms: Permission[], checked: boolean) {
    setDraft((prev) => {
      const next = new Set(prev)
      for (const p of perms) {
        if (checked) next.add(p.id)
        else next.delete(p.id)
      }
      return next
    })
  }

  const isLoading = roles.isLoading || permissions.isLoading

  return (
    <div className="space-y-4">
      <SettingsPageHeader
        title="Roles & permission matrix"
        description="Four staff roles: Super Admin, Admin, Clerk, and Operator. Adjust Clerk and Operator permissions as needed."
      />

      {isLoading ? (
        <SettingsMatrixLoading />
      ) : staffRoles.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-[var(--shadow-premium)]">
          <SettingsEmptyState
            icon={Shield}
            title="Staff roles not provisioned"
            description="Run the API seed to create Super Admin, Admin, Clerk, and Operator."
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="flex h-fit flex-col gap-2 rounded-xl border bg-card p-3 shadow-[var(--shadow-premium)] lg:sticky lg:top-20">
            <p className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Staff roles
            </p>
            <div className="space-y-1.5">
              {staffRoles.map((r) => {
                const code = r.code as StaffRoleCode
                const meta = STAFF_ROLE_META[code]
                const Icon = meta.icon
                const isSelected = selected?.id === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150",
                      isSelected
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:bg-muted"
                    )}
                    onClick={() => setSelectedRoleId(r.id)}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        meta.accent
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isSelected && "text-primary"
                          )}
                        >
                          {meta.name}
                        </span>
                        {typeof r._count?.userRoles === "number" ? (
                          <span className="text-xs text-muted-foreground">
                            {r._count.userRoles}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {meta.access}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-[var(--shadow-premium)] sm:p-5">
            {!selected || !selectedMeta ? (
              <SettingsEmptyState
                icon={Shield}
                title="Select a role"
                description="Choose Super Admin, Admin, Clerk, or Operator."
              />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl",
                        selectedMeta.accent
                      )}
                    >
                      <selectedMeta.icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold tracking-tight">
                          {selectedMeta.name}
                        </p>
                        <Badge variant="outline">{selectedMeta.access}</Badge>
                        {isDirty && canEditMatrix ? (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-900"
                          >
                            Unsaved changes
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        {selected.description?.trim() || selectedMeta.summary}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selected.code}
                        {typeof selected._count?.userRoles === "number"
                          ? ` · ${selected._count.userRoles} user(s)`
                          : null}
                      </p>
                    </div>
                  </div>
                  {canEditMatrix ? (
                    <Button
                      className="cursor-pointer"
                      disabled={save.isPending || !isDirty}
                      onClick={() => save.mutate([...draft])}
                    >
                      {save.isPending ? "Saving…" : "Save matrix"}
                    </Button>
                  ) : null}
                </div>

                {isFullAccessRole ? (
                  <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                    <Lock
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <div>
                      <p className="font-medium text-foreground">
                        Full access role
                      </p>
                      <p className="text-muted-foreground">
                        {selectedMeta.name} receives all permissions. The matrix
                        is locked so admin and super-admin access stays
                        complete.
                      </p>
                    </div>
                  </div>
                ) : null}

                {byResource.map(([resource, perms]) => {
                  const allChecked = isFullAccessRole
                    ? true
                    : perms.every((p) => draft.has(p.id))
                  return (
                    <div key={resource} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium capitalize">
                          {resource}
                        </p>
                        {canEditMatrix ? (
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                            <Checkbox
                              checked={allChecked}
                              onCheckedChange={(checked) =>
                                toggleGroup(perms, checked === true)
                              }
                              aria-label={`Select all ${resource} permissions`}
                            />
                            Select all
                          </label>
                        ) : null}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {perms.map((p) => {
                          const checked = isFullAccessRole
                            ? true
                            : draft.has(p.id)
                          return (
                            <label
                              key={p.id}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors duration-150",
                                canEditMatrix
                                  ? "cursor-pointer hover:bg-muted/50"
                                  : "cursor-default opacity-90",
                                checked && "border-primary/30 bg-primary/5"
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={!canEditMatrix}
                                onCheckedChange={(value) => {
                                  setDraft((prev) => {
                                    const next = new Set(prev)
                                    if (value) next.add(p.id)
                                    else next.delete(p.id)
                                    return next
                                  })
                                }}
                              />
                              <span className="font-mono text-xs">
                                {p.code}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
