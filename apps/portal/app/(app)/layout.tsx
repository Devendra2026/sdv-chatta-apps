import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Separator } from "@workspace/ui/components/separator"

import { AppSidebar } from "@/components/app-sidebar"
import { PermissionProvider } from "@/hooks/use-permission"

async function hasSessionCookie() {
  const jar = await cookies()
  return (
    jar.getAll().some((c) => c.name.includes("session") || c.name.includes("better-auth"))
  )
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!(await hasSessionCookie())) {
    redirect("/login")
  }

  return (
    <PermissionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-20 flex h-12 items-center gap-2 border-b px-3">
            <SidebarTrigger className="cursor-pointer" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <p className="text-muted-foreground text-sm">
              Municipal survey &amp; payment operations
            </p>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionProvider>
  )
}
