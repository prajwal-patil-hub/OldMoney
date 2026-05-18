'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, dashboardApi } from '@/lib/api'
import { STALE_TIME } from '@/lib/constants'
import type { CreateTransactionInput, TransactionType } from '@/types/transaction'

export const TRANSACTIONS_QUERY_KEY = ['transactions'] as const

interface TransactionFilters {
  page?: number
  page_size?: number
  portfolio_id?: string
  asset_id?: string
  transaction_type?: TransactionType
  start_date?: string
  end_date?: string
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, filters],
    queryFn: () => transactionsApi.list(filters).then((r) => r.data),
    staleTime: STALE_TIME.SHORT,
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, id],
    queryFn: () => transactionsApi.get(id).then((r) => r.data),
    staleTime: STALE_TIME.SHORT,
    enabled: !!id,
  })
}

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, 'recent', limit],
    queryFn: () => dashboardApi.recentTransactions(limit).then((r) => r.data),
    staleTime: STALE_TIME.SHORT,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTransactionInput) => transactionsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateTransactionInput>) =>
      transactionsApi.update(id, data).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.setQueryData([...TRANSACTIONS_QUERY_KEY, data.id], data)
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}
