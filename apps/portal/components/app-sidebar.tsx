"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, ChevronDown, LogOut } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { NAV_ITEMS, type NavItem } from "@/components/app-nav"
import { usePermission } from "@/hooks/use-permission"
import { signOutAndRedirect } from "@/lib/auth-client"

function canSee(item: NavItem, hasPermission: (c: string | string[]) => boolean) {
  if (!item.permission) return true
  if (Array.isArray(item.permission)) {
    return item.permission.some((p) => hasPermission(p))
  }
  return hasPermission(item.permission)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, hasPermission, isLoading, isError, refetch } = usePermission()

  const visible = NAV_ITEMS.filter((item) => canSee(item, hasPermission)).map(
    (item) => ({
      ...item,
      children: item.children?.filter((c) => canSee(c, hasPermission)),
    })
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2 px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
            <Building2 className="size-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">Nagar Panchayat Chhata</p>
            <p className="text-muted-foreground truncate text-xs">
              Mathura, Uttar Pradesh
            </p>
          </div>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <div className="space-y-2 px-2 py-1">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : isError ? (
                <div className="text-muted-foreground space-y-2 px-2 text-xs">
                  <p>Could not load permissions.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : visible.length === 0 ? (
                <p className="text-muted-foreground px-2 text-xs">
                  No menu access for this account. Ask an admin to assign a role.
                </p>
              ) : (
                visible.map((item) => {
                  if (item.children?.length) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton className="cursor-pointer">
                          {item.icon ? <item.icon /> : null}
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                render={<Link href={child.href!} />}
                                isActive={
                                  pathname === child.href ||
                                  pathname.startsWith(`${child.href}/`)
                                }
                                className="cursor-pointer"
                              >
                                <span>{child.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    )
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        render={<Link href={item.href!} />}
                        isActive={pathname === item.href}
                        className="cursor-pointer"
                      >
                        {item.icon ? <item.icon /> : null}
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 p-3">
        <div className="group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium">{user?.name ?? "…"}</p>
          <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
          {user?.roles?.length ? (
            <p className="text-muted-foreground truncate text-[11px]">
              {user.roles.join(", ")}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer justify-start"
          onClick={() => {
            void signOutAndRedirect()
          }}
        >
          <LogOut className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
