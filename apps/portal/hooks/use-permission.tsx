"use client"

import { useQuery } from "@tanstack/react-query"
import * as React from "react"

import { api, type MeUser } from "@/lib/api"

const PermissionContext = React.createContext<{
  user?: MeUser
  isLoading: boolean
  isError: boolean
  hasPermission: (code: string | string[]) => boolean
  can: (code: string | string[]) => boolean
  refetch: () => void
}>({
  isLoading: true,
  isError: false,
  hasPermission: () => false,
  can: () => false,
  refetch: () => undefined,
})

export function PermissionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await api.get<MeUser>("/api/v1/auth/me")
      return res.data
    },
    retry: 2,
    staleTime: 30_000,
    refetchOnMount: "always",
  })

  const hasPermission = React.useCallback(
    (code: string | string[]) => {
      if (query.isLoading || !query.data) return false
      const needed = Array.isArray(code) ? code : [code]
      const perms = query.data.permissions ?? []
      if (query.data.roles?.includes("SUPER_ADMIN")) return true
      return needed.every((c) => perms.includes(c))
    },
    [query.data, query.isLoading]
  )

  return (
    <PermissionContext.Provider
      value={{
        user: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        hasPermission,
        can: hasPermission,
        refetch: () => {
          void query.refetch()
        },
      }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermission() {
  return React.useContext(PermissionContext)
}

export function useCan(code: string | string[]) {
  const { can, isLoading, isError } = usePermission()
  return { allowed: !isLoading && !isError && can(code), isLoading, isError }
}
