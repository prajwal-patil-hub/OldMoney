'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { STALE_TIME } from '@/lib/constants'

export const HOLDINGS_QUERY_KEY = ['holdings'] as const

export function useTopHoldings(limit = 10) {
  return useQuery({
    queryKey: [...HOLDINGS_QUERY_KEY, 'top', limit],
    queryFn: () => dashboardApi.topHoldings(limit).then((r) => r.data),
    staleTime: STALE_TIME.SHORT,
  })
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => dashboardApi.metrics().then((r) => r.data),
    staleTime: STALE_TIME.SHORT,
    refetchInterval: 5 * 60_000, // refresh every 5 min
  })
}

export function useDashboardPerformance(days = 30) {
  return useQuery({
    queryKey: ['dashboard', 'performance', days],
    queryFn: () => dashboardApi.performance({ days }).then((r) => r.data),
    staleTime: STALE_TIME.MEDIUM,
  })
}

export function useDashboardAllocation() {
  return useQuery({
    queryKey: ['dashboard', 'allocation'],
    queryFn: () => dashboardApi.allocation().then((r) => r.data),
    staleTime: STALE_TIME.MEDIUM,
  })
}
