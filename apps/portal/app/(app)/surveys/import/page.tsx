"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { Suspense } from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { usePermission } from "@/hooks/use-permission"
import { api } from "@/lib/api"
import { downloadAuthenticatedExport } from "@/lib/download-blob"

import { ImportDropzone } from "./_components/import-dropzone"
import { ImportErrorsTable } from "./_components/import-errors-table"
import { ImportKpis, ImportProgress } from "./_components/import-kpis"
import { ImportStatusBadge } from "./_components/import-status-badge"
import type {
  DuplicateStrategy,
  ImportJob,
  ImportPreview,
} from "./_components/types"

function ImportWizard() {
  const [file, setFile] = React.useState<File | null>(null)
  const [strategy, setStrategy] = React.useState<DuplicateStrategy>("UPDATE")
  const [pruneMissing, setPruneMissing] = React.useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const qc = useQueryClient()
  const { can, isLoading: permsLoading } = usePermission()
  const canCreate = can("import:create")
  const canRead = can("import:read")
  const jobId = searchParams.get("job")

  const jobQuery = useQuery({
    queryKey: ["import-job", jobId],
    enabled: Boolean(jobId),
    refetchInterval: (q) =>
      q.state.data?.status === "PROCESSING" ? 2000 : false,
    queryFn: async () =>
      (await api.get<ImportJob>(`/api/v1/imports/${jobId}`)).data,
  })

  const job = jobQuery.data
  const previewEnabled =
    Boolean(jobId) &&
    (canRead || canCreate) &&
    job?.status === "READY"

  const previewQuery = useQuery({
    queryKey: ["import-preview", jobId],
    enabled: previewEnabled,
    queryFn: async () =>
      (await api.get<ImportPreview>(`/api/v1/imports/${jobId}/preview`)).data,
  })

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Select a file")
      const form = new FormData()
      form.append("file", file)
      form.append("duplicateStrategy", strategy)
      return (await api.postForm<ImportJob>("/api/v1/imports/upload", form))
        .data
    },
    onSuccess: (data) => {
      setFile(null)
      setPruneMissing(false)
      toast.success(`Uploaded. Preset: ${data.mappingPreset ?? "detected"}`)
      void qc.invalidateQueries({ queryKey: ["imports"] })
      router.replace(`/surveys/import?job=${data.id}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const start = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("No job")
      return (
        await api.post<ImportJob>(`/api/v1/imports/${jobId}/start`, {
          pruneMissing,
        })
      ).data
    },
    onSuccess: () => {
      toast.success("Import started")
      void qc.invalidateQueries({ queryKey: ["import-job", jobId] })
      void qc.invalidateQueries({ queryKey: ["imports"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const downloadErrors = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("No job")
      await downloadAuthenticatedExport(
        `/api/v1/imports/${jobId}/errors.xlsx`,
        `import-errors-${jobId}.xlsx`
      )
    },
    onSuccess: () => toast.success("Error report downloaded"),
    onError: (e: Error) => toast.error(e.message),
  })

  function confirmAndStart() {
    const preview = previewQuery.data
    const lines = [
      `Start import of ${job?.fileName ?? "this workbook"}?`,
      preview
        ? `Rows: ${preview.totalRows.toLocaleString("en-IN")} · valid ${preview.validRows.toLocaleString("en-IN")} · invalid ${preview.invalidRows.toLocaleString("en-IN")} · duplicates ${preview.duplicateRows.toLocaleString("en-IN")} · warnings ${preview.warningRows.toLocaleString("en-IN")}`
        : null,
      pruneMissing
        ? "Prune missing is ON: surveys in the ward that are not in this file may be soft-deleted."
        : "Prune missing is OFF: existing surveys not in the file will be left alone.",
    ].filter(Boolean)
    if (!window.confirm(lines.join("\n\n"))) return
    start.mutate()
  }

  if (permsLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  const showErrorDownload =
    job &&
    (job.status === "PARTIAL" ||
      job.status === "FAILED" ||
      job.status === "COMPLETED") &&
    (job.failedRows > 0 || (job.errors?.length ?? 0) > 0)

  return (
    <div className="space-y-4">
      {canCreate && !jobId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload workbook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImportDropzone
              file={file}
              onFileChange={setFile}
              disabled={upload.isPending}
            />
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                When Survey ID already exists
              </legend>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="duplicateStrategy"
                    value="UPDATE"
                    className="cursor-pointer"
                    checked={strategy === "UPDATE"}
                    onChange={() => setStrategy("UPDATE")}
                  />
                  Update existing
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="duplicateStrategy"
                    value="SKIP"
                    className="cursor-pointer"
                    checked={strategy === "SKIP"}
                    onChange={() => setStrategy("SKIP")}
                  />
                  Skip duplicates
                </Label>
              </div>
            </fieldset>
            <Button
              className="cursor-pointer"
              disabled={!file || upload.isPending}
              onClick={() => upload.mutate()}
            >
              {upload.isPending ? "Uploading…" : "Upload & validate"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!canCreate && !jobId ? (
        <div className="rounded-xl border bg-card px-4 py-10 text-center">
          <p className="text-sm font-medium">You can view past imports only.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an admin for import permission to upload a workbook.
          </p>
          {canRead ? (
            <Button
              className="mt-4 cursor-pointer"
              variant="outline"
              render={<Link href="/surveys/import/history" />}
            >
              View history
            </Button>
          ) : null}
        </div>
      ) : null}

      {jobId ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Import job</CardTitle>
              {job ? (
                <p className="text-sm text-muted-foreground">
                  {job.fileName}
                  {job.mappingPreset ? ` · Preset ${job.mappingPreset}` : null}
                  {` · ${job.duplicateStrategy === "SKIP" ? "Skip duplicates" : "Update existing"}`}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {job ? <ImportStatusBadge status={job.status} /> : null}
              {canCreate ? (
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => router.replace("/surveys/import")}
                >
                  New import
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobQuery.isLoading ? (
              <div
                className="space-y-2"
                aria-busy="true"
                aria-label="Loading job"
              >
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-40" />
              </div>
            ) : jobQuery.isError ? (
              <div className="space-y-2" role="alert">
                <p className="text-sm text-destructive">
                  {jobQuery.error instanceof Error
                    ? jobQuery.error.message
                    : "Could not load this import job."}
                </p>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => void jobQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : job ? (
              <>
                <ImportKpis job={job} />
                {job.status === "PROCESSING" ? (
                  <ImportProgress
                    processed={job.processedRows}
                    total={job.totalRows}
                  />
                ) : null}

                {job.status === "READY" ? (
                  <ImportPreviewPanel
                    preview={previewQuery.data}
                    isLoading={previewQuery.isLoading}
                    isError={previewQuery.isError}
                    errorMessage={
                      previewQuery.error instanceof Error
                        ? previewQuery.error.message
                        : "Could not load preview"
                    }
                    onRetry={() => void previewQuery.refetch()}
                  />
                ) : null}

                {job.status === "READY" && canCreate ? (
                  <div className="space-y-3 rounded-xl border p-4">
                    <Label className="flex cursor-pointer items-start gap-3 text-sm leading-snug">
                      <Checkbox
                        checked={pruneMissing}
                        onCheckedChange={(v) => setPruneMissing(v === true)}
                        className="mt-0.5"
                      />
                      <span>
                        Soft-delete surveys in this ward that are{" "}
                        <span className="font-medium">missing from the file</span>
                        {" "}
                        (prune orphans). Leave unchecked to only insert/update
                        rows from the workbook.
                      </span>
                    </Label>
                    <Button
                      className="cursor-pointer"
                      disabled={start.isPending || previewQuery.isLoading}
                      onClick={confirmAndStart}
                    >
                      {start.isPending ? "Starting…" : "Review & start import"}
                    </Button>
                  </div>
                ) : null}

                {showErrorDownload && canRead ? (
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    disabled={downloadErrors.isPending}
                    onClick={() => downloadErrors.mutate()}
                  >
                    {downloadErrors.isPending
                      ? "Preparing…"
                      : "Download error report (.xlsx)"}
                  </Button>
                ) : null}

                <ImportErrorsTable errors={job.errors ?? []} />
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function ImportPreviewPanel({
  preview,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: {
  preview?: ImportPreview
  isLoading: boolean
  isError: boolean
  errorMessage: string
  onRetry: () => void
}) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading preview">
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
  if (isError) {
    return (
      <div className="space-y-2" role="alert">
        <p className="text-sm text-destructive">{errorMessage}</p>
        <Button variant="outline" className="cursor-pointer" onClick={onRetry}>
          Retry preview
        </Button>
      </div>
    )
  }
  if (!preview) return null

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <p className="text-sm font-medium">Preview (no data written yet)</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <PreviewStat label="Total" value={preview.totalRows} />
        <PreviewStat label="Valid" value={preview.validRows} />
        <PreviewStat label="Invalid" value={preview.invalidRows} />
        <PreviewStat label="Duplicates" value={preview.duplicateRows} />
        <PreviewStat label="Warnings" value={preview.warningRows} />
      </div>
      {preview.warnings.length > 0 ? (
        <ul className="list-inside list-disc space-y-1 text-sm text-amber-800 dark:text-amber-200">
          {preview.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {preview.unmappedHeaders.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Unmapped headers: {preview.unmappedHeaders.slice(0, 12).join(", ")}
          {preview.unmappedHeaders.length > 12
            ? ` (+${preview.unmappedHeaders.length - 12} more)`
            : null}
        </p>
      ) : null}
      {preview.sampleRows.length > 0 ? (
        <div className="max-h-48 overflow-auto rounded-lg border bg-background text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Row</th>
                <th className="px-2 py-1.5 font-medium">Survey Id</th>
                <th className="px-2 py-1.5 font-medium">Class</th>
                <th className="px-2 py-1.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((row) => (
                <tr key={`${row.rowNumber}-${row.surveyId}`} className="border-b last:border-0">
                  <td className="px-2 py-1.5 tabular-nums">{row.rowNumber}</td>
                  <td className="px-2 py-1.5 font-mono">{row.surveyId ?? "—"}</td>
                  <td className="px-2 py-1.5">{row.classification}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {row.messages.join("; ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  )
}

export default function ImportWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      }
    >
      <ImportWizard />
    </Suspense>
  )
}
