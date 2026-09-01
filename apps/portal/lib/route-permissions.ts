import { NAV_ITEMS, type NavItem } from "@/components/app-nav"

export type RoutePermissionRule = {
  href: string
  permission: string | string[]
}

function flattenNavPermissions(items: NavItem[]): RoutePermissionRule[] {
  const rules: RoutePermissionRule[] = []
  for (const item of items) {
    if (item.href && item.permission) {
      rules.push({ href: item.href, permission: item.permission })
    }
    if (item.children?.length) {
      rules.push(...flattenNavPermissions(item.children))
    }
  }
  return rules
}

const ROUTE_PERMISSION_RULES = flattenNavPermissions(NAV_ITEMS).sort(
  (a, b) => b.href.length - a.href.length
)

export function getRequiredPermissionForPath(
  pathname: string
): string | string[] | null {
  for (const rule of ROUTE_PERMISSION_RULES) {
    if (pathname === rule.href || pathname.startsWith(`${rule.href}/`)) {
      return rule.permission
    }
  }
  return null
}

/** Mirrors sidebar visibility: OR for permission arrays. */
export function userHasRoutePermission(
  permissions: string[],
  roles: string[],
  required: string | string[] | null
): boolean {
  if (!required) return true
  if (roles.includes("SUPER_ADMIN")) return true
  if (Array.isArray(required)) {
    return required.some((code) => permissions.includes(code))
  }
  return permissions.includes(required)
}
