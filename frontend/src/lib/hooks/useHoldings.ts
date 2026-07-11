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
        // The backend stores one holdings row per trade date (position deltas)
        // and top-holdings returns them unaggregated — group by asset so the
        // table shows one row per instrument.
        const byAsset = new Map<string, Holding>()
        for (const h of rows) {
          const assetId = String(h.asset_id ?? '')
          const currentValue = num(h.current_value)
          const costBasis = num(h.cost_basis)
          const prev = byAsset.get(assetId)
          if (prev) {
            prev.quantity += num(h.quantity)
            prev.cost_basis += costBasis
            prev.current_value += currentValue
          } else {
            byAsset.set(assetId, {
              id: String(h.holding_id ?? h.id ?? assetId),
              portfolio_id: String(h.portfolio_id ?? ''),
              asset_id: assetId,
              asset_name: String(h.asset_name ?? ''),
              asset_symbol: String(h.asset_symbol ?? ''),
              asset_type: h.asset_type as AssetType,
              quantity: num(h.quantity),
              avg_cost: 0,
              cost_basis: costBasis,
              current_price: num(h.current_price),
              current_value: currentValue,
              unrealized_gain: 0,
              unrealized_gain_pct: 0,
              weight: 0,
              updated_at: String(h.as_of_date ?? ''),
            })
          }
        }
        const holdings = [...byAsset.values()]
        const totalValue = holdings.reduce((s, h) => s + h.current_value, 0)
        for (const h of holdings) {
          h.unrealized_gain = h.current_value - h.cost_basis
          h.unrealized_gain_pct = h.cost_basis > 0 ? (h.unrealized_gain / h.cost_basis) * 100 : 0
          h.avg_cost = h.quantity > 0 ? h.cost_basis / h.quantity : 0
          h.weight = totalValue > 0 ? h.current_value / totalValue : 0
        }
        return holdings.sort((a, b) => b.current_value - a.current_value).slice(0, limit)
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
