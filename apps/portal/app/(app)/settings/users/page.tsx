"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, Plus, Search, Users } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { usePermission } from "@/hooks/use-permission"
import { api } from "@/lib/api"
import { filterStaffRoles } from "@/lib/staff-roles"
import { RolePill, UserAvatar } from "../_components/role-pill"
import { SettingsEmptyState } from "../_components/settings-empty-state"
import { SettingsTableLoading } from "../_components/settings-loading"
import { SettingsPageHeader } from "../_components/settings-page-header"
import { StatusBadge } from "../_components/status-badge"

type Role = {
  id: string
  code: string
  name: string
}

type User = {
  id: string
  name: string
  email: string
  status: string
  roles: Array<{ id?: string; code: string; name: string }>
}

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const

export default function UsersPage() {
  const qc = useQueryClient()
  const { can } = usePermission()
  const canCreate = can("user:create")
  const canUpdate = can("user:update")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<User | null>(null)

  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [createRoleIds, setCreateRoleIds] = React.useState<string[]>([])

  const [editName, setEditName] = React.useState("")
  const [editStatus, setEditStatus] = React.useState<string>("ACTIVE")
  const [editRoleIds, setEditRoleIds] = React.useState<string[]>([])
  const [resetLinkUrl, setResetLinkUrl] = React.useState<string | null>(null)
  const [resetLinkLoading, setResetLinkLoading] = React.useState(false)

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [roleFilter, setRoleFilter] = React.useState<string>("all")

  const users = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/api/v1/users")).data,
  })

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get<Role[]>("/api/v1/roles")).data,
  })

  const staffRoles = React.useMemo(
    () => filterStaffRoles(roles.data ?? []),
    [roles.data]
  )

  const filteredUsers = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (users.data ?? []).filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false
      if (
        roleFilter !== "all" &&
        !(u.roles ?? []).some(
          (r) => r.code === roleFilter || r.id === roleFilter
        )
      ) {
        return false
      }
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    })
  }, [users.data, search, statusFilter, roleFilter])

  function resetCreateForm() {
    setName("")
    setEmail("")
    setPassword("")
    setCreateRoleIds([])
  }

  function openEdit(u: User) {
    setEditUser(u)
    setEditName(u.name)
    setEditStatus(u.status)
    setResetLinkUrl(null)
  }

  React.useEffect(() => {
    if (!editUser) {
      setEditRoleIds([])
      return
    }
    if (!staffRoles.length) return
    setEditRoleIds(
      staffRoles
        .filter((r) =>
          editUser.roles.some((ur) => ur.code === r.code || ur.id === r.id)
        )
        .map((r) => r.id)
    )
  }, [editUser?.id, staffRoles])

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post("/api/v1/users", {
        name: name.trim(),
        email: email.trim(),
        password,
        roleIds: createRoleIds.length ? createRoleIds : undefined,
      })
    },
    onSuccess: async () => {
      toast.success("User created")
      setCreateOpen(false)
      resetCreateForm()
      await qc.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) throw new Error("No user selected")
      return api.patch(`/api/v1/users/${editUser.id}`, {
        name: editName.trim(),
        status: editStatus,
        roleIds: editRoleIds,
      })
    },
    onSuccess: async () => {
      toast.success("User updated")
      setEditUser(null)
      await qc.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function generateResetLink() {
    if (!editUser) return
    const confirmed = window.confirm(
      `Generate a password reset link for ${editUser.email}? The link expires in 30 minutes and can only be used once.`
    )
    if (!confirmed) return

    setResetLinkLoading(true)
    setResetLinkUrl(null)
    try {
      const res = await api.post<{ resetUrl: string; expiresAt: string }>(
        `/api/v1/users/${editUser.id}/password-reset-link`
      )
      setResetLinkUrl(res.data.resetUrl)
      toast.success("Password reset link generated")
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not generate reset link"
      )
    } finally {
      setResetLinkLoading(false)
    }
  }

  async function copyResetLink() {
    if (!resetLinkUrl) return
    try {
      await navigator.clipboard.writeText(resetLinkUrl)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Could not copy link")
    }
  }

  function toggleRole(
    roleId: string,
    selected: string[],
    setSelected: (ids: string[]) => void
  ) {
    if (selected.includes(roleId)) {
      setSelected(selected.filter((id) => id !== roleId))
    } else {
      setSelected([...selected, roleId])
    }
  }

  return (
    <div className="space-y-4">
      <SettingsPageHeader
        title="Users"
        description="Provision staff accounts, assign roles, and set initial passwords. Super Admin only."
        actions={
          canCreate ? (
            <Button
              className="cursor-pointer"
              onClick={() => {
                resetCreateForm()
                setCreateOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden />
              Create user
            </Button>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-premium)]">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "all")}
            items={[
              { value: "all", label: "All statuses" },
              ...STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
            ]}
          >
            <SelectTrigger className="w-full cursor-pointer sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="all"
                label="All statuses"
                className="cursor-pointer"
              >
                All statuses
              </SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  label={s}
                  className="cursor-pointer"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v ?? "all")}
            items={[
              { value: "all", label: "All roles" },
              ...staffRoles.map((r) => ({
                value: r.code,
                label: r.name,
              })),
            ]}
          >
            <SelectTrigger className="w-full cursor-pointer sm:w-[180px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="all"
                label="All roles"
                className="cursor-pointer"
              >
                All roles
              </SelectItem>
              {staffRoles.map((r) => (
                <SelectItem
                  key={r.id}
                  value={r.code}
                  label={r.name}
                  className="cursor-pointer"
                >
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {users.isLoading ? (
          <SettingsTableLoading />
        ) : filteredUsers.length === 0 ? (
          <SettingsEmptyState
            icon={Users}
            title={
              (users.data?.length ?? 0) === 0
                ? "No users found"
                : "No matching users"
            }
            description={
              (users.data?.length ?? 0) === 0
                ? "Create a staff account to get started."
                : "Try adjusting search or filters."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                {canUpdate ? (
                  <TableHead className="px-4 text-right">Actions</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className="transition-colors duration-150">
                  <TableCell className="px-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.name} />
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(u.roles ?? []).map((r) => (
                        <RolePill key={r.code} code={r.code} />
                      ))}
                      {(u.roles ?? []).length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  {canUpdate ? (
                    <TableCell className="px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create staff user</DialogTitle>
            <DialogDescription>
              Sets an initial password for email sign-in. Assign Department
              Admin, Clerk, or Operator (Super Admin optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Profile
              </p>
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Initial password</Label>
                <Input
                  id="create-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={12}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Roles
              </p>
              <p className="text-xs text-muted-foreground">
                Leave empty to assign Operator by default.
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                {staffRoles.map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={createRoleIds.includes(r.id)}
                      onCheckedChange={() =>
                        toggleRole(r.id, createRoleIds, setCreateRoleIds)
                      }
                    />
                    <span>
                      {r.name}{" "}
                      <span className="text-muted-foreground">({r.code})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              disabled={
                createMutation.isPending ||
                name.trim().length < 2 ||
                !email.trim() ||
                password.length < 12
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editUser)}
        onOpenChange={(open) => {
          if (!open) setEditUser(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Profile
              </p>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Status
              </p>
              <Label htmlFor="edit-status" className="sr-only">
                Status
              </Label>
              <Select
                value={editStatus}
                onValueChange={(v) => {
                  if (v) setEditStatus(v)
                }}
                items={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              >
                <SelectTrigger
                  id="edit-status"
                  className="w-full cursor-pointer"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      label={s}
                      className="cursor-pointer"
                    >
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Roles
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                {staffRoles.map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={editRoleIds.includes(r.id)}
                      onCheckedChange={() =>
                        toggleRole(r.id, editRoleIds, setEditRoleIds)
                      }
                    />
                    <span>
                      {r.name}{" "}
                      <span className="text-muted-foreground">({r.code})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {canUpdate ? (
              <div className="space-y-3 rounded-lg border border-dashed p-4">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Password reset
                </p>
                <p className="text-xs text-muted-foreground">
                  Generate a one-time reset link to share with this user. The
                  link is not emailed automatically.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={resetLinkLoading}
                  onClick={() => void generateResetLink()}
                >
                  {resetLinkLoading
                    ? "Generating…"
                    : "Generate password reset link"}
                </Button>
                {resetLinkUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-emerald-700">
                      Reset link generated successfully.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={resetLinkUrl}
                        className="font-mono text-xs"
                        aria-label="Password reset link"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 cursor-pointer"
                        onClick={() => void copyResetLink()}
                        aria-label="Copy reset link"
                      >
                        <Copy className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setEditUser(null)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              disabled={updateMutation.isPending || editName.trim().length < 2}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
