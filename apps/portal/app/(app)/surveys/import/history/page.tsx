"use client"

import { useQuery } from "@tanstack/react-query"
import { FileUp, Search } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
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
import { buildSelectItems } from "@workspace/ui/lib/select-items"

import { usePermission } from "@/hooks/use-permission"
import { api } from "@/lib/api"
import { SettingsEmptyState } from "../../../settings/_components/settings-empty-state"
import { SettingsTableLoading } from "../../../settings/_components/settings-loading"

import { ImportStatusBadge } from "../_components/import-status-badge"
import {
  IMPORT_STATUSES,
  type ImportJob,
  type ImportListMeta,
} from "../_components/types"

const STATUS_ITEMS = [
  { value: "all", label: "All statuses" },
  ...buildSelectItems(
    IMPORT_STATUSES,
    (s) => s,
    (s) => s.replaceAll("_", " ")
  ),
]

export default function ImportHistoryPage() {
  const { can } = usePermission()
  const canCreate = can("import:create")
  const [page, setPage] = React.useState(1)
  const [status, setStatus] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [q, setQ] = React.useState("")

  React.useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  React.useEffect(() => {
    setPage(1)
  }, [status, q])

  const query = useQuery({
    queryKey: ["imports", page, status, q],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      })
      if (status !== "all") params.set("status", status)
      if (q) params.set("q", q)
      const res = await api.get<ImportJob[]>(
        `/api/v1/imports?${params.toString()}`
      )
      return {
        items: res.data,
        meta: res.meta as ImportListMeta | undefined,
      }
    },
  })

  const items = query.data?.items ?? []
  const meta = query.data?.meta
  const empty = !query.isLoading && !query.isError && items.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative min-w-0 flex-1">
            <Label htmlFor="import-search" className="sr-only">
              Search file name
            </Label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="import-search"
              className="pl-9"
              placeholder="Search file name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="import-status" className="sr-only">
              Status
            </Label>
            <Select
              value={status}
              items={STATUS_ITEMS}
              onValueChange={(v) => setStatus(v ?? "all")}
            >
              <SelectTrigger
                id="import-status"
                className="w-full cursor-pointer lg:w-[180px]"
              >
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="all"
                  label="All statuses"
                  className="cursor-pointer"
                >
                  All statuses
                </SelectItem>
                {IMPORT_STATUSES.map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    label={s.replaceAll("_", " ")}
                    className="cursor-pointer"
                  >
                    {s.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {canCreate ? (
          <Button
            className="cursor-pointer"
            render={<Link href="/surveys/import" />}
          >
            New import
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {query.isLoading ? (
          <SettingsTableLoading />
        ) : query.isError ? (
          <div className="space-y-3 px-4 py-10 text-center" role="alert">
            <p className="text-sm text-destructive">
              {query.error instanceof Error
                ? query.error.message
                : "Could not load import history."}
            </p>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : empty ? (
          <SettingsEmptyState
            icon={FileUp}
            title={
              q || status !== "all" ? "No matching imports" : "No imports yet"
            }
            description={
              q || status !== "all"
                ? "Try a different file name or status."
                : "Upload a GIS Excel workbook to create the first import job."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Imported by</TableHead>
                <TableHead className="px-4">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((job) => (
                <TableRow
                  key={job.id}
                  className="transition-colors duration-150 hover:bg-muted/40"
                >
                  <TableCell className="px-4">
                    <Link
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      href={`/surveys/import?job=${job.id}`}
                    >
                      {job.fileName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ImportStatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {job.successRows.toLocaleString("en-IN")} ok
                    {" · "}
                    {job.failedRows.toLocaleString("en-IN")} fail
                    {" · "}
                    {job.skippedRows.toLocaleString("en-IN")} skip
                  </TableCell>
                  <TableCell>
                    <p className="truncate font-medium">
                      {job.createdBy?.name ?? "—"}
                    </p>
                    {job.createdBy?.email ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {job.createdBy.email}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-4 whitespace-nowrap text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t px-4 py-2 text-sm text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages} ({meta.total} records)
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={page >= meta.totalPages || query.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : meta && meta.total > 0 ? (
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            {meta.total} {meta.total === 1 ? "import" : "imports"}
          </p>
        ) : null}
      </div>
    </div>
  )
}
