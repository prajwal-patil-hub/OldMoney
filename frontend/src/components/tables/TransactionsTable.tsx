'use client'

import { useState, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, AlignJustify, List, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants'
import type { Transaction, TransactionType } from '@/types/transaction'

export interface TransactionsTableProps {
  transactions: Transaction[]
  loading?: boolean
  compact?: boolean
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
}

// Credit types flow money IN, debit types flow money OUT
const CREDIT_TYPES = new Set<TransactionType>([
  'buy',
  'deposit',
  'dividend',
  'interest',
  'transfer_in',
])

function getTransactionBadgeVariant(
  type: TransactionType
): 'success' | 'danger' | 'info' | 'warning' | 'secondary' | 'default' {
  switch (type) {
    case 'buy':
    case 'deposit':
    case 'transfer_in':
      return 'success'
    case 'sell':
    case 'withdrawal':
    case 'transfer_out':
      return 'danger'
    case 'dividend':
    case 'interest':
    case 'split':
    case 'merger':
      return 'info'
    case 'fee':
    case 'tax':
      return 'warning'
    default:
      return 'secondary'
  }
}

const SKELETON_ROWS = 8

export function TransactionsTable({
  transactions,
  loading = false,
  compact: compactProp,
  onEdit,
  onDelete,
  pagination,
}: TransactionsTableProps) {
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    compactProp ? 'compact' : 'comfortable'
  )
  const [sorting, setSorting] = useState<SortingState>([])

  const rowHeight = density === 'compact' ? 'h-7' : 'h-10'
  const hasActions = Boolean(onEdit || onDelete)

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: 'trade_date',
        header: 'Date',
        size: 110,
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-sm font-mono text-text-secondary tabular-nums">
            {formatDate(row.original.trade_date, 'MMM d, yyyy')}
          </span>
        ),
      },
      {
        id: 'asset',
        accessorKey: 'asset_symbol',
        header: 'Asset',
        size: 180,
        enableSorting: true,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-mono font-medium text-sm text-text-primary truncate leading-tight">
              {row.original.asset_symbol ?? row.original.asset_name ?? '—'}
            </p>
            {row.original.asset_name && row.original.asset_symbol && (
              <p className="text-xs text-text-muted truncate leading-tight">
                {row.original.asset_name}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'transaction_type',
        header: 'Type',
        size: 110,
        enableSorting: true,
        cell: ({ row }) => {
          const type = row.original.transaction_type
          return (
            <Badge variant={getTransactionBadgeVariant(type) as 'success' | 'danger' | 'info' | 'warning' | 'secondary'}>
              {TRANSACTION_TYPE_LABELS[type]}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        size: 100,
        enableSorting: true,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-sm text-text-secondary block text-right">
            {row.original.quantity > 0
              ? row.original.quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Price',
        size: 100,
        enableSorting: true,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-sm text-text-secondary block text-right">
            {row.original.price > 0
              ? formatCurrency(row.original.price, row.original.currency)
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'net_amount',
        header: 'Net Amount',
        size: 130,
        enableSorting: true,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const isCredit = CREDIT_TYPES.has(row.original.transaction_type)
          const amount = Math.abs(row.original.net_amount)
          return (
            <span
              className={cn(
                'font-mono tabular-nums text-sm font-medium block text-right',
                isCredit ? 'text-positive' : 'text-negative'
              )}
            >
              {isCredit ? '+' : '-'}
              {formatCurrency(amount, row.original.currency)}
            </span>
          )
        },
      },
      {
        accessorKey: 'account',
        header: 'Account',
        size: 140,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-text-muted truncate block">
            {row.original.account ?? row.original.portfolio_name ?? '—'}
          </span>
        ),
      },
      ...(hasActions
        ? [
            {
              id: 'actions',
              header: '',
              size: 72,
              enableSorting: false,
              cell: ({ row }: { row: { original: Transaction } }) => (
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms]">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(row.original)
                      }}
                      aria-label="Edit transaction"
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(row.original)
                      }}
                      aria-label="Delete transaction"
                      className="text-negative hover:text-negative hover:bg-negative-subtle"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ),
            } satisfies ColumnDef<Transaction>,
          ]
        : []),
    ],
    [hasActions, onEdit, onDelete]
  )

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    manualPagination: !!pagination,
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
                  const isNumeric = [3, 4, 5].includes(colIdx)
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                      className={cn(
                        'h-9 px-3 text-xs font-medium uppercase tracking-wide text-text-muted border-b border-border whitespace-nowrap',
                        isNumeric ? 'text-right' : 'text-left',
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
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center gap-1',
                            isNumeric ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
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
                      )}
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
                  {columns.map((_, colIdx) => (
                    <td key={colIdx} className="px-3">
                      <Skeleton
                        className={cn(
                          'h-3.5 rounded',
                          colIdx === 0
                            ? 'w-20'
                            : colIdx === 1
                            ? 'w-28'
                            : colIdx === 2
                            ? 'w-14'
                            : 'w-20'
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
                    title="No transactions"
                    description="No transactions found. Import your data or add transactions manually."
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
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3">
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
