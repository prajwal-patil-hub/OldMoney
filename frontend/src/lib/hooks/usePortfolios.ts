'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portfoliosApi } from '@/lib/api'
import { STALE_TIME } from '@/lib/constants'
import type { CreatePortfolioInput, Holding, AllocationBreakdown, AssetType } from '@/types/portfolio'
import type { TimeSeriesPoint } from '@/types/api'

export const PORTFOLIOS_QUERY_KEY = ['portfolios'] as const

// Backend serializes Decimal as strings; coerce defensively.
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export interface PortfolioSummary {
  portfolio_id: string
  total_value: number
  total_cost_basis: number
  unrealized_gain_loss: number
  unrealized_gain_loss_pct: number
  num_accounts: number
  num_holdings: number
  as_of_date: string
}

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

export function usePortfolioSummary(id: string) {
  return useQuery({
    queryKey: [...PORTFOLIOS_QUERY_KEY, id, 'summary'],
    queryFn: () =>
      portfoliosApi.summary(id).then((r) => {
        const s = (r.data as unknown as Record<string, unknown>) ?? {}
        const summary: PortfolioSummary = {
          portfolio_id: String(s.portfolio_id ?? id),
          total_value: num(s.total_value),
          total_cost_basis: num(s.total_cost_basis),
          unrealized_gain_loss: num(s.unrealized_gain_loss),
          unrealized_gain_loss_pct: num(s.unrealized_gain_loss_pct),
          num_accounts: num(s.num_accounts),
          num_holdings: num(s.num_holdings),
          as_of_date: String(s.as_of_date ?? ''),
        }
        return summary
      }),
    staleTime: STALE_TIME.SHORT,
    enabled: !!id,
  })
}

// /holdings is a paginated endpoint ({items,...} after the interceptor reshape),
// and HoldingOut uses different field names than the UI's Holding type.
function normalizeHolding(h: Record<string, unknown>, totalValue: number): Holding {
  const quantity = num(h.quantity)
  const costBasis = num(h.cost_basis)
  const currentValue = num(h.current_value)
  const gain = h.unrealized_gain_loss != null ? num(h.unrealized_gain_loss) : currentValue - costBasis
  return {
    id: String(h.id ?? ''),
    portfolio_id: String(h.portfolio_id ?? ''),
    asset_id: String(h.asset_id ?? ''),
    asset_name: String(h.asset_name ?? ''),
    asset_symbol: String(h.asset_symbol ?? ''),
    asset_type: (h.asset_type ?? 'OTHER') as AssetType,
    quantity,
    avg_cost: h.cost_basis_per_unit != null ? num(h.cost_basis_per_unit) : quantity > 0 ? costBasis / quantity : 0,
    cost_basis: costBasis,
    current_price: num(h.current_price),
    current_value: currentValue,
    unrealized_gain: gain,
    unrealized_gain_pct:
      h.unrealized_gain_loss_pct != null ? num(h.unrealized_gain_loss_pct) : costBasis > 0 ? (gain / costBasis) * 100 : 0,
    weight: totalValue > 0 ? currentValue / totalValue : 0,
    updated_at: String(h.as_of_date ?? ''),
  }
}

export function usePortfolioHoldings(portfolioId: string) {
  return useQuery({
    queryKey: [...PORTFOLIOS_QUERY_KEY, portfolioId, 'holdings'],
    queryFn: () =>
      portfoliosApi.holdings(portfolioId).then((r) => {
        const data = r.data as unknown
        const rows = (
          Array.isArray(data) ? data : ((data as { items?: unknown[] })?.items ?? [])
        ) as Record<string, unknown>[]
        const totalValue = rows.reduce((sum, h) => sum + num(h.current_value), 0)
        const normalized = rows.map((h) => normalizeHolding(h, totalValue))
        // Backend stores one row per trade date (position deltas) — aggregate
        // by asset so the table shows one row per instrument.
        const byAsset = new Map<string, Holding>()
        for (const h of normalized) {
          const prev = byAsset.get(h.asset_id)
          if (prev) {
            prev.quantity += h.quantity
            prev.cost_basis += h.cost_basis
            prev.current_value += h.current_value
            prev.weight += h.weight
          } else {
            byAsset.set(h.asset_id, { ...h })
          }
        }
        const merged = [...byAsset.values()]
        for (const h of merged) {
          h.unrealized_gain = h.current_value - h.cost_basis
          h.unrealized_gain_pct = h.cost_basis > 0 ? (h.unrealized_gain / h.cost_basis) * 100 : 0
          h.avg_cost = h.quantity > 0 ? h.cost_basis / h.quantity : 0
        }
        return merged.sort((a, b) => b.current_value - a.current_value)
      }),
    staleTime: STALE_TIME.SHORT,
    enabled: !!portfolioId,
  })
}

export function usePortfolioPerformance(portfolioId: string, params?: { days?: number }) {
  return useQuery({
    queryKey: [...PORTFOLIOS_QUERY_KEY, portfolioId, 'performance', params],
    queryFn: () =>
      portfoliosApi.performance(portfolioId, params).then((r) => {
        const rows = (r.data as unknown as Record<string, unknown>[]) ?? []
        return rows.map((p): TimeSeriesPoint => ({ date: String(p.date), value: num(p.value) }))
      }),
    staleTime: STALE_TIME.MEDIUM,
    enabled: !!portfolioId,
  })
}

export function usePortfolioAllocation(portfolioId: string) {
  return useQuery({
    queryKey: [...PORTFOLIOS_QUERY_KEY, portfolioId, 'allocation'],
    queryFn: () =>
      portfoliosApi.allocation(portfolioId).then((r) => {
        const rows = (r.data as unknown as Record<string, unknown>[]) ?? []
        return rows.map((a): AllocationBreakdown => ({
          asset_type: a.asset_type as AssetType,
          value: num(a.total_value),
          weight: num(a.percentage) / 100,
          count: num(a.count),
        }))
      }),
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
