'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import type { AuthResponse } from '@/types/api'

export function useAuth() {
  const store = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password).then((r) => r.data),
    onSuccess: (data: AuthResponse) => {
      store.setAuth(data)
      queryClient.clear()
      router.push('/dashboard')
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: {
      email: string
      password: string
      full_name: string
      org_name: string
      org_slug: string
    }) => authApi.register(data).then((r) => r.data),
    onSuccess: (data: AuthResponse) => {
      store.setAuth(data)
      queryClient.clear()
      router.push('/dashboard')
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      store.clearAuth()
      queryClient.clear()
      router.push('/login')
    },
  })

  const { data: currentUser } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then((r) => r.data),
    enabled: !!store.accessToken,
    staleTime: 5 * 60_000,
  })

  return {
    user: currentUser ?? store.user,
    accessToken: store.accessToken,
    activeOrgId: store.activeOrgId,
    activeOrgRole: store.activeOrgRole,
    activeOrg: store.activeOrg,
    isAuthenticated: !!store.accessToken,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  }
}
