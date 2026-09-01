import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { PermissionProvider } from "@/hooks/use-permission"
import { fetchCurrentUser } from "@/lib/server-session"

export const dynamic = "force-dynamic"

export default async function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await fetchCurrentUser()
  if (session.status === "unauthenticated") {
    redirect("/login?signedOut=1")
  }

  return (
    <PermissionProvider
      initialUser={session.status === "ok" ? session.user : undefined}
      initialError={
        session.status === "unavailable" ? session.error : undefined
      }
    >
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
