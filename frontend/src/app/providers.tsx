'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useRef } from 'react'
import { initApiStore } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

function ApiStoreInitializer() {
  const initialized = useRef(false)
  const store = useAuthStore()

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      initApiStore(() => ({
        accessToken: useAuthStore.getState().accessToken,
        refreshToken: useAuthStore.getState().refreshToken,
        setAuth: useAuthStore.getState().setAuth,
        clearAuth: useAuthStore.getState().clearAuth,
      }))
    }
  }, [store])

  return null
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: (failureCount, error) => {
          const axiosError = error as { response?: { status?: number } }
          if (axiosError?.response?.status === 401) return false
          if (axiosError?.response?.status === 403) return false
          if (axiosError?.response?.status === 404) return false
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ApiStoreInitializer />
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}
