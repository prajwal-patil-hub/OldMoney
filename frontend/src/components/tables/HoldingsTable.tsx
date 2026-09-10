'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, AlignJustify, List } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatPct, formatNumber, cn } from '@/lib/utils'
import { ASSET_TYPE_LABELS } from '@/lib/constants'
import type { AssetType } from '@/types/portfolio'

export interface Holding {
  id: string
  asset_name: string
  asset_symbol: string
  asset_type: AssetType
  quantity: number
  cost_basis: number
  current_value: number
  unrealized_gain: number
  unrealized_gain_pct: number
  weight?: number
}

export interface HoldingsTableProps {
  holdings: Holding[]
  loading?: boolean
  compact?: boolean
}

const assetTypeBadgeVariant: Record<
  AssetType,
  'default' | 'success' | 'info' | 'warning' | 'secondary' | 'gold'
> = {
  EQUITY: 'default',
  ETF: 'info',
  MUTUAL_FUND: 'info',
  BOND: 'warning',
  CRYPTO: 'secondary',
  PE_VC: 'gold',
  REAL_ESTATE: 'warning',
  DERIVATIVE: 'secondary',
  CASH: 'success',
  ALTERNATIVE: 'secondary',
}

function GainColor({
  value,
  children,
}: {
  value: number
  children: React.ReactNode | string
}) {
  return (
    <span
      className={cn(
        'font-mono tabular-nums text-sm',
        value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : 'text-text-muted'
      )}
    >
      {children}
    </span>
  )
}

function WeightBar({ weight }: { weight: number }) {
  const pct = Math.min(Math.max(weight * 100, 0), 100)
  return (
    <div className="flex items-center gap-2 justify-end">
      <Progress
        value={pct}
        size="sm"
        label={`Portfolio weight: ${pct.toFixed(1)}%`}
        className="w-16 flex-shrink-0"
      />
      <span className="font-mono tabular-nums text-xs text-text-muted w-10 text-right">
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

const SKELETON_ROWS = 8

export function HoldingsTable({
  holdings,
  loading = false,
  compact: compactProp,
}: HoldingsTableProps) {
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    compactProp ? 'compact' : 'comfortable'
  )
  const [sorting, setSorting] = useState<SortingState>([])

  const rowHeight = density === 'compact' ? 'h-7' : 'h-10'

  const columns = useMemo<ColumnDef<Holding>[]>(
    () => [
      {
        id: 'asset',
        accessorKey: 'asset_symbol',
        header: 'Asset',
        size: 180,
        minSize: 180,
        enableSorting: true,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-mono font-medium text-sm text-text-primary truncate leading-tight">
              {row.original.asset_symbol}
            </p>
            <p className="text-xs text-text-muted truncate leading-tight">
              {row.original.asset_name}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'asset_type',
        header: 'Type',
        size: 110,
        enableSorting: true,
        cell: ({ row }) => (
          <Badge variant={(assetTypeBadgeVariant[row.original.asset_type] ?? 'secondary') as 'secondary'}>
            {ASSET_TYPE_LABELS[row.original.asset_type] ?? row.original.asset_type}
          </Badge>
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        size: 100,
        enableSorting: true,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-sm text-text-primary block text-right">
            {formatNumber(row.original.quantity, row.original.quantity % 1 === 0 ? 0 : 4)}
          </span>
        ),
      },
      {
        accessorKey: 'cost_basis',
        header: 'Cost Basis',
        size: 120,
        enableSorting: true,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-sm text-text-secondary block text-right">
            {formatCurrency(row.original.cost_basis)}
          </span>
        ),
      },
      {
        accessorKey: 'current_value',
        header: 'Current Value',
        size: 130,
        enableSorting: true,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-sm font-medium text-text-primary block text-right">
            {formatCurrency(row.original.current_value)}
          </span>
        ),
      },
      {
        accessorKey: 'unrealized_gain',
        header: 'Unrealized G/L',
        size: 130,
        enableSorting: true,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const gain = row.original.unrealized_gain
          return (
            <div className="text-right">
              <GainColor value={gain}>
                {gain > 0 ? '+' : ''}
                {formatCurrency(gain)}
              </GainColor>
            </div>
          )
        },
      },
      {
        accessorKey: 'unrealized_gain_pct',
        header: 'G/L %',
        size: 90,
        enableSorting: true,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const pct = row.original.unrealized_gain_pct
          const triangle = pct > 0 ? '▲' : pct < 0 ? '▼' : ''
          return (
            <div className="text-right">
              <GainColor value={pct}>
                {triangle ? `${triangle} ` : ''}
                {formatPct(pct / 100)}
              </GainColor>
            </div>
          )
        },
      },
      {
        accessorKey: 'weight',
        header: 'Weight',
        size: 130,
        enableSorting: true,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const w = row.original.weight ?? 0
          return <WeightBar weight={w} />
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: holdings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col">
      {/* Density toolbar */}
      <div className="flex items-center justify-end gap-1 px-3 py-1.5 border-b border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDensity('comfortable')}
          aria-label="Comfortable density"
          aria-pressed={density === 'comfortable'}
          className={cn(density === 'comfortable' && 'bg-surface-muted text-text-primary')}
        >
          <AlignJustify aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDensity('compact')}
          aria-label="Compact density"
          aria-pressed={density === 'compact'}
          className={cn(density === 'compact' && 'bg-surface-muted text-text-primary')}
        >
          <List aria-hidden="true" />
        </Button>
      </div>

      {/* Table scroll container */}
      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm">
          {/* Sticky header */}
          <thead className="sticky top-0 z-10 bg-surface-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, colIdx) => {
                  const isNumeric = colIdx >= 2
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={cn(
                        'h-9 px-3 text-xs font-medium uppercase tracking-wide text-text-muted border-b border-border',
                        isNumeric ? 'text-right' : 'text-left',
                        colIdx === 0 &&
                          'sticky left-0 z-20 bg-surface-muted',
                        header.column.getCanSort() &&
                          'cursor-pointer select-none hover:text-text-primary transition-colors duration-[120ms]'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                          ? 'descending'
                          : 'none'
                      }
                    >
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          isNumeric ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-text-muted flex-shrink-0">
                            {sorted === 'asc' ? (
                              <ChevronUp className="size-3.5" aria-hidden="true" />
                            ) : sorted === 'desc' ? (
                              <ChevronDown className="size-3.5" aria-hidden="true" />
                            ) : (
                              <ChevronsUpDown className="size-3.5 opacity-40" aria-hidden="true" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
                <tr key={rowIdx} className={rowHeight}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-3">
                      <Skeleton
                        className={cn(
                          'h-3.5 rounded',
                          colIdx === 0 ? 'w-28' : colIdx === 1 ? 'w-16' : 'w-20'
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title="No holdings"
                    description="No holdings found. Add transactions to see your holdings here."
                    className="py-10"
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  data-density={density}
                  className={cn(
                    rowHeight,
                    'group transition-colors duration-[120ms]',
                    'hover:bg-brand-primary/[0.04]'
                  )}
                >
                  {row.getVisibleCells().map((cell, colIdx) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-3',
                        colIdx === 0 &&
                          'sticky left-0 z-10 bg-surface group-hover:bg-brand-primary/[0.04] transition-colors duration-[120ms]'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
