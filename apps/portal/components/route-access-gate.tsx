import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { usePermission } from "@/hooks/use-permission"
import {
  getRequiredPermissionForPath,
  userHasRoutePermission,
} from "@/lib/route-permissions"

export function RouteAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading } = usePermission()

  if (isLoading || !user) {
    return children
  }

  const required = getRequiredPermissionForPath(pathname)
  const allowed = userHasRoutePermission(
    user.permissions ?? [],
    user.roles ?? [],
    required
  )

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-medium">Access denied</p>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  return children
}
