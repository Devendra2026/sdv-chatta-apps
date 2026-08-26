import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import type { ImportErrorRow } from "./types"

export function ImportErrorsTable({ errors }: { errors: ImportErrorRow[] }) {
  if (errors.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-destructive" role="alert">
        {errors.length.toLocaleString("en-IN")} row{" "}
        {errors.length === 1 ? "error" : "errors"}
        {errors.length >= 100 ? " (showing first 100)" : null}
      </p>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Row</TableHead>
              <TableHead>Survey ID</TableHead>
              <TableHead>Field</TableHead>
              <TableHead className="px-4">Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.map((err) => (
              <TableRow key={err.id}>
                <TableCell className="px-4 tabular-nums">
                  {err.rowNumber}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {err.surveyId ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {err.field ?? "—"}
                </TableCell>
                <TableCell className="px-4">{err.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
