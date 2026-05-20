'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

export function useAuth() {
  const store = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

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
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  }
}
