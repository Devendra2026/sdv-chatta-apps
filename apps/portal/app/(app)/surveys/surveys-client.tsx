"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type PaginationState,
  type Updater,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FileDown,
  FileUp,
  MapPin,
  Plus,
  Search,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { usePermission } from "@/hooks/use-permission"
import { api } from "@/lib/api"
import { formatParcelNo, formatSurveyId } from "@/lib/survey-format"

type SurveyRow = {
  id: string
  surveyId: string
  ownerName: string | null
  ownerFatherName: string | null
  mobile: string | null
  parcelNo: string | null
  propertyNo: string | null
  status: string
  ward: { number: number; name: string }
}

type Ward = {
  id: string
  number: number
  name: string
  code: string
  surveyCount: number
}

type SurveyListMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type SurveyStatusFilter = "DRAFT" | "ACTIVE" | "ARCHIVED"

const PAGE_SIZES = [50, 100, 500] as const
const DEFAULT_PAGE_SIZE = 50

const features = tableFeatures({
  rowPaginationFeature,
})

const columnHelper = createColumnHelper<typeof features, SurveyRow>()

const STATUS_FILTERS: Array<{
  value: SurveyStatusFilter | "ALL"
  label: string
}> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
]

function parsePage(value: string | null): number {
  const n = Number(value ?? "1")
  return Number.isInteger(n) && n > 0 ? n : 1
}

function parsePageSize(value: string | null): number {
  const n = Number(value ?? String(DEFAULT_PAGE_SIZE))
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE
}

function parseStatus(value: string | null): SurveyStatusFilter | null {
  if (value === "DRAFT" || value === "ACTIVE" || value === "ARCHIVED") {
    return value
  }
  return null
}

function surveysHref(opts: {
  page: number
  pageSize: number
  wardId: string | null
  q: string
  status: SurveyStatusFilter | null
}): string {
  const params = new URLSearchParams()
  if (opts.page > 1) params.set("page", String(opts.page))
  if (opts.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(opts.pageSize))
  }
  if (opts.wardId) params.set("wardId", opts.wardId)
  if (opts.q.trim()) params.set("q", opts.q.trim())
  if (opts.status) params.set("status", opts.status)
  const qs = params.toString()
  return qs ? `/surveys?${qs}` : "/surveys"
}

function statusBadgeClass(status: string): string {
  if (status === "DRAFT") {
    return "bg-amber-500/15 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
  }
  if (status === "ACTIVE") {
    return "bg-blue-500/15 text-blue-800 hover:bg-blue-500/15 dark:text-blue-300"
  }
  if (status === "ARCHIVED") {
    return "bg-muted text-muted-foreground hover:bg-muted"
  }
  return ""
}

export default function SurveysClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { can } = usePermission()
  const canCreate = can("survey:create")
  const canImport = can("import:create")
  const canExport = can("report:export")

  const qParam = searchParams.get("q") ?? ""
  const wardId = searchParams.get("wardId")
  const status = parseStatus(searchParams.get("status"))
  const page = parsePage(searchParams.get("page"))
  const pageSize = parsePageSize(searchParams.get("pageSize"))

  const [search, setSearch] = React.useState(qParam)

  React.useEffect(() => {
    setSearch(qParam)
  }, [qParam])

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim() === qParam.trim()) return
      router.replace(
        surveysHref({
          page: 1,
          pageSize,
          wardId,
          q: search,
          status,
        })
      )
    }, 300)
    return () => clearTimeout(t)
  }, [search, qParam, pageSize, wardId, status, router])

  const pagination = React.useMemo<PaginationState>(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize]
  )

  const wardsQuery = useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await api.get<Ward[]>("/api/v1/wards")).data,
  })

  const query = useQuery({
    queryKey: ["surveys", qParam, page, pageSize, wardId, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy: "parcelNo",
        sortOrder: "asc",
      })
      if (qParam.trim()) params.set("search", qParam.trim())
      if (wardId) params.set("wardId", wardId)
      if (status) params.set("status", status)
      const res = await api.get<SurveyRow[]>(`/api/v1/surveys?${params}`)
      return {
        items: res.data,
        meta: res.meta as SurveyListMeta,
      }
    },
    placeholderData: keepPreviousData,
  })

  const items = query.data?.items ?? []
  const meta = query.data?.meta
  const rowCount = meta?.total ?? 0

  const navigate = React.useCallback(
    (next: {
      page?: number
      pageSize?: number
      wardId?: string | null
      q?: string
      status?: SurveyStatusFilter | null
    }) => {
      router.replace(
        surveysHref({
          page: next.page ?? page,
          pageSize: next.pageSize ?? pageSize,
          wardId: next.wardId === undefined ? wardId : next.wardId,
          q: next.q ?? qParam,
          status: next.status === undefined ? status : next.status,
        })
      )
    },
    [page, pageSize, wardId, qParam, status, router]
  )

  const columns = React.useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "sno",
          header: "S.No",
          cell: ({ row }) => (
            <span className="text-muted-foreground tabular-nums">
              {(page - 1) * pageSize + row.index + 1}
            </span>
          ),
        }),
        columnHelper.display({
          id: "action",
          header: "Action",
          cell: ({ row }) => (
            <span
              className="inline-flex"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                render={<Link href={`/surveys/${row.original.id}`} />}
              >
                <Eye className="size-3.5" />
                View
              </Button>
            </span>
          ),
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => {
            const value = getValue()
            return (
              <Badge variant="secondary" className={statusBadgeClass(value)}>
                {value}
              </Badge>
            )
          },
        }),
        columnHelper.accessor("surveyId", {
          header: "Survey ID",
          cell: ({ row, getValue }) => (
            <span className="font-medium tabular-nums">
              {formatSurveyId({
                surveyId: getValue(),
                wardNumber: row.original.ward.number,
                parcelNo: row.original.parcelNo,
                propertyNo: row.original.propertyNo,
              })}
            </span>
          ),
        }),
        columnHelper.accessor((row) => row.ward.number, {
          id: "wardNumber",
          header: "Ward Number",
          cell: ({ getValue }) => (
            <span className="tabular-nums">
              {String(getValue()).padStart(2, "0")}
            </span>
          ),
        }),
        columnHelper.accessor("parcelNo", {
          header: "Parcel Number",
          cell: ({ row, getValue }) => (
            <span className="tabular-nums">
              {formatParcelNo(getValue(), row.original.surveyId)}
            </span>
          ),
        }),
        columnHelper.accessor("ownerName", {
          header: "Owner Name",
          cell: ({ getValue }) => (
            <span className="font-(family-name:--font-deva)">
              {getValue()?.trim() || "—"}
            </span>
          ),
        }),
        columnHelper.accessor("ownerFatherName", {
          header: "Owner Father Name",
          cell: ({ getValue }) => (
            <span className="font-(family-name:--font-deva)">
              {getValue()?.trim() || "—"}
            </span>
          ),
        }),
        columnHelper.accessor("mobile", {
          header: "Owner Mobile Number",
          cell: ({ getValue }) => {
            const value = getValue()?.trim()
            if (!value || value === "0") return "—"
            return <span className="tabular-nums">{value}</span>
          },
        }),
      ]),
    [page, pageSize]
  )

  const onPaginationChange = React.useCallback(
    (updater: Updater<PaginationState>) => {
      const next = typeof updater === "function" ? updater(pagination) : updater
      navigate({
        page: next.pageIndex + 1,
        pageSize: next.pageSize,
      })
    },
    [pagination, navigate]
  )

  const table = useTable(
    {
      features,
      columns,
      data: items,
      getRowId: (row) => row.id,
      manualPagination: true,
      rowCount,
      state: { pagination },
      onPaginationChange,
      autoResetPageIndex: false,
    },
    (state) => ({ pagination: state.pagination })
  )

  const selectedWard = (wardsQuery.data ?? []).find((w) => w.id === wardId)
  const totalWardSurveys = (wardsQuery.data ?? []).reduce(
    (sum, w) => sum + w.surveyCount,
    0
  )
  const columnCount = columns.length
  const isInitialLoad = query.isLoading && !query.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Survey Registry
          </h1>
          <p className="text-sm text-muted-foreground">
            Select a ward to fetch records, then search and page through the
            registry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <Button
              variant="outline"
              className="cursor-pointer"
              render={<Link href="/reports" />}
            >
              <FileDown className="size-4" />
              Export Excel
            </Button>
          ) : null}
          {canImport ? (
            <Button
              variant="outline"
              className="cursor-pointer"
              render={<Link href="/surveys/import" />}
            >
              <FileUp className="size-4" />
              Import Excel
            </Button>
          ) : null}
          {canCreate ? (
            <Button
              className="cursor-pointer"
              render={<Link href="/surveys/new" />}
            >
              <Plus className="size-4" />
              Create Survey
            </Button>
          ) : null}
        </div>
      </div>

      <section
        className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm md:p-5"
        aria-labelledby="ward-matrix-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Command center
            </p>
            <h2
              id="ward-matrix-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Survey Matrix Command Center
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a ward to load its survey records. Counts exclude deleted
              entries.
            </p>
          </div>
          {selectedWard ? (
            <Badge variant="secondary" className="font-normal">
              Ward {String(selectedWard.number).padStart(2, "0")} ·{" "}
              <span className="font-(family-name:--font-deva)">
                {selectedWard.name}
              </span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">
              All wards · {totalWardSurveys.toLocaleString("en-IN")} records
            </Badge>
          )}
        </div>

        {wardsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 16 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            role="listbox"
            aria-label="Select ward"
          >
            <button
              type="button"
              role="option"
              aria-selected={!wardId}
              className={cn(
                "cursor-pointer rounded-xl border px-4 py-3 text-left transition-all duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                !wardId
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-background hover:border-primary/40 hover:bg-muted/50"
              )}
              onClick={() => navigate({ page: 1, wardId: null })}
            >
              <p className="text-[11px] font-semibold tracking-wider uppercase opacity-90">
                All wards
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {totalWardSurveys.toLocaleString("en-IN")}
              </p>
              <p className="mt-0.5 text-xs opacity-80">Total surveys</p>
            </button>
            {(wardsQuery.data ?? []).map((ward) => {
              const selected = ward.id === wardId
              return (
                <button
                  key={ward.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "cursor-pointer rounded-xl border px-4 py-3 text-left transition-all duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    selected
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                      : "border-border bg-background hover:border-primary/40 hover:bg-muted/50"
                  )}
                  onClick={() => navigate({ page: 1, wardId: ward.id })}
                >
                  <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    <MapPin className="size-3" />
                    Ward {String(ward.number).padStart(2, "0")}
                  </p>
                  <p className="mt-1 line-clamp-2 min-h-8 font-(family-name:--font-deva) text-xs leading-snug font-medium">
                    {ward.name}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-lg font-bold tabular-nums",
                      ward.surveyCount > 0
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {ward.surveyCount.toLocaleString("en-IN")}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <label htmlFor="survey-search" className="sr-only">
            Search surveys
          </label>
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            id="survey-search"
            className="pl-8"
            placeholder="Search by Survey ID, parcel, or owner name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((item) => {
            const active =
              item.value === "ALL" ? status === null : status === item.value
            return (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="cursor-pointer"
                aria-pressed={active}
                onClick={() =>
                  navigate({
                    page: 1,
                    status: item.value === "ALL" ? null : item.value,
                  })
                }
              >
                {item.label}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    <table.FlexRender header={header} />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isInitialLoad ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={columnCount}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/surveys/${row.original.id}`)}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  No surveys found
                  {selectedWard
                    ? ` in ward ${String(selectedWard.number).padStart(2, "0")}`
                    : ""}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground tabular-nums">
          {query.isFetching && !isInitialLoad ? "Updating… · " : null}
          {rowCount > 0
            ? `Showing ${((page - 1) * pageSize + 1).toLocaleString("en-IN")}–${Math.min(page * pageSize, rowCount).toLocaleString("en-IN")} of ${rowCount.toLocaleString("en-IN")}`
            : "0 records"}
          {meta
            ? ` · Page ${meta.page.toLocaleString("en-IN")} of ${meta.totalPages.toLocaleString("en-IN")}`
            : null}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-1 rounded-lg border p-1"
            role="group"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <Button
                key={size}
                type="button"
                size="sm"
                variant={pageSize === size ? "default" : "ghost"}
                className="cursor-pointer px-3"
                aria-pressed={pageSize === size}
                onClick={() => navigate({ page: 1, pageSize: size })}
              >
                {size}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              className="cursor-pointer"
              aria-label="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.firstPage()}
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="cursor-pointer"
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft />
            </Button>
            <label htmlFor="goto-page" className="sr-only">
              Go to page
            </label>
            <Input
              id="goto-page"
              key={page}
              type="number"
              min={1}
              max={table.getPageCount() || 1}
              defaultValue={page}
              className="h-7 w-16 text-center tabular-nums"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return
                const raw = Number((e.target as HTMLInputElement).value)
                if (!Number.isInteger(raw)) return
                const last = Math.max(1, table.getPageCount())
                table.setPageIndex(Math.min(last, Math.max(1, raw)) - 1)
              }}
            />
            <span className="px-1 text-xs text-muted-foreground tabular-nums">
              / {Math.max(1, table.getPageCount()).toLocaleString("en-IN")}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              className="cursor-pointer"
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="cursor-pointer"
              aria-label="Last page"
              disabled={!table.getCanLastPage()}
              onClick={() => table.lastPage()}
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
