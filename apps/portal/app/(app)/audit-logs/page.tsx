"use client"

import { useQuery } from "@tanstack/react-query"
import { Copy, ScrollText, Search } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { api } from "@/lib/api"
import { UserAvatar } from "../settings/_components/role-pill"
import { SettingsEmptyState } from "../settings/_components/settings-empty-state"
import { SettingsTableLoading } from "../settings/_components/settings-loading"
import { SettingsPageHeader } from "../settings/_components/settings-page-header"
import { SettingsSectionShell } from "../settings/_components/settings-section-shell"

type AuditLog = {
  id: string
  action: string
  entity: string
  entityId: string | null
  createdAt: string
  ipAddress?: string | null
  requestId?: string | null
  oldValue?: unknown
  newValue?: unknown
  metadata?: unknown
  actor?: { id?: string; name: string; email: string } | null
}

type AuditMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function startOfDay(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function endOfDay(isoDate: string) {
  const d = new Date(`${isoDate}T23:59:59.999`)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function AuditLogsPage() {
  const [search, setSearch] = React.useState("")
  const [entityFilter, setEntityFilter] = React.useState("all")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [selected, setSelected] = React.useState<AuditLog | null>(null)

  const query = useQuery({
    queryKey: ["audit-logs", entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "100" })
      if (entityFilter !== "all") params.set("entity", entityFilter)
      const res = await api.get<AuditLog[]>(
        `/api/v1/audit-logs?${params.toString()}`
      )
      return {
        items: res.data,
        meta: res.meta as AuditMeta | undefined,
      }
    },
  })

  const entities = React.useMemo(() => {
    const set = new Set((query.data?.items ?? []).map((l) => l.entity))
    return [...set].sort()
  }, [query.data?.items])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = fromDate ? startOfDay(fromDate) : null
    const to = toDate ? endOfDay(toDate) : null
    return (query.data?.items ?? []).filter((log) => {
      const created = new Date(log.createdAt)
      if (from && created < from) return false
      if (to && created > to) return false
      if (!q) return true
      const actor = `${log.actor?.name ?? ""} ${log.actor?.email ?? ""}`
      return (
        log.action.toLowerCase().includes(q) ||
        log.entity.toLowerCase().includes(q) ||
        (log.entityId ?? "").toLowerCase().includes(q) ||
        actor.toLowerCase().includes(q)
      )
    })
  }, [query.data?.items, search, fromDate, toDate])

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy")
    }
  }

  return (
    <SettingsSectionShell>
      <div className="space-y-4">
        <SettingsPageHeader
          title="Audit Logs"
          description="Immutable history of administrative and domain actions."
        />

        <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-premium)]">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-end">
            <div className="relative min-w-0 flex-1">
              <Label htmlFor="audit-search" className="sr-only">
                Search audit logs
              </Label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="audit-search"
                className="pl-9"
                placeholder="Search action, entity, actor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="audit-entity"
                className="text-xs text-muted-foreground"
              >
                Entity
              </Label>
              <select
                id="audit-entity"
                className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm lg:w-[160px]"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
              >
                <option value="all">All entities</option>
                {entities.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="audit-from"
                className="text-xs text-muted-foreground"
              >
                From
              </Label>
              <Input
                id="audit-from"
                type="date"
                className="w-full cursor-pointer lg:w-[150px]"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="audit-to"
                className="text-xs text-muted-foreground"
              >
                To
              </Label>
              <Input
                id="audit-to"
                type="date"
                className="w-full cursor-pointer lg:w-[150px]"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {query.isLoading ? (
            <SettingsTableLoading />
          ) : filtered.length === 0 ? (
            <SettingsEmptyState
              icon={ScrollText}
              title={
                (query.data?.items.length ?? 0) === 0
                  ? "No audit logs yet"
                  : "No matching logs"
              }
              description={
                (query.data?.items.length ?? 0) === 0
                  ? "Actions will appear here as staff use the portal."
                  : "Try adjusting search, entity, or date range."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4">When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="px-4">Entity ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer transition-colors duration-150"
                    onClick={() => setSelected(log)}
                  >
                    <TableCell className="px-4 whitespace-nowrap text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={log.actor?.name ?? "?"} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {log.actor?.name ?? "—"}
                          </p>
                          {log.actor?.email ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {log.actor.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{log.entity}</TableCell>
                    <TableCell className="px-4">
                      {log.entityId ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">
                            {log.entityId.slice(0, 8)}…
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="cursor-pointer"
                            aria-label="Copy entity ID"
                            onClick={(e) => {
                              e.stopPropagation()
                              void copyId(log.entityId!)
                            }}
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {query.data?.meta ? (
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">
              Showing {filtered.length} of {query.data.meta.total} log
              {query.data.meta.total === 1 ? "" : "s"}
              {query.data.meta.total > (query.data.meta.pageSize ?? 100)
                ? " (latest page)"
                : null}
            </p>
          ) : null}
        </div>
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit detail</DialogTitle>
            <DialogDescription>
              {selected ? new Date(selected.createdAt).toLocaleString() : null}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <DetailRow label="Action" value={selected.action} />
              <DetailRow label="Entity" value={selected.entity} />
              <DetailRow
                label="Entity ID"
                value={selected.entityId ?? "—"}
                mono
              />
              <DetailRow
                label="Actor"
                value={
                  selected.actor
                    ? `${selected.actor.name} (${selected.actor.email})`
                    : "—"
                }
              />
              <DetailRow label="IP address" value={selected.ipAddress ?? "—"} />
              <DetailRow
                label="Request ID"
                value={selected.requestId ?? "—"}
                mono
              />
              {selected.oldValue != null ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Previous value
                  </p>
                  <pre className="max-h-40 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
                    {JSON.stringify(selected.oldValue, null, 2)}
                  </pre>
                </div>
              ) : null}
              {selected.newValue != null ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    New value
                  </p>
                  <pre className="max-h-40 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
                    {JSON.stringify(selected.newValue, null, 2)}
                  </pre>
                </div>
              ) : null}
              {selected.metadata != null ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Metadata
                  </p>
                  <pre className="max-h-40 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </SettingsSectionShell>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-28 shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={mono ? "font-mono text-xs break-all" : "break-words"}>
        {value}
      </dd>
    </div>
  )
}
