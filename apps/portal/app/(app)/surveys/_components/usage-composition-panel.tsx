"use client"

import { TriangleAlert } from "lucide-react"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import {
  composeUsageFromFloors,
  parseFloorsRaw,
  validateMixedComposition,
} from "@/lib/floors"
import { formatCatalogLabel } from "@/lib/catalog-labels"

type UsageCompositionPanelProps = {
  floorsRaw: string
  onJumpToFloors?: () => void
  error?: string
}

export function UsageCompositionPanel({
  floorsRaw,
  onJumpToFloors,
  error,
}: UsageCompositionPanelProps) {
  const floors = React.useMemo(() => parseFloorsRaw(floorsRaw), [floorsRaw])
  const composition = React.useMemo(
    () => composeUsageFromFloors(floors),
    [floors]
  )
  const derivedError =
    error ?? validateMixedComposition(floors) ?? undefined

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3 sm:col-span-2 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Usage Composition</h3>
          <p className="text-xs text-muted-foreground">
            Derived from floor usage types. Edit floors below to change the
            mix.
          </p>
        </div>
        {onJumpToFloors ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={onJumpToFloors}
          >
            Add / edit floors
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usage Type</TableHead>
              <TableHead className="text-right">Area SqFt</TableHead>
              <TableHead className="text-right">% Area</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {composition.rows.length ? (
              composition.rows.map((row) => (
                <TableRow key={row.usageType}>
                  <TableCell className="font-medium">
                    {formatCatalogLabel(row.usageType) || row.usageType}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatArea(row.areaSqFt)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.percent}%
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-muted-foreground"
                >
                  No floor usage yet. Add floors to define composition.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {composition.rows.length ? (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatArea(composition.totalSqFt)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {composition.totalSqFt > 0 ? "100%" : "—"}
                </TableCell>
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>

      {derivedError ? (
        <p
          role="alert"
          className="inline-flex items-start gap-1.5 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {derivedError}
        </p>
      ) : null}
    </div>
  )
}

function formatArea(value: number): string {
  if (!Number.isFinite(value)) return "—"
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}
