import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { PermissionProvider } from "@/hooks/use-permission"

async function hasSessionCookie() {
  const jar = await cookies()
  return jar
    .getAll()
    .some(
      (c) =>
        c.name.includes("better-auth.session_token") ||
        c.name.includes("session_token")
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
          <AppHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6 lg:p-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionProvider>
  )
}
