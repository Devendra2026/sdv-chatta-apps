"use client"

import { ChevronDown, KeyRound, LogOut } from "lucide-react"
import Link from "next/link"

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
        <Avatar size="default" className="ring-2 ring-primary/15">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initials(user?.name, user?.email)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="truncate text-sm leading-tight font-semibold tracking-tight">
            {name}
          </p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            {roleLabel}
          </p>
        </div>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-none font-semibold">{name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {email}
              </p>
              <p className="pt-1.5 text-[11px] leading-none text-muted-foreground">
                {rolesFull}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          render={<Link href="/settings/profile" />}
        >
          <KeyRound className="size-4" />
          Profile &amp; password
        </DropdownMenuItem>
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
