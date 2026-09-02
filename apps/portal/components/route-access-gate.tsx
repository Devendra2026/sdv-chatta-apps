"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { ApiUnavailablePanel } from "@/components/api-unavailable-panel"
import { usePermission } from "@/hooks/use-permission"
import {
  getRequiredPermissionForPath,
  userHasRoutePermission,
} from "@/lib/route-permissions"

function AccessDenied() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-lg font-medium">Access denied</p>
      <p className="text-sm text-muted-foreground">
        You do not have permission to view this page.
      </p>
    </div>
  )
}

function RouteAccessLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-4 w-64 rounded-md" />
    </div>
  )
}

export function RouteAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading, isError, error } = usePermission()

  if (isLoading) {
    return <RouteAccessLoading />
  }

  if (!user && isError) {
    return <ApiUnavailablePanel error={error} />
  }

  if (!user) {
    return <AccessDenied />
  }

  const required = getRequiredPermissionForPath(pathname)
  const allowed = userHasRoutePermission(
    user.permissions ?? [],
    user.roles ?? [],
    required
  )

  if (!allowed) {
    return <AccessDenied />
  }

  return children
}
