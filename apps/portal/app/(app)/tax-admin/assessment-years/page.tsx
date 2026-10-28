"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarRange, Plus } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { usePermission } from "@/hooks/use-permission"
import { api, ApiError } from "@/lib/api"
import { StatusBadge } from "../../settings/_components/status-badge"

type AssessmentYear = {
  id: string
  code: string
  name: string
  description: string | null
  value: string | null
  sortOrder: number
  status: "ACTIVE" | "INACTIVE"
}

function parseDates(value: string | null): {
  startDate: string
  endDate: string
} {
  if (!value) return { startDate: "", endDate: "" }
  try {
    const parsed = JSON.parse(value) as {
      startDate?: string
      endDate?: string
    }
    return {
      startDate: parsed.startDate ?? "",
      endDate: parsed.endDate ?? "",
    }
  } catch {
    return { startDate: "", endDate: "" }
  }
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback
  if (err instanceof Error) return err.message
  return fallback
}

export default function AssessmentYearsPage() {
  const qc = useQueryClient()
  const { can } = usePermission()
  const canUpdate = can("settings:update")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editRow, setEditRow] = React.useState<AssessmentYear | null>(null)

  const [code, setCode] = React.useState("")
  const [name, setName] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [sortOrder, setSortOrder] = React.useState("0")

  const [editName, setEditName] = React.useState("")
  const [editStart, setEditStart] = React.useState("")
  const [editEnd, setEditEnd] = React.useState("")
  const [editSort, setEditSort] = React.useState("0")

  const years = useQuery({
    queryKey: ["assessment-years-admin"],
    queryFn: async () =>
      (
        await api.get<AssessmentYear[]>(
          "/api/v1/reference-entries?category=ASSESSMENT_YEAR&status=ALL"
        )
      ).data,
  })

  function resetCreate() {
    setCode("")
    setName("")
    setStartDate("")
    setEndDate("")
    setSortOrder("0")
  }

  function openEdit(row: AssessmentYear) {
    const dates = parseDates(row.value)
    setEditRow(row)
    setEditName(row.name)
    setEditStart(dates.startDate)
    setEditEnd(dates.endDate)
    setEditSort(String(row.sortOrder ?? 0))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post("/api/v1/reference-entries/assessment-years", {
        code: code.trim(),
        name: name.trim(),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        sortOrder: Number(sortOrder) || 0,
      })
    },
    onSuccess: async () => {
      toast.success("Assessment year created")
      setCreateOpen(false)
      resetCreate()
      await qc.invalidateQueries({ queryKey: ["assessment-years-admin"] })
      await qc.invalidateQueries({ queryKey: ["ref-assessment-years"] })
    },
    onError: (err) => toast.error(errorMessage(err, "Create failed")),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) return
      return api.patch(
        `/api/v1/reference-entries/assessment-years/${editRow.id}`,
        {
          name: editName.trim(),
          startDate: editStart || null,
          endDate: editEnd || null,
          sortOrder: Number(editSort) || 0,
        }
      )
    },
    onSuccess: async () => {
      toast.success("Assessment year updated")
      setEditRow(null)
      await qc.invalidateQueries({ queryKey: ["assessment-years-admin"] })
      await qc.invalidateQueries({ queryKey: ["ref-assessment-years"] })
    },
    onError: (err) => toast.error(errorMessage(err, "Update failed")),
  })

  const toggleMutation = useMutation({
    mutationFn: async (row: AssessmentYear) => {
      const action = row.status === "ACTIVE" ? "deactivate" : "activate"
      return api.patch(
        `/api/v1/reference-entries/assessment-years/${row.id}/${action}`,
        {}
      )
    },
    onSuccess: async () => {
      toast.success("Status updated")
      await qc.invalidateQueries({ queryKey: ["assessment-years-admin"] })
      await qc.invalidateQueries({ queryKey: ["ref-assessment-years"] })
    },
    onError: (err) => toast.error(errorMessage(err, "Status update failed")),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Assessment Years
          </h2>
          <p className="text-sm text-muted-foreground">
            Define financial years used by tax configs, demands, and payments.
          </p>
        </div>
        {canUpdate ? (
          <Button
            type="button"
            onClick={() => {
              resetCreate()
              setCreateOpen(true)
            }}
          >
            <Plus className="size-4" />
            Add year
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading assessment years…
                </TableCell>
              </TableRow>
            ) : (years.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CalendarRange className="size-8 opacity-50" />
                    <p>No assessment years yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (years.data ?? []).map((row) => {
                const dates = parseDates(row.value)
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{dates.startDate || "—"}</TableCell>
                    <TableCell>{dates.endDate || "—"}</TableCell>
                    <TableCell>{row.sortOrder}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {canUpdate ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(row)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={toggleMutation.isPending}
                            onClick={() => toggleMutation.mutate(row)}
                          >
                            {row.status === "ACTIVE"
                              ? "Deactivate"
                              : "Activate"}
                          </Button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add assessment year</DialogTitle>
            <DialogDescription>
              Codes must be unique. Optional date range is checked for overlap
              among active years.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ay-code">Code</Label>
              <Input
                id="ay-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="AY_2027_2028"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ay-name">Name</Label>
              <Input
                id="ay-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="2027-2028"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ay-start">Start date</Label>
                <Input
                  id="ay-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ay-end">End date</Label>
                <Input
                  id="ay-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ay-sort">Sort order</Label>
              <Input
                id="ay-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                createMutation.isPending || !code.trim() || !name.trim()
              }
              onClick={() => createMutation.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editRow}
        onOpenChange={(open) => {
          if (!open) setEditRow(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit assessment year</DialogTitle>
            <DialogDescription>
              {editRow ? `Code: ${editRow.code}` : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ay-edit-name">Name</Label>
              <Input
                id="ay-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ay-edit-start">Start date</Label>
                <Input
                  id="ay-edit-start"
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ay-edit-end">End date</Label>
                <Input
                  id="ay-edit-end"
                  type="date"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ay-edit-sort">Sort order</Label>
              <Input
                id="ay-edit-sort"
                type="number"
                min={0}
                value={editSort}
                onChange={(e) => setEditSort(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditRow(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updateMutation.isPending || !editName.trim()}
              onClick={() => updateMutation.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
