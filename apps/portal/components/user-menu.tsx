"use client"

import { ChevronDown, LogOut } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { usePermission } from "@/hooks/use-permission"
import { signOutAndRedirect } from "@/lib/auth-client"

function initials(name?: string, email?: string): string {
  const source = name?.trim() || email?.trim() || "?"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

function primaryRoleLabel(roles?: string[]): string {
  if (!roles?.length) return "User"
  const role = roles[0] ?? "User"
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function UserMenu() {
  const { user, isLoading } = usePermission()

  if (isLoading) {
    return <Skeleton className="h-10 w-36 rounded-xl" />
  }

  const name = user?.name ?? "User"
  const email = user?.email ?? ""
  const roleLabel = primaryRoleLabel(user?.roles)
  const rolesFull = user?.roles?.length ? user.roles.join(", ") : "No role"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto cursor-pointer gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/80"
          />
        }
      >
        <Avatar size="default" className="ring-primary/15 ring-2">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {initials(user?.name, user?.email)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="truncate text-sm font-semibold leading-tight tracking-tight">
            {name}
          </p>
          <p className="text-muted-foreground truncate text-xs leading-tight">
            {roleLabel}
          </p>
        </div>
        <ChevronDown className="text-muted-foreground hidden size-4 sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold leading-none">{name}</p>
              <p className="text-muted-foreground text-xs leading-none">
                {email}
              </p>
              <p className="text-muted-foreground pt-1.5 text-[11px] leading-none">
                {rolesFull}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            void signOutAndRedirect()
          }}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
