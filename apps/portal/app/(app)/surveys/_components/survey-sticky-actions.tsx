"use client"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type SurveyStickyActionsProps = {
  isDirty: boolean
  isPending: boolean
  isEdit: boolean
  onCancel: () => void
  saveLabel?: string
  className?: string
}

export function SurveyStickyActions({
  isDirty,
  isPending,
  isEdit,
  onCancel,
  saveLabel,
  className,
}: SurveyStickyActionsProps) {
  const disabled =
    isPending || (isEdit && !isDirty)

  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur-sm",
        className
      )}
    >
      <div className="min-h-5 text-sm" aria-live="polite">
        {isDirty ? (
          <span className="inline-flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200">
            <span
              className="size-2 rounded-full bg-amber-500"
              aria-hidden
            />
            Unsaved changes
          </span>
        ) : (
          <span className="text-muted-foreground">
            {isEdit ? "All changes saved" : "Ready to create"}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={disabled}
        >
          {isPending
            ? "Saving…"
            : saveLabel ?? (isEdit ? "Save Changes" : "Save survey")}
        </Button>
      </div>
    </div>
  )
}
