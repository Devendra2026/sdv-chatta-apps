"use client"

import { FileSpreadsheet, X } from "lucide-react"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

function isExcelFile(file: File) {
  const name = file.name.toLowerCase()
  return name.endsWith(".xlsx") || name.endsWith(".xls")
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function ImportDropzone({
  file,
  onFileChange,
  disabled,
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function accept(next: File | null) {
    if (!next) {
      setError(null)
      onFileChange(null)
      return
    }
    if (!isExcelFile(next)) {
      setError("Only .xlsx and .xls files are accepted.")
      return
    }
    setError(null)
    onFileChange(next)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id="import-file"
        type="file"
        accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => accept(e.target.files?.[0] ?? null)}
      />
      <label
        htmlFor="import-file"
        onDragEnter={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (disabled) return
          accept(e.dataTransfer.files[0] ?? null)
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors duration-150",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:border-primary/50 hover:bg-muted/40",
          dragging ? "border-primary bg-primary/5" : "border-input bg-muted/20"
        )}
      >
        <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-medium">
            Drop Excel file here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">.xlsx or .xls</p>
        </div>
      </label>
      {file ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <p className="min-w-0 truncate">
            <span className="font-medium">{file.name}</span>
            <span className="text-muted-foreground">
              {" "}
              · {formatBytes(file.size)}
            </span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="cursor-pointer"
            disabled={disabled}
            aria-label="Remove file"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = ""
              accept(null)
            }}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
