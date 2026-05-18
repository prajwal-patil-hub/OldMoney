'use client'

import { Suspense } from 'react'
import { LayoutDashboard, DollarSign, TrendingUp, Briefcase, ArrowLeftRight } from 'lucide-react'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { AllocationChart } from '@/components/charts/AllocationChart'
import { HoldingsTable } from '@/components/tables/HoldingsTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants'
import { useDashboardMetrics, useDashboardPerformance, useDashboardAllocation, useTopHoldings } from '@/lib/hooks/useHoldings'
import { useRecentTransactions } from '@/lib/hooks/useTransactions'
import type { TransactionType } from '@/types/transaction'

// Generate mock performance data for demonstration when API not available
function generateMockPerformance() {
  const data = []
  const baseValue = 2_450_000
  let current = baseValue
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const change = (Math.random() - 0.45) * 0.008 * current
    current += change
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(current),
    })
  }
  return data
}

const MOCK_PERFORMANCE = generateMockPerformance()

const MOCK_ALLOCATION = [
  { asset_type: 'equity' as const, value: 1_225_000, weight: 0.5, count: 12 },
  { asset_type: 'fixed_income' as const, value: 490_000, weight: 0.2, count: 5 },
  { asset_type: 'real_estate' as const, value: 367_500, weight: 0.15, count: 3 },
  { asset_type: 'private_equity' as const, value: 245_000, weight: 0.1, count: 2 },
  { asset_type: 'cash' as const, value: 122_500, weight: 0.05, count: 1 },
]

function MetricCards() {
  const { data: metrics, isLoading } = useDashboardMetrics()

  // Use mock data if API unavailable
  const displayMetrics = metrics ?? {
    total_aum: 2_450_000,
    total_aum_change: 3.24,
    today_pnl: 12_850,
    today_pnl_pct: 0.53,
    ytd_return: 187_200,
    ytd_return_pct: 8.27,
    portfolio_count: 4,
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
      />
      <MetricCard
        label="Today's P&L"
        value={formatCurrency(displayMetrics.today_pnl)}
        change={displayMetrics.today_pnl_pct}
        changeLabel="vs yesterday close"
        icon={TrendingUp}
        loading={isLoading}
        valueClassName={
          displayMetrics.today_pnl >= 0 ? 'text-success' : 'text-danger'
        }
      />
      <MetricCard
        label="YTD Return"
        value={formatCurrency(displayMetrics.ytd_return)}
        change={displayMetrics.ytd_return_pct}
        changeLabel="year to date"
        icon={LayoutDashboard}
        loading={isLoading}
        valueClassName={
          displayMetrics.ytd_return >= 0 ? 'text-success' : 'text-danger'
        }
      />
      <MetricCard
        label="Portfolios"
        value={displayMetrics.portfolio_count.toString()}
        icon={Briefcase}
        loading={isLoading}
      />
    </div>
  )
}

function PerformanceSection() {
  const { data, isLoading } = useDashboardPerformance(30)
  const chartData = data?.length ? data : MOCK_PERFORMANCE

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Portfolio Performance</CardTitle>
          <span className="text-xs text-text-muted">Last 30 days</span>
        </div>
      </CardHeader>
      <CardContent>
        <PerformanceChart
          data={chartData}
          loading={isLoading}
          height={260}
        />
      </CardContent>
    </Card>
  )
}

function AllocationSection() {
  const { data, isLoading } = useDashboardAllocation()
  const chartData = data?.length ? data : MOCK_ALLOCATION

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <AllocationChart
          data={chartData}
          loading={isLoading}
          height={260}
        />
      </CardContent>
    </Card>
  )
}

function HoldingsSection() {
  const { data: holdings, isLoading } = useTopHoldings(10)

  const mockHoldings = Array.from({ length: 5 }, (_, i) => ({
    id: `h-${i}`,
    portfolio_id: 'p1',
    asset_id: `a-${i}`,
    asset_name: ['Apple Inc.', 'Microsoft Corp.', 'Alphabet Inc.', 'Amazon.com', 'Berkshire Hathaway'][i] ?? 'Unknown',
    asset_symbol: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'BRK.B'][i] ?? 'N/A',
    asset_type: 'equity' as const,
    quantity: [150, 200, 80, 60, 40][i] ?? 100,
    avg_cost: [145.20, 310.50, 2580.00, 3100.00, 290.00][i] ?? 100,
    cost_basis: [21780, 62100, 206400, 186000, 11600][i] ?? 10000,
    current_price: [192.50, 425.80, 2945.00, 3380.00, 345.50][i] ?? 150,
    current_value: [28875, 85160, 235600, 202800, 13820][i] ?? 15000,
    unrealized_gain: [7095, 23060, 29200, 16800, 2220][i] ?? 5000,
    unrealized_gain_pct: [32.57, 37.13, 14.15, 9.03, 19.14][i] ?? 10,
    weight: [0.25, 0.20, 0.18, 0.15, 0.12][i] ?? 0.1,
    updated_at: new Date().toISOString(),
  }))

  const displayHoldings = holdings?.length ? holdings : mockHoldings

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Top Holdings</CardTitle>
          <span className="text-xs text-text-muted">By current value</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-0 pb-0">
        <HoldingsTable holdings={displayHoldings} loading={isLoading} />
      </CardContent>
    </Card>
  )
}

function RecentTransactionsSection() {
  const { data: transactions, isLoading } = useRecentTransactions(8)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
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
          <div className="space-y-1">
            {transactions.map((txn) => {
              const isCredit = ['buy', 'deposit', 'dividend', 'interest', 'transfer_in'].includes(
                txn.transaction_type
              )
              return (
                <div
                  key={txn.id}
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 group"
                >
                  <div
                    className={cn(
                      'size-8 rounded-full flex items-center justify-center flex-shrink-0',
                      isCredit ? 'bg-success-bg' : 'bg-danger-bg'
                    )}
                    aria-hidden="true"
                  >
                    <TrendingUp
                      className={cn(
                        'size-4',
                        isCredit ? 'text-success' : 'text-danger rotate-180'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {txn.asset_name ?? txn.portfolio_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant={isCredit ? 'success' : 'danger'}
                        className="text-[10px] py-0 px-1.5"
                      >
                        {TRANSACTION_TYPE_LABELS[txn.transaction_type as TransactionType]}
                      </Badge>
                      <span className="text-xs text-text-muted">{formatDate(txn.trade_date)}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums flex-shrink-0',
                      isCredit ? 'text-success' : 'text-danger'
                    )}
                  >
                    {isCredit ? '+' : '-'}
                    {formatCurrency(Math.abs(txn.net_amount))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your wealth at a glance"
      />

      {/* Metric cards */}
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ErrorBoundary>
          <div className="lg:col-span-2">
            <Suspense fallback={<Skeleton className="h-[320px] rounded-card" />}>
              <PerformanceSection />
            </Suspense>
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<Skeleton className="h-[320px] rounded-card" />}>
            <AllocationSection />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ErrorBoundary>
          <div className="xl:col-span-2">
            <Suspense fallback={<Skeleton className="h-[400px] rounded-card" />}>
              <HoldingsSection />
            </Suspense>
          </div>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<Skeleton className="h-[400px] rounded-card" />}>
            <RecentTransactionsSection />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}
