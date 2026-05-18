'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Briefcase, TrendingUp, DollarSign } from 'lucide-react'
import { usePortfolios } from '@/lib/hooks/usePortfolios'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreatePortfolioForm } from '@/components/forms/CreatePortfolioForm'
import { formatCurrency, formatPct, formatDate, cn } from '@/lib/utils'

export default function PortfoliosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === 'true')
  const [page, setPage] = useState(1)

  const { data, isLoading } = usePortfolios({ page, page_size: 12 })
  const portfolios = data?.items ?? []

  const totalAUM = portfolios.reduce((sum, p) => sum + (p.total_value ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolios"
        description="Manage and monitor all your investment portfolios"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New Portfolio
          </Button>
        }
      />

      {/* Summary metrics */}
      {!isLoading && portfolios.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Total AUM"
            value={formatCurrency(totalAUM)}
            icon={DollarSign}
          />
          <MetricCard
            label="Portfolios"
            value={portfolios.length.toString()}
            icon={Briefcase}
          />
          <MetricCard
            label="Best Performer"
            value={formatPct(
              Math.max(...portfolios.map((p) => p.ytd_return_pct ?? 0))
            )}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Portfolio grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No portfolios yet"
          description="Create your first portfolio to start tracking your investments."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Create Portfolio
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {portfolios.map((portfolio) => {
            const isPositive = (portfolio.unrealized_gain ?? 0) >= 0
            return (
              <Card
                key={portfolio.id}
                className="p-6 cursor-pointer hover:shadow-card-hover group transition-all duration-200"
                onClick={() => router.push(`/portfolios/${portfolio.id}`)}
                role="article"
                aria-label={`Portfolio: ${portfolio.name}`}
              >
                <CardHeader className="p-0 mb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate group-hover:text-brand-primary transition-colors">
                        {portfolio.name}
                      </CardTitle>
                      {portfolio.description && (
                        <CardDescription className="text-xs mt-0.5 truncate">
                          {portfolio.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 text-xs">
                      {portfolio.currency}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-0 space-y-3">
                  {/* Current value */}
                  <div>
                    <p className="text-xs text-text-muted mb-0.5">Current Value</p>
                    <p className="text-xl font-semibold tabular-nums text-text-primary">
                      {portfolio.total_value
                        ? formatCurrency(portfolio.total_value, portfolio.currency)
                        : '—'}
                    </p>
                  </div>

                  {/* P&L */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-text-muted">Unrealized G/L</p>
                      <p
                        className={cn(
                          'text-sm font-medium tabular-nums',
                          isPositive ? 'text-success' : 'text-danger'
                        )}
                      >
                        {portfolio.unrealized_gain !== undefined
                          ? `${isPositive ? '+' : ''}${formatCurrency(portfolio.unrealized_gain, portfolio.currency)}`
                          : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">Return</p>
                      <p
                        className={cn(
                          'text-sm font-medium tabular-nums',
                          isPositive ? 'text-success' : 'text-danger'
                        )}
                      >
                        {portfolio.unrealized_gain_pct !== undefined
                          ? formatPct(portfolio.unrealized_gain_pct)
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Tags + inception */}
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <div className="flex flex-wrap gap-1">
                      {portfolio.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {portfolio.inception_date && (
                      <span className="text-xs text-text-muted">
                        Since {formatDate(portfolio.inception_date, 'MMM yyyy')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Portfolio Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Portfolio</DialogTitle>
          </DialogHeader>
          <CreatePortfolioForm
            onSuccess={() => setCreateOpen(false)}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
