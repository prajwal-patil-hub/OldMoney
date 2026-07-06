'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, DollarSign, Percent, Scale } from 'lucide-react'
import { usePortfolio, usePortfolioHoldings, usePortfolioPerformance, usePortfolioAllocation } from '@/lib/hooks/usePortfolios'
import { PageHeader } from '@/components/shared/PageHeader'
import { MetricCard } from '@/components/shared/MetricCard'
import { HoldingsTable } from '@/components/tables/HoldingsTable'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { AllocationChart } from '@/components/charts/AllocationChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'


export default function PortfolioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: portfolio, isLoading: loadingPortfolio } = usePortfolio(id)
  const { data: holdings, isLoading: loadingHoldings } = usePortfolioHoldings(id)
  const { data: performance, isLoading: loadingPerf } = usePortfolioPerformance(id)
  const { data: allocation, isLoading: loadingAllocation } = usePortfolioAllocation(id)

  const [activeTab, setActiveTab] = useState('overview')

  const chartData = (performance ?? []).map((p) => ({ date: p.date, value: p.nav }))
  const isPositive = (portfolio?.unrealized_gain ?? 0) >= 0

  if (loadingPortfolio) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Portfolio not found.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="size-4" /> Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={portfolio.name}
        description={portfolio.description}
        actions={
          <Button variant="ghost" onClick={() => router.push('/portfolios')}>
            <ArrowLeft className="size-4" />
            All Portfolios
          </Button>
        }
      />

      {/* Inception date */}
      {portfolio.inception_date && (
        <div className="flex flex-wrap gap-2 -mt-2">
          <Badge variant="secondary">
            Since {formatDate(portfolio.inception_date, 'MMM yyyy')}
          </Badge>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Current Value"
          value={formatCurrency(portfolio.total_value ?? 0, portfolio.base_currency)}
          icon={DollarSign}
        />
        <MetricCard
          label="Cost Basis"
          value={formatCurrency(portfolio.total_cost ?? 0, portfolio.base_currency)}
          icon={Scale}
        />
        <MetricCard
          label="Unrealized G/L"
          value={`${isPositive ? '+' : ''}${formatCurrency(portfolio.unrealized_gain ?? 0, portfolio.base_currency)}`}
          change={portfolio.unrealized_gain_pct}
          icon={TrendingUp}
          valueClassName={isPositive ? 'text-success' : 'text-danger'}
        />
        <MetricCard
          label="Day Change"
          value={`${(portfolio.day_change ?? 0) >= 0 ? '+' : ''}${formatCurrency(portfolio.day_change ?? 0, portfolio.base_currency)}`}
          change={portfolio.day_change_pct}
          changeLabel="today"
          icon={Percent}
          valueClassName={(portfolio.day_change ?? 0) >= 0 ? 'text-success' : 'text-danger'}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance (90 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceChart
                    data={chartData}
                    loading={loadingPerf}
                    height={250}
                    currency={portfolio.base_currency}
                  />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <AllocationChart
                    data={allocation ?? []}
                    loading={loadingAllocation}
                    height={250}
                    currency={portfolio.base_currency}
                    showLegend={false}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
          <HoldingsTable
            holdings={holdings?.slice(0, 5) ?? []}
            loading={loadingHoldings}
          />
        </TabsContent>

        <TabsContent value="holdings">
          <HoldingsTable
            holdings={holdings ?? []}
            loading={loadingHoldings}
          />
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart
                data={chartData}
                loading={loadingPerf}
                height={400}
                currency={portfolio.base_currency}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
