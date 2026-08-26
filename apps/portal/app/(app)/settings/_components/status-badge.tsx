import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  INACTIVE:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  SUSPENDED:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toUpperCase()
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium tracking-wide uppercase",
        STATUS_STYLES[key] ?? "text-muted-foreground"
      )}
    >
      {status}
    </Badge>
  )
}
