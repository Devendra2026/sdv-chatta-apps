"use client"

import { useQuery } from "@tanstack/react-query"
import * as React from "react"

import { api, ApiError, type MeUser } from "@/lib/api"
import { signOutAndRedirect } from "@/lib/auth-client"

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

let signingOutOn401 = false

export function PermissionProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser?: MeUser
}) {
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const res = await api.get<MeUser>("/api/v1/auth/me")
        return res.data
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.status === 401 &&
          !initialUser &&
          typeof window !== "undefined" &&
          !signingOutOn401
        ) {
          signingOutOn401 = true
          void signOutAndRedirect()
        }
        throw err
      }
    },
    initialData: initialUser,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false
      return failureCount < 2
    },
    staleTime: 30_000,
    refetchOnMount: initialUser ? false : "always",
  })

  const user = query.data ?? initialUser

  const hasPermission = React.useCallback(
    (code: string | string[]) => {
      if (!user) return false
      const needed = Array.isArray(code) ? code : [code]
      const perms = user.permissions ?? []
      if (user.roles?.includes("SUPER_ADMIN")) return true
      return needed.every((c) => perms.includes(c))
    },
    [user]
  )

  return (
    <PermissionContext.Provider
      value={{
        user,
        isLoading: query.isLoading && !user,
        isError: query.isError && !user,
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
  const { can, isLoading, isError, user } = usePermission()
  return {
    allowed: Boolean(user) && can(code),
    isLoading,
    isError: isError && !user,
  }
}
