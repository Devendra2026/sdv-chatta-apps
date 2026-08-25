"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
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

import { usePermission } from "@/hooks/use-permission"
import { api } from "@/lib/api"

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

  const users = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/api/v1/users")).data,
  })

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get<Role[]>("/api/v1/roles")).data,
    enabled: canCreate || canUpdate,
  })

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
  }

  React.useEffect(() => {
    if (!editUser) {
      setEditRoleIds([])
      return
    }
    const catalog = roles.data ?? []
    if (!catalog.length) return
    setEditRoleIds(
      catalog
        .filter((r) =>
          editUser.roles.some((ur) => ur.code === r.code || ur.id === r.id)
        )
        .map((r) => r.id)
    )
  }, [editUser?.id, roles.data])

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Provision staff accounts and assign roles. Google sign-in works only
            for provisioned emails.
          </p>
        </div>
        {canCreate ? (
          <Button
            className="cursor-pointer"
            onClick={() => {
              resetCreateForm()
              setCreateOpen(true)
            }}
          >
            Create user
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Roles</th>
              <th className="p-2">Status</th>
              {canUpdate ? <th className="p-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u) => (
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
                {canUpdate ? (
                  <td className="p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
            {!users.isLoading && (users.data?.length ?? 0) === 0 ? (
              <tr>
                <td
                  className="p-4 text-muted-foreground"
                  colSpan={canUpdate ? 5 : 4}
                >
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create staff user</DialogTitle>
            <DialogDescription>
              Sets an initial password and marks the email as verified so Google
              can link later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <p className="text-xs text-muted-foreground">
                Leave empty to assign SURVEYOR by default.
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {(roles.data ?? []).map((r) => (
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
                password.length < 8
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
            <DialogDescription>
              {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => {
                  if (v) setEditStatus(v)
                }}
                items={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              >
                <SelectTrigger id="edit-status" className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} label={s} className="cursor-pointer">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {(roles.data ?? []).map((r) => (
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
