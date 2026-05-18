'use client'

import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPct, formatNumber, cn } from '@/lib/utils'
import { ASSET_TYPE_LABELS } from '@/lib/constants'
import type { Holding, AssetType } from '@/types/portfolio'

interface HoldingsTableProps {
  holdings: Holding[]
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  onRowClick?: (holding: Holding) => void
}

const assetTypeBadgeVariant: Record<AssetType, 'default' | 'success' | 'info' | 'warning' | 'secondary' | 'gold'> = {
  equity: 'default',
  fixed_income: 'info',
  real_estate: 'warning',
  private_equity: 'gold',
  hedge_fund: 'secondary',
  cash: 'success',
  crypto: 'secondary',
  commodity: 'warning',
  alternative: 'secondary',
}

export function HoldingsTable({ holdings, loading = false, pagination, onRowClick }: HoldingsTableProps) {
  const columns = useMemo<ColumnDef<Holding>[]>(
    () => [
      {
        accessorKey: 'asset_name',
        header: 'Asset',
        size: 200,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate">{row.original.asset_name}</p>
            <p className="text-xs text-text-muted font-mono">{row.original.asset_symbol}</p>
          </div>
        ),
      },
      {
        accessorKey: 'asset_type',
        header: 'Type',
        size: 120,
        cell: ({ row }) => (
          <Badge variant={assetTypeBadgeVariant[row.original.asset_type] ?? 'secondary'}>
            {ASSET_TYPE_LABELS[row.original.asset_type] ?? row.original.asset_type}
          </Badge>
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        size: 100,
        cell: ({ row }) => (
          <span className="tabular-nums text-text-primary">
            {formatNumber(row.original.quantity, row.original.quantity % 1 === 0 ? 0 : 4)}
          </span>
        ),
      },
      {
        accessorKey: 'cost_basis',
        header: 'Cost Basis',
        size: 120,
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">
            {formatCurrency(row.original.cost_basis)}
          </span>
        ),
      },
      {
        accessorKey: 'current_value',
        header: 'Current Value',
        size: 130,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-text-primary">
            {formatCurrency(row.original.current_value)}
          </span>
        ),
      },
      {
        accessorKey: 'unrealized_gain',
        header: 'Unrealized G/L',
        size: 130,
        cell: ({ row }) => {
          const gain = row.original.unrealized_gain
          return (
            <span
              className={cn(
                'tabular-nums font-medium',
                gain > 0 ? 'text-success' : gain < 0 ? 'text-danger' : 'text-text-muted'
              )}
            >
              {gain > 0 ? '+' : ''}{formatCurrency(gain)}
            </span>
          )
        },
      },
      {
        accessorKey: 'unrealized_gain_pct',
        header: 'G/L %',
        size: 80,
        cell: ({ row }) => {
          const pct = row.original.unrealized_gain_pct
          return (
            <span
              className={cn(
                'tabular-nums font-medium',
                pct > 0 ? 'text-success' : pct < 0 ? 'text-danger' : 'text-text-muted'
              )}
            >
              {formatPct(pct)}
            </span>
          )
        },
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={holdings}
      loading={loading}
      pagination={pagination}
      onRowClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
      emptyTitle="No holdings"
      emptyDescription="No holdings found. Add transactions to see your holdings here."
    />
  )
}
