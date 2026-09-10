"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

type UnsavedChangesGuardProps = {
  isDirty: boolean
  /** Called when user confirms leave without saving. */
  fallbackHref: string
}

export function useUnsavedChangesGuard(isDirty: boolean) {
  const [pendingHref, setPendingHref] = React.useState<string | null>(null)
  const router = useRouter()

  React.useEffect(() => {
    if (!isDirty) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [isDirty])

  function requestLeave(href: string) {
    if (!isDirty) {
      router.push(href)
      return
    }
    setPendingHref(href)
  }

  function stay() {
    setPendingHref(null)
  }

  function leave() {
    const href = pendingHref
    setPendingHref(null)
    if (href) router.push(href)
  }

  return {
    pendingHref,
    requestLeave,
    stay,
    leave,
    dialogOpen: pendingHref != null,
  }
}

export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean
  onStay: () => void
  onLeave: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onStay()
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>
            You have changes that haven&apos;t been saved. Leave without
            saving?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={onStay}
          >
            Stay
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="cursor-pointer"
            onClick={onLeave}
          >
            Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Convenience wrapper unused by page if composing hooks separately. */
export function UnsavedChangesGuard({
  isDirty,
  fallbackHref,
}: UnsavedChangesGuardProps) {
  const guard = useUnsavedChangesGuard(isDirty)
  React.useEffect(() => {
    void fallbackHref
  }, [fallbackHref])
  return (
    <UnsavedChangesDialog
      open={guard.dialogOpen}
      onStay={guard.stay}
      onLeave={guard.leave}
    />
  )
}
