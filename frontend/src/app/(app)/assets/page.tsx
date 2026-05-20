'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, TrendingUp, Filter } from 'lucide-react'
import { assetsApi } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ASSET_TYPE_LABELS, STALE_TIME } from '@/lib/constants'
import type { AssetType } from '@/types/portfolio'

const ASSET_TYPES: AssetType[] = ['EQUITY', 'ETF', 'MUTUAL_FUND', 'BOND', 'CRYPTO', 'PE_VC', 'REAL_ESTATE', 'DERIVATIVE', 'CASH', 'ALTERNATIVE']

export default function AssetsPage() {
  const [search, setSearch] = useState('')
  const [assetType, setAssetType] = useState<AssetType | 'all'>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['assets', { search, assetType, page }],
    queryFn: () =>
      assetsApi
        .list({
          search: search || undefined,
          asset_type: assetType !== 'all' ? assetType : undefined,
          page,
          page_size: 20,
        })
        .then((r) => r.data),
    staleTime: STALE_TIME.MEDIUM,
  })

  const assets = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Registry"
        description="All securities and assets tracked across your portfolios"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" aria-hidden="true" />
          <Input
            placeholder="Search by name or symbol..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
            aria-label="Search assets"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-text-muted" aria-hidden="true" />
          <Select
            value={assetType}
            onValueChange={(v) => {
              setAssetType(v as AssetType | 'all')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ASSET_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ASSET_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assets table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="size-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : assets.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No assets found"
            description={
              search
                ? `No assets match "${search}". Try a different search term.`
                : 'No assets have been added yet.'
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-surface-muted transition-colors duration-150 group cursor-pointer"
                role="row"
              >
                {/* Icon/Avatar */}
                <div className="size-10 rounded-lg bg-surface-muted border border-border flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-text-secondary font-mono">
                    {asset.symbol.slice(0, 3)}
                  </span>
                </div>

                {/* Name + symbol */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate group-hover:text-brand-primary transition-colors">
                    {asset.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-text-muted">{asset.symbol}</span>
                    {asset.exchange && (
                      <span className="text-xs text-text-muted">· {asset.exchange}</span>
                    )}
                  </div>
                </div>

                {/* Type badge */}
                <Badge variant="secondary" className="flex-shrink-0">
                  {ASSET_TYPE_LABELS[asset.asset_type]}
                </Badge>

                {/* Current price */}
                {asset.current_price !== undefined ? (
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium tabular-nums text-text-primary">
                      {formatCurrency(asset.current_price, asset.currency)}
                    </p>
                    {asset.price_updated_at && (
                      <p className="text-xs text-text-muted">
                        {formatDate(asset.price_updated_at, 'MMM d, HH:mm')}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-text-muted flex-shrink-0">No price</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Showing {assets.length} of {data.total} assets
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
