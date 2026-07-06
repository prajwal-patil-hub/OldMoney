'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftRight,
  DollarSign,
  TrendingUp,
  Briefcase,
  TrendingDown,
} from 'lucide-react'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { AllocationChart } from '@/components/charts/AllocationChart'
import { HoldingsTable, type Holding } from '@/components/tables/HoldingsTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants'
import {
  useDashboardMetrics,
  useDashboardPerformance,
  useDashboardAllocation,
  useTopHoldings,
} from '@/lib/hooks/useHoldings'
import { useRecentTransactions } from '@/lib/hooks/useTransactions'
import type { Holding as ApiHolding } from '@/types/portfolio'
import type { Transaction, TransactionType } from '@/types/transaction'

// ─── Grain options ─────────────────────────────────────────────────────────────

type Grain = '1W' | '1M' | '3M' | 'YTD' | '1Y'

const GRAIN_OPTIONS: { label: string; value: Grain; days: number }[] = [
  { label: '1W', value: '1W', days: 7 },
  { label: '1M', value: '1M', days: 30 },
  { label: '3M', value: '3M', days: 90 },
  { label: 'YTD', value: 'YTD', days: 365 },
  { label: '1Y', value: '1Y', days: 365 },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function MetricCards() {
  const { data: metrics, isLoading } = useDashboardMetrics()

  const displayMetrics = metrics ?? {
    total_aum: 0,
    total_aum_change: 0,
    today_pnl: 0,
    today_pnl_pct: 0,
    ytd_return: 0,
    ytd_return_pct: 0,
    portfolio_count: 0,
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <MetricCard
        label="Total AUM"
        value={formatCurrency(displayMetrics.total_aum)}
        change={displayMetrics.total_aum_change}
        changeLabel="vs last month"
        icon={DollarSign}
        loading={isLoading}
        valueClassName="font-display text-3xl"
      />
      <MetricCard
        label="Today's P&L"
        value={formatCurrency(displayMetrics.today_pnl)}
        change={displayMetrics.today_pnl_pct}
        changeLabel="vs yesterday close"
        icon={displayMetrics.today_pnl >= 0 ? TrendingUp : TrendingDown}
        loading={isLoading}
        valueClassName={cn(
          'font-display text-3xl',
          displayMetrics.today_pnl >= 0 ? 'text-positive' : 'text-negative'
        )}
      />
      <MetricCard
        label="YTD Return"
        value={formatCurrency(displayMetrics.ytd_return)}
        change={displayMetrics.ytd_return_pct}
        changeLabel="year to date"
        icon={TrendingUp}
        loading={isLoading}
        valueClassName={cn(
          'font-display text-3xl',
          displayMetrics.ytd_return >= 0 ? 'text-positive' : 'text-negative'
        )}
      />
      <MetricCard
        label="Portfolios"
        value={displayMetrics.portfolio_count.toString()}
        icon={Briefcase}
        loading={isLoading}
        valueClassName="font-display text-3xl"
      />
    </div>
  )
}

function PerformanceSection() {
  const [activeGrain, setActiveGrain] = useState<Grain>('1M')
  const activeDays = GRAIN_OPTIONS.find((g) => g.value === activeGrain)?.days ?? 30

  const { data, isLoading } = useDashboardPerformance(activeDays)
  const chartData = data ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Portfolio Performance</CardTitle>
          {/* Grain pill row */}
          <div className="flex items-center gap-1" role="group" aria-label="Time range">
            {GRAIN_OPTIONS.map((g) => {
              const isActive = activeGrain === g.value
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setActiveGrain(g.value)}
                  className={cn(
                    'h-6 px-2.5 rounded text-xs font-medium transition-colors duration-[120ms]',
                    isActive
                      ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-muted'
                  )}
                  aria-pressed={isActive}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="min-h-[260px]">
          <PerformanceChart
            data={chartData}
            loading={isLoading}
            height={260}
            grain={activeGrain}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function AllocationSection() {
  const { data, isLoading } = useDashboardAllocation()
  const chartData = data ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="min-h-[260px]">
          <AllocationChart
            data={chartData}
            loading={isLoading}
            height={260}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function HoldingsSection() {
  const { data: rawHoldings, isLoading } = useTopHoldings(10)

  const holdings: Holding[] = (rawHoldings ?? []).map((h: ApiHolding) => ({
    id: h.id,
    asset_name: h.asset_name,
    asset_symbol: h.asset_symbol,
    asset_type: h.asset_type,
    quantity: h.quantity,
    cost_basis: h.cost_basis,
    current_value: h.current_value,
    unrealized_gain: h.unrealized_gain,
    unrealized_gain_pct: h.unrealized_gain_pct,
    weight: h.weight,
  }))

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Top Holdings</CardTitle>
          <span className="text-xs text-text-muted">By current value</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <HoldingsTable holdings={holdings} loading={isLoading} />
      </CardContent>
    </Card>
  )
}

const CREDIT_TYPES = new Set<TransactionType>([
  'BUY',
  'DEPOSIT',
  'DIVIDEND',
  'INTEREST',
  'TRANSFER_IN',
])

function getTypeIconBg(type: TransactionType) {
  if (CREDIT_TYPES.has(type)) return 'bg-positive-subtle'
  if (type === 'FEE' || type === 'TAX') return 'bg-surface-muted'
  return 'bg-negative-subtle'
}

function getTypeIconColor(type: TransactionType) {
  if (CREDIT_TYPES.has(type)) return 'text-positive'
  if (type === 'FEE' || type === 'TAX') return 'text-text-muted'
  return 'text-negative'
}

function RecentTransactionsSection() {
  const { data: transactions, isLoading } = useRecentTransactions(8)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <Link
            href="/transactions"
            className="text-xs text-text-muted hover:text-text-primary transition-colors duration-[120ms]"
          >
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="size-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : !transactions?.length ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No recent transactions"
            description="Your transactions will appear here."
            className="py-8"
          />
        ) : (
          <div>
            {transactions.map((txn: Transaction) => {
              const isCredit = CREDIT_TYPES.has(txn.transaction_type)
              const TxnIcon = isCredit ? TrendingUp : TrendingDown
              return (
                <div key={txn.id} className="flex items-start gap-3 py-2.5">
                  {/* Icon circle */}
                  <div
                    className={cn(
                      'size-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      getTypeIconBg(txn.transaction_type)
                    )}
                    aria-hidden="true"
                  >
                    <TxnIcon
                      className={cn('size-4', getTypeIconColor(txn.transaction_type))}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: name + amount */}
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {txn.asset_id ?? txn.portfolio_id ?? '—'}
                      </p>
                      <span
                        className={cn(
                          'text-sm tabular-nums flex-shrink-0',
                          isCredit ? 'text-positive' : 'text-negative'
                        )}
                      >
                        {isCredit ? '+' : '−'}
                        {formatCurrency(Math.abs(txn.net_amount ?? 0), txn.currency)}
                      </span>
                    </div>

                    {/* Row 2: type badge + account + date */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant={(isCredit ? 'success' : 'danger') as 'success' | 'danger'}
                        className="text-[10px] py-0 px-1.5 h-4"
                      >
                        {TRANSACTION_TYPE_LABELS[txn.transaction_type as TransactionType]}
                      </Badge>
                      {txn.account_id && (
                        <span className="text-xs text-text-muted truncate">
                          {txn.account_id.slice(0, 8)}
                        </span>
                      )}
                      <span className="text-xs text-text-muted ml-auto flex-shrink-0">
                        {formatDate(txn.trade_date, 'MMM d')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="page-transition space-y-6">
      <PageHeader
        title="Dashboard"
        asOf={`As of ${today} · Updated just now`}
      />

      {/* KPI strip */}
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <MetricCard key={i} label="" value="" loading />
              ))}
            </div>
          }
        >
          <MetricCards />
        </Suspense>
      </ErrorBoundary>

      {/* Charts row: 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ErrorBoundary>
          <div className="lg:col-span-2">
            <Suspense fallback={<Skeleton className="h-[340px] rounded-lg" />}>
              <PerformanceSection />
            </Suspense>
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<Skeleton className="h-[340px] rounded-lg" />}>
            <AllocationSection />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Bottom row: 2/3 + 1/3 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ErrorBoundary>
          <div className="xl:col-span-2">
            <Suspense fallback={<Skeleton className="h-[400px] rounded-lg" />}>
              <HoldingsSection />
            </Suspense>
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<Skeleton className="h-[400px] rounded-lg" />}>
            <RecentTransactionsSection />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}
