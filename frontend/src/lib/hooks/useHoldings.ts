'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { STALE_TIME } from '@/lib/constants'
import type { DashboardMetrics, TimeSeriesPoint } from '@/types/api'
import type { Holding, AllocationBreakdown, AssetType } from '@/types/portfolio'

export const HOLDINGS_QUERY_KEY = ['holdings'] as const

// The backend serializes Decimal as strings and uses different field names than
// the dashboard components expect. These helpers normalize at the hook boundary
// so components can stay on a single, typed shape.
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function useTopHoldings(limit = 10) {
  return useQuery({
    queryKey: [...HOLDINGS_QUERY_KEY, 'top', limit],
    queryFn: () =>
      dashboardApi.topHoldings(limit).then((r) => {
        const rows = (r.data as unknown as Record<string, unknown>[]) ?? []
        return rows.map((h): Holding => {
          const currentValue = num(h.current_value)
          const costBasis = num(h.cost_basis)
          const gain = h.unrealized_gain_loss != null ? num(h.unrealized_gain_loss) : currentValue - costBasis
          const quantity = num(h.quantity)
          return {
            id: String(h.holding_id ?? h.id ?? ''),
            portfolio_id: String(h.portfolio_id ?? ''),
            asset_id: String(h.asset_id ?? ''),
            asset_name: String(h.asset_name ?? ''),
            asset_symbol: String(h.asset_symbol ?? ''),
            asset_type: h.asset_type as AssetType,
            quantity,
            avg_cost: quantity > 0 ? costBasis / quantity : 0,
            cost_basis: costBasis,
            current_price: num(h.current_price),
            current_value: currentValue,
            unrealized_gain: gain,
            unrealized_gain_pct: costBasis > 0 ? (gain / costBasis) * 100 : 0,
            weight: num(h.weight_pct) / 100,
            updated_at: String(h.as_of_date ?? ''),
          }
        })
      }),
    staleTime: STALE_TIME.SHORT,
  })
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () =>
      dashboardApi.metrics().then((r) => {
        const m = (r.data as unknown as Record<string, unknown>) ?? {}
        const metrics: DashboardMetrics = {
          total_aum: num(m.total_aum),
          total_aum_change: num(m.daily_change_pct),
          today_pnl: num(m.daily_change),
          today_pnl_pct: num(m.daily_change_pct),
          ytd_return: num(m.ytd_return),
          ytd_return_pct: num(m.ytd_return_pct),
          portfolio_count: num(m.total_portfolios),
        }
        return metrics
      }),
    staleTime: STALE_TIME.SHORT,
    refetchInterval: 5 * 60_000, // refresh every 5 min
  })
}

export function useDashboardPerformance(days = 30) {
  return useQuery({
    queryKey: ['dashboard', 'performance', days],
    queryFn: () =>
      dashboardApi.performance({ days }).then((r) => {
        const rows = (r.data as unknown as Record<string, unknown>[]) ?? []
        return rows.map((p): TimeSeriesPoint => ({
          date: String(p.date),
          value: num(p.value),
        }))
      }),
    staleTime: STALE_TIME.MEDIUM,
  })
}

export function useDashboardAllocation() {
  return useQuery({
    queryKey: ['dashboard', 'allocation'],
    queryFn: () =>
      dashboardApi.allocation().then((r) => {
        const rows = (r.data as unknown as Record<string, unknown>[]) ?? []
        return rows.map((a): AllocationBreakdown => ({
          asset_type: a.asset_type as AssetType,
          value: num(a.total_value),
          weight: num(a.percentage) / 100,
          count: num(a.count),
        }))
      }),
    staleTime: STALE_TIME.MEDIUM,
  })
}
