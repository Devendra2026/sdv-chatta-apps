"use client"

import { SidebarTrigger } from "@workspace/ui/components/sidebar"

import { HeaderSearch } from "@/components/header-search"
import { RoleBadge } from "@/components/role-badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"

export function AppHeader() {
  return (
    <header className="bg-card/80 supports-backdrop-filter:bg-card/70 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-3 backdrop-blur-md md:h-16 md:gap-4 md:px-5">
      <SidebarTrigger className="hover:bg-muted/80 cursor-pointer rounded-xl" />
      <HeaderSearch />
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <RoleBadge />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
