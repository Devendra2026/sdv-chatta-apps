"use client"

import { useQuery } from "@tanstack/react-query"
import { KeyRound, Search } from "lucide-react"
import * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { api } from "@/lib/api"
import { SettingsEmptyState } from "../_components/settings-empty-state"
import { SettingsTableLoading } from "../_components/settings-loading"
import { SettingsPageHeader } from "../_components/settings-page-header"

type Permission = {
  id: string
  code: string
  resource: string
  action: string
  description: string | null
}

export default function PermissionsPage() {
  const query = useQuery({
    queryKey: ["permissions"],
    queryFn: async () =>
      (await api.get<Permission[]>("/api/v1/permissions")).data,
  })

  const [search, setSearch] = React.useState("")
  const [resourceFilter, setResourceFilter] = React.useState<string>("all")
  const [view, setView] = React.useState<"cards" | "table">("cards")

  const resources = React.useMemo(() => {
    const set = new Set((query.data ?? []).map((p) => p.resource))
    return [...set].sort()
  }, [query.data])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (query.data ?? []).filter((p) => {
      if (resourceFilter !== "all" && p.resource !== resourceFilter)
        return false
      if (!q) return true
      return (
        p.code.toLowerCase().includes(q) ||
        p.resource.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      )
    })
  }, [query.data, search, resourceFilter])

  const grouped = React.useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of filtered) {
      const list = map.get(p.resource) ?? []
      list.push(p)
      map.set(p.resource, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const total = query.data?.length ?? 0
  const resourceCount = resources.length

  return (
    <div className="space-y-4">
      <SettingsPageHeader
        title="Permissions catalog"
        description={`${total} permission${total === 1 ? "" : "s"} · ${resourceCount} resource${resourceCount === 1 ? "" : "s"}. Read-only reference for RBAC codes.`}
        actions={
          <div className="flex rounded-lg border p-0.5">
            <Button
              type="button"
              variant={view === "cards" ? "secondary" : "ghost"}
              size="sm"
              className="cursor-pointer"
              onClick={() => setView("cards")}
            >
              Cards
            </Button>
            <Button
              type="button"
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="cursor-pointer"
              onClick={() => setView("table")}
            >
              Table
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder="Search code, resource, action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search permissions"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setResourceFilter("all")}
          className={cn(
            "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
            resourceFilter === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          All
        </button>
        {resources.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setResourceFilter(r)}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors duration-150",
              resourceFilter === r
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-premium)]">
          <SettingsTableLoading rows={8} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-[var(--shadow-premium)]">
          <SettingsEmptyState
            icon={KeyRound}
            title={
              total === 0 ? "No permissions found" : "No matching permissions"
            }
            description={
              total === 0
                ? "The permission catalog is empty."
                : "Try adjusting search or resource filters."
            }
          />
        </div>
      ) : view === "table" ? (
        <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-premium)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Code</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="px-4">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="transition-colors duration-150">
                  <TableCell className="px-4 font-mono text-xs">
                    {p.code}
                  </TableCell>
                  <TableCell className="capitalize">{p.resource}</TableCell>
                  <TableCell>{p.action}</TableCell>
                  <TableCell className="max-w-md truncate px-4 text-muted-foreground">
                    {p.description ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {grouped.map(([resource, perms]) => (
            <Card key={resource} size="sm">
              <CardHeader className="border-b">
                <CardTitle className="capitalize">{resource}</CardTitle>
                <CardDescription>
                  {perms.length} permission{perms.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-(--card-spacing)">
                {perms.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 font-mono text-[11px] text-primary"
                      >
                        {p.code}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {p.action}
                      </span>
                    </div>
                    {p.description ? (
                      <p className="text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
