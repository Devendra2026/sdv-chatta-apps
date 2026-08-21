"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { api } from "@/lib/api"

export default function ExportPage() {
  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ url: string; job: { rowCount: number } }>("/api/v1/exports/surveys", {})
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
      <CardContent>
        <Button className="cursor-pointer" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Preparing…" : "Download Excel"}
        </Button>
      </CardContent>
    </Card>
  )
}
