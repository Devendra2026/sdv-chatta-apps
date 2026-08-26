import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

export function RolePill({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-primary/10 font-medium text-primary hover:bg-primary/15",
        className
      )}
    >
      {code}
    </Badge>
  )
}

export function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
      aria-hidden
    >
      {initials || "?"}
    </span>
  )
}
