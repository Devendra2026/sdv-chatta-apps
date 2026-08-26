"use client"

import { Pencil, Plus, Trash2, TriangleAlert } from "lucide-react"
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { buildStringSelectItems } from "@workspace/ui/lib/select-items"

import {
  FLOOR_CONSTRUCTION_TYPES,
  FLOOR_LABELS,
  FLOOR_USAGE_FACTORS,
  FLOOR_USAGE_TYPES,
  type FloorRow,
  parseFloorsRaw,
  serializeFloorsRaw,
  sqFtToSqM,
  sumFloorAreaSqFt,
} from "@/lib/floors"
import { floorUsageChecks, formatArea } from "@/lib/survey-format"
import { withCurrentOption } from "@/lib/ward1-catalog"

type FloorDraft = {
  floorLabel: string
  usageType: string
  usageFactor: string
  buildingType: string
  areaSqFt: string
}

const emptyDraft = (): FloorDraft => ({
  floorLabel: "Ground Floor",
  usageType: "Residential",
  usageFactor: "Self Occupied",
  buildingType: FLOOR_CONSTRUCTION_TYPES[0],
  areaSqFt: "",
})

type FloorsEditorProps = {
  value: string
  onChange: (floorsRaw: string) => void
  plotAreaSqFt?: string
  plinthAreaSqFt?: string
  onBuiltUpChange?: (sqFt: string, sqM: string) => void
}

export function FloorsEditor({
  value,
  onChange,
  plotAreaSqFt,
  plinthAreaSqFt,
  onBuiltUpChange,
}: FloorsEditorProps) {
  const floors = React.useMemo(() => parseFloorsRaw(value), [value])
  const [draft, setDraft] = React.useState<FloorDraft>(emptyDraft)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const totalSqFt = sumFloorAreaSqFt(floors)
  const totalSqM = sqFtToSqM(totalSqFt)

  const checks = floorUsageChecks({
    plotAreaSqFt,
    plinthAreaSqFt,
    totalBuiltUpAreaSqFt: totalSqFt || null,
    floors,
  })

  function commit(next: FloorRow[]) {
    const normalized = next.map((floor, index) => ({
      ...floor,
      sortOrder: index,
      id: floor.id || `floor-${index}-${floor.floorLabel}`,
    }))
    const raw = serializeFloorsRaw(normalized)
    onChange(raw)
    const builtSqFt = sumFloorAreaSqFt(normalized)
    onBuiltUpChange?.(
      builtSqFt > 0 ? String(builtSqFt) : "",
      builtSqFt > 0 ? String(sqFtToSqM(builtSqFt)) : ""
    )
  }

  function resetDraft() {
    setDraft(emptyDraft())
    setEditingId(null)
    setFormError(null)
  }

  function startEdit(floor: FloorRow) {
    setEditingId(floor.id)
    setDraft({
      floorLabel: floor.floorLabel || "Ground Floor",
      usageType: floor.usageType ?? "",
      usageFactor: floor.usageFactor ?? "",
      buildingType: floor.buildingType ?? "",
      areaSqFt:
        floor.areaSqFt != null && Number.isFinite(floor.areaSqFt)
          ? String(floor.areaSqFt)
          : "",
    })
    setFormError(null)
  }

  function removeFloor(id: string) {
    commit(floors.filter((floor) => floor.id !== id))
    if (editingId === id) resetDraft()
  }

  function saveFloor() {
    const label = draft.floorLabel.trim()
    const area = Number(draft.areaSqFt.trim())
    if (!label) {
      setFormError("Select a floor.")
      return
    }
    if (!Number.isFinite(area) || area <= 0) {
      setFormError("Enter a valid area in sq ft.")
      return
    }

    const nextRow: FloorRow = {
      id: editingId ?? `floor-${Date.now()}`,
      floorLabel: label,
      areaSqFt: area,
      areaSqMeter: sqFtToSqM(area),
      usageType: draft.usageType.trim() || undefined,
      usageFactor: draft.usageFactor.trim() || undefined,
      buildingType: draft.buildingType.trim() || undefined,
      sortOrder: 0,
    }

    if (editingId) {
      commit(floors.map((floor) => (floor.id === editingId ? nextRow : floor)))
    } else {
      commit([...floors, nextRow])
    }
    resetDraft()
  }

  return (
    <div className="space-y-4 sm:col-span-2 lg:col-span-3">
      {checks.length ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            <TriangleAlert className="size-4" aria-hidden />
            Floor usage checks ({checks.length})
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200/90">
            {checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Floor</TableHead>
              <TableHead>Usage Type</TableHead>
              <TableHead>Usage Factor</TableHead>
              <TableHead>Construction</TableHead>
              <TableHead className="text-right">Area</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {floors.length ? (
              floors.map((floor) => (
                <TableRow
                  key={floor.id}
                  data-state={editingId === floor.id ? "selected" : undefined}
                >
                  <TableCell className="font-medium">
                    {floor.floorLabel}
                  </TableCell>
                  <TableCell>{floor.usageType || "—"}</TableCell>
                  <TableCell>{floor.usageFactor || "—"}</TableCell>
                  <TableCell className="max-w-[14rem] truncate">
                    {floor.buildingType || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatArea(floor.areaSqFt, floor.areaSqMeter)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer"
                        aria-label={`Edit ${floor.floorLabel}`}
                        onClick={() => startEdit(floor)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer text-destructive hover:text-destructive"
                        aria-label={`Delete ${floor.floorLabel}`}
                        onClick={() => removeFloor(floor.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No floors yet. Add a floor below.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="font-semibold">
                Total built-up area
              </TableCell>
              <TableCell
                colSpan={2}
                className="text-right font-semibold tabular-nums"
              >
                {totalSqFt > 0 ? formatArea(totalSqFt, totalSqM) : "—"}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {editingId ? "Edit floor" : "Add floor"}
          </h3>
          {!editingId ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Plus className="size-3.5" aria-hidden />
              New row
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FloorSelect
            id="floor-label"
            label="Floor"
            value={draft.floorLabel}
            options={FLOOR_LABELS}
            onChange={(floorLabel) =>
              setDraft((prev) => ({ ...prev, floorLabel }))
            }
          />
          <FloorSelect
            id="floor-usage-type"
            label="Usage Type"
            value={draft.usageType}
            options={FLOOR_USAGE_TYPES}
            onChange={(usageType) =>
              setDraft((prev) => ({ ...prev, usageType }))
            }
          />
          <FloorSelect
            id="floor-usage-factor"
            label="Usage Factor"
            value={draft.usageFactor}
            options={FLOOR_USAGE_FACTORS}
            onChange={(usageFactor) =>
              setDraft((prev) => ({ ...prev, usageFactor }))
            }
          />
          <FloorSelect
            id="floor-construction"
            label="Construction"
            value={draft.buildingType}
            options={FLOOR_CONSTRUCTION_TYPES}
            onChange={(buildingType) =>
              setDraft((prev) => ({ ...prev, buildingType }))
            }
          />
          <div className="space-y-1.5">
            <Label htmlFor="floor-area">Area (sq ft)</Label>
            <Input
              id="floor-area"
              inputMode="decimal"
              className="tabular-nums"
              value={draft.areaSqFt}
              placeholder="0"
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  areaSqFt: event.target.value,
                }))
              }
            />
          </div>
        </div>

        {formError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" className="cursor-pointer" onClick={saveFloor}>
            {editingId ? "Update floor" : "Save floor"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={resetDraft}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

function FloorSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  const optionList = withCurrentOption(options, value)
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value === "" ? null : value}
        items={buildStringSelectItems(optionList)}
        onValueChange={(next) => onChange(next ?? "")}
      >
        <SelectTrigger id={id} className="cursor-pointer">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {optionList.map((option) => (
            <SelectItem key={option} value={option} label={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
