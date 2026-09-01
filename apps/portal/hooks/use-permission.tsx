"use client"

import { useQuery } from "@tanstack/react-query"
import * as React from "react"

import { api, ApiError, type MeUser } from "@/lib/api"
import { signOutAndRedirect } from "@/lib/auth-client"
import { checkApiHealth } from "@/lib/check-api-health"
import type { SessionError } from "@/lib/server-session"

const PermissionContext = React.createContext<{
  user?: MeUser
  isLoading: boolean
  isError: boolean
  error: ApiError | SessionError | null
  hasPermission: (code: string | string[]) => boolean
  can: (code: string | string[]) => boolean
  refetch: () => void
}>({
  isLoading: true,
  isError: false,
  error: null,
  hasPermission: () => false,
  can: () => false,
  refetch: () => undefined,
})

let signingOutOn401 = false

function isRetryableApiError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  return error.status === 502 || error.status === 503 || error.status === 504
}

export function PermissionProvider({
  children,
  initialUser,
  initialError,
}: {
  children: React.ReactNode
  initialUser?: MeUser
  initialError?: SessionError
}) {
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const health = await checkApiHealth()
      if (!health.ok) {
        throw new ApiError(
          "API_UNAVAILABLE",
          health.message,
          health.status || 502
        )
      }

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
      if (isRetryableApiError(error)) return failureCount < 2
      return failureCount < 1
    },
    staleTime: 30_000,
    refetchOnMount: initialUser ? false : "always",
  })

  const user = query.data ?? initialUser
  const resolvedError: ApiError | SessionError | null =
    query.error instanceof ApiError
      ? query.error
      : initialError && !user
        ? initialError
        : null

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
        isError: (query.isError || Boolean(initialError)) && !user,
        error: resolvedError,
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
  const { can, isLoading, isError, user, error } = usePermission()
  return {
    allowed: Boolean(user) && can(code),
    isLoading,
    isError: isError && !user,
    error,
  }
}
