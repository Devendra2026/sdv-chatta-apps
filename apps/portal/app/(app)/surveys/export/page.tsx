"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { Download } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { buildSelectItems } from "@workspace/ui/lib/select-items"

import { api } from "@/lib/api"

type Ward = { id: string; name: string; number: number }

export default function ExportPage() {
  const [wardId, setWardId] = React.useState<string>("")

  const wardsQuery = useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await api.get<Ward[]>("/api/v1/wards")).data,
  })

  const wardSelectItems = React.useMemo(
    () => [
      { value: "__all__", label: "All wards" },
      ...buildSelectItems(
        wardsQuery.data ?? [],
        (w) => w.id,
        (w) => w.name
      ),
    ],
    [wardsQuery.data]
  )

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ url: string; job: { rowCount: number } }>(
          "/api/v1/exports/surveys",
          wardId ? { wardId } : {}
        )
      ).data,
    onSuccess: (data) => {
      toast.success(`Export ready (${data.job.rowCount} rows)`)
      window.open(data.url, "_blank")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Export Surveys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Downloads the full Chhata survey workbook (38 columns for Ward 1, 55
          columns for other wards), matching the import template layout.
        </p>
        <div className="space-y-2">
          <Label htmlFor="export-ward">Ward (optional)</Label>
          <Select
            value={wardId || "__all__"}
            items={wardSelectItems}
            onValueChange={(v) => setWardId(v === "__all__" || !v ? "" : v)}
          >
            <SelectTrigger id="export-ward" className="cursor-pointer">
              <SelectValue placeholder="All wards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="__all__"
                label="All wards"
                className="cursor-pointer"
              >
                All wards
              </SelectItem>
              {(wardsQuery.data ?? []).map((w) => (
                <SelectItem
                  key={w.id}
                  value={w.id}
                  label={w.name}
                  className="cursor-pointer"
                >
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          className="cursor-pointer"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <Download className="mr-2 size-4" aria-hidden />
          {mutation.isPending ? "Preparing…" : "Download Excel"}
        </Button>
      </CardContent>
    </Card>
  )
}
