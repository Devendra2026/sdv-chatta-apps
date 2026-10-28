"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Percent, Plus } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
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
import { api, ApiError } from "@/lib/api"

export type TaxAdjustmentKind = "REBATE" | "PENALTY"
export type TaxAdjustmentHead = "PROPERTY" | "WATER"
type Method = "PERCENT_OF_HEAD" | "FLAT_AMOUNT"
type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED"

type AssessmentYear = {
  id: string
  code: string
  name: string
}

type TaxAdjustmentRule = {
  id: string
  kind: TaxAdjustmentKind
  head: TaxAdjustmentHead
  name: string
  method: Method
  value: string | number
  cap: string | number | null
  assessmentYearId: string | null
  assessmentYear?: AssessmentYear | null
  effectiveFrom: string | null
  effectiveTo: string | null
  status: Status
}

const STATUS_CLASS: Record<Status, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
  PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  ARCHIVED: "border-amber-200 bg-amber-50 text-amber-900",
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback
  if (err instanceof Error) return err.message
  return fallback
}

function toInputDate(value: string | null | undefined) {
  if (!value) return ""
  return value.slice(0, 10)
}

function formatMoney(value: string | number | null | undefined) {
  if (value == null || value === "") return "—"
  return Number(value).toLocaleString("en-IN")
}

type FormState = {
  name: string
  method: Method
  value: string
  cap: string
  assessmentYearId: string
  effectiveFrom: string
  effectiveTo: string
}

const emptyForm = (): FormState => ({
  name: "",
  method: "PERCENT_OF_HEAD",
  value: "",
  cap: "",
  assessmentYearId: "none",
  effectiveFrom: "",
  effectiveTo: "",
})

export function TaxAdjustmentRulesWorkspace({
  kind,
  head,
  title,
  description,
}: {
  kind: TaxAdjustmentKind
  head: TaxAdjustmentHead
  title: string
  description: string
}) {
  const qc = useQueryClient()
  const { can } = usePermission()
  const canUpdate = can("settings:update")
  const queryKey = ["tax-adjustments", kind, head]

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editRow, setEditRow] = React.useState<TaxAdjustmentRule | null>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [editForm, setEditForm] = React.useState<FormState>(emptyForm)

  const rules = useQuery({
    queryKey,
    queryFn: async () =>
      (
        await api.get<TaxAdjustmentRule[]>(
          `/api/v1/tax-adjustments?kind=${kind}&head=${head}`
        )
      ).data,
  })

  const years = useQuery({
    queryKey: ["ref-assessment-years"],
    queryFn: async () =>
      (
        await api.get<AssessmentYear[]>(
          "/api/v1/reference-entries?category=ASSESSMENT_YEAR"
        )
      ).data,
  })

  function openEdit(row: TaxAdjustmentRule) {
    setEditRow(row)
    setEditForm({
      name: row.name,
      method: row.method,
      value: String(row.value ?? ""),
      cap: row.cap == null ? "" : String(row.cap),
      assessmentYearId: row.assessmentYearId ?? "none",
      effectiveFrom: toInputDate(row.effectiveFrom),
      effectiveTo: toInputDate(row.effectiveTo),
    })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post("/api/v1/tax-adjustments", {
        kind,
        head,
        name: form.name.trim(),
        method: form.method,
        value: Number(form.value),
        cap: form.cap === "" ? null : Number(form.cap),
        assessmentYearId:
          form.assessmentYearId === "none" ? null : form.assessmentYearId,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
      })
    },
    onSuccess: async () => {
      toast.success("Rule created")
      setCreateOpen(false)
      setForm(emptyForm())
      await qc.invalidateQueries({ queryKey })
    },
    onError: (err) => toast.error(errorMessage(err, "Create failed")),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) return
      return api.patch(`/api/v1/tax-adjustments/${editRow.id}`, {
        name: editForm.name.trim(),
        method: editForm.method,
        value: Number(editForm.value),
        cap: editForm.cap === "" ? null : Number(editForm.cap),
        assessmentYearId:
          editForm.assessmentYearId === "none"
            ? null
            : editForm.assessmentYearId,
        effectiveFrom: editForm.effectiveFrom || null,
        effectiveTo: editForm.effectiveTo || null,
      })
    },
    onSuccess: async () => {
      toast.success("Rule updated")
      setEditRow(null)
      await qc.invalidateQueries({ queryKey })
    },
    onError: (err) => toast.error(errorMessage(err, "Update failed")),
  })

  const publishMutation = useMutation({
    mutationFn: async (id: string) =>
      api.post(`/api/v1/tax-adjustments/${id}/publish`, {}),
    onSuccess: async () => {
      toast.success("Rule published")
      await qc.invalidateQueries({ queryKey })
    },
    onError: (err) => toast.error(errorMessage(err, "Publish failed")),
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) =>
      api.post(`/api/v1/tax-adjustments/${id}/archive`, {}),
    onSuccess: async () => {
      toast.success("Rule archived")
      await qc.invalidateQueries({ queryKey })
    },
    onError: (err) => toast.error(errorMessage(err, "Archive failed")),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canUpdate ? (
          <Button
            type="button"
            onClick={() => {
              setForm(emptyForm())
              setCreateOpen(true)
            }}
          >
            <Plus className="size-4" />
            Add rule
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Cap</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Effective</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Loading rules…
                </TableCell>
              </TableRow>
            ) : (rules.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Percent className="size-8 opacity-50" />
                    <p>No rules configured. Empty list is valid.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (rules.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-xs">
                    {row.method === "PERCENT_OF_HEAD" ? "% of head" : "Flat"}
                  </TableCell>
                  <TableCell>
                    {row.method === "PERCENT_OF_HEAD"
                      ? `${formatMoney(row.value)}%`
                      : `₹${formatMoney(row.value)}`}
                  </TableCell>
                  <TableCell>
                    {row.cap == null ? "—" : `₹${formatMoney(row.cap)}`}
                  </TableCell>
                  <TableCell>
                    {row.assessmentYear?.name ?? "All years"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {toInputDate(row.effectiveFrom) || "—"} →{" "}
                    {toInputDate(row.effectiveTo) || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_CLASS[row.status]}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canUpdate ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {row.status === "DRAFT" ? (
                          <>
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
                              size="sm"
                              disabled={publishMutation.isPending}
                              onClick={() => publishMutation.mutate(row.id)}
                            >
                              Publish
                            </Button>
                          </>
                        ) : null}
                        {row.status !== "ARCHIVED" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={archiveMutation.isPending}
                            onClick={() => archiveMutation.mutate(row.id)}
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RuleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add rule"
        description={`${kind} · ${head}`}
        form={form}
        setForm={setForm}
        years={years.data ?? []}
        pending={createMutation.isPending}
        onSubmit={() => createMutation.mutate()}
      />

      <RuleFormDialog
        open={!!editRow}
        onOpenChange={(open) => {
          if (!open) setEditRow(null)
        }}
        title="Edit rule"
        description={editRow?.name}
        form={editForm}
        setForm={setEditForm}
        years={years.data ?? []}
        pending={updateMutation.isPending}
        onSubmit={() => updateMutation.mutate()}
      />
    </div>
  )
}

function RuleFormDialog({
  open,
  onOpenChange,
  title,
  description,
  form,
  setForm,
  years,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  years: AssessmentYear[]
  pending: boolean
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Early payment rebate"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Method</Label>
              <Select
                value={form.method}
                onValueChange={(value) => {
                  if (!value) return
                  setForm((prev) => ({
                    ...prev,
                    method: value as Method,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT_OF_HEAD">% of head</SelectItem>
                  <SelectItem value="FLAT_AMOUNT">Flat amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rule-value">Value</Label>
              <Input
                id="rule-value"
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, value: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rule-cap">Cap (optional)</Label>
              <Input
                id="rule-cap"
                type="number"
                min={0}
                step="0.01"
                value={form.cap}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cap: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Assessment year</Label>
              <Select
                value={form.assessmentYearId}
                onValueChange={(value) => {
                  if (!value) return
                  setForm((prev) => ({
                    ...prev,
                    assessmentYearId: value,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All years</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rule-from">Effective from</Label>
              <Input
                id="rule-from"
                type="date"
                value={form.effectiveFrom}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    effectiveFrom: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rule-to">Effective to</Label>
              <Input
                id="rule-to"
                type="date"
                value={form.effectiveTo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    effectiveTo: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !form.name.trim() || form.value === ""}
            onClick={onSubmit}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
