"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"

import { api } from "@/lib/api"

type ImportJob = {
  id: string
  fileName: string
  status: string
  mappingPreset: string | null
  totalRows: number
  successRows: number
  failedRows: number
  skippedRows: number
}

export default function ImportWizardPage() {
  const [file, setFile] = React.useState<File | null>(null)
  const [jobId, setJobId] = React.useState<string | null>(null)
  const qc = useQueryClient()

  const jobQuery = useQuery({
    queryKey: ["import-job", jobId],
    enabled: Boolean(jobId),
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status === "PROCESSING" || status === "READY" ? 2000 : false
    },
    queryFn: async () => (await api.get<ImportJob>(`/api/v1/imports/${jobId}`)).data,
  })

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Select a file")
      const form = new FormData()
      form.append("file", file)
      form.append("duplicateStrategy", "SKIP")
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
      const res = await fetch(`${base}/api/v1/imports/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message ?? "Upload failed")
      }
      return json.data as ImportJob
    },
    onSuccess: (data) => {
      setJobId(data.id)
      toast.success(`Uploaded. Preset: ${data.mappingPreset}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const start = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("No job")
      return (await api.post<ImportJob>(`/api/v1/imports/${jobId}/start`)).data
    },
    onSuccess: () => {
      toast.success("Import started")
      void qc.invalidateQueries({ queryKey: ["import-job", jobId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import Survey Data</h1>
        <p className="text-muted-foreground text-sm">
          Upload Ward Excel workbooks (Ward 1 = 38 cols, Ward 2+ = 55 cols)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="cursor-pointer text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            className="cursor-pointer"
            disabled={!file || upload.isPending}
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? "Uploading…" : "Upload & validate"}
          </Button>
        </CardContent>
      </Card>

      {jobQuery.data ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">2. Review & start</CardTitle>
            <Badge>{jobQuery.data.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>File: {jobQuery.data.fileName}</p>
            <p>Preset: {jobQuery.data.mappingPreset}</p>
            <p>Rows: {jobQuery.data.totalRows}</p>
            <p>
              Success {jobQuery.data.successRows} · Failed {jobQuery.data.failedRows} ·
              Skipped {jobQuery.data.skippedRows}
            </p>
            <Button
              className="cursor-pointer"
              disabled={start.isPending || jobQuery.data.status === "PROCESSING"}
              onClick={() => start.mutate()}
            >
              Start import
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
