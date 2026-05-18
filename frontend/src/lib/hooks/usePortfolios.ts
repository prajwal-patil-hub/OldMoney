'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portfoliosApi } from '@/lib/api'
import { STALE_TIME } from '@/lib/constants'
import type { CreatePortfolioInput } from '@/types/portfolio'

export const PORTFOLIOS_QUERY_KEY = ['portfolios'] as const

export function usePortfolios(params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: [...PORTFOLIOS_QUERY_KEY, params],
    queryFn: () => portfoliosApi.list(params).then((r) => r.data),
    staleTime: STALE_TIME.MEDIUM,
  })
}

export function usePortfolio(id: string) {
  return useQuery({
    queryKey: [...PORTFOLIOS_QUERY_KEY, id],
    queryFn: () => portfoliosApi.get(id).then((r) => r.data),
    staleTime: STALE_TIME.MEDIUM,
    enabled: !!id,
  })
}

export function usePortfolioHoldings(portfolioId: string) {
  return useQuery({
    queryKey: [...PORTFOLIOS_QUERY_KEY, portfolioId, 'holdings'],
    queryFn: () => portfoliosApi.holdings(portfolioId).then((r) => r.data),
    staleTime: STALE_TIME.SHORT,
    enabled: !!portfolioId,
  })
}

export function usePortfolioPerformance(
  portfolioId: string,
  params?: { start?: string; end?: string }
) {
  return useQuery({
    queryKey: [...PORTFOLIOS_QUERY_KEY, portfolioId, 'performance', params],
    queryFn: () => portfoliosApi.performance(portfolioId, params).then((r) => r.data),
    staleTime: STALE_TIME.MEDIUM,
    enabled: !!portfolioId,
  })
}

export function usePortfolioAllocation(portfolioId: string) {
  return useQuery({
    queryKey: [...PORTFOLIOS_QUERY_KEY, portfolioId, 'allocation'],
    queryFn: () => portfoliosApi.allocation(portfolioId).then((r) => r.data),
    staleTime: STALE_TIME.MEDIUM,
    enabled: !!portfolioId,
  })
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePortfolioInput) => portfoliosApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIOS_QUERY_KEY })
    },
  })
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreatePortfolioInput>) =>
      portfoliosApi.update(id, data).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIOS_QUERY_KEY })
      queryClient.setQueryData([...PORTFOLIOS_QUERY_KEY, data.id], data)
    },
  })
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => portfoliosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIOS_QUERY_KEY })
    },
  })
}
