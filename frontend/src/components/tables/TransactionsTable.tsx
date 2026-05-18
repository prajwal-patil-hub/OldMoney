'use client'

import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants'
import type { Transaction, TransactionType } from '@/types/transaction'

interface TransactionsTableProps {
  transactions: Transaction[]
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  onRowClick?: (transaction: Transaction) => void
}

function getTransactionBadgeVariant(type: TransactionType): 'success' | 'danger' | 'info' | 'warning' | 'secondary' {
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

export function TransactionsTable({
  transactions,
  loading = false,
  pagination,
  onRowClick,
}: TransactionsTableProps) {
  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: 'trade_date',
        header: 'Date',
        size: 110,
        cell: ({ row }) => (
          <span className="text-sm text-text-secondary tabular-nums">
            {formatDate(row.original.trade_date)}
          </span>
        ),
      },
      {
        accessorKey: 'asset_name',
        header: 'Asset',
        size: 180,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate">
              {row.original.asset_name ?? '—'}
            </p>
            {row.original.asset_symbol && (
              <p className="text-xs text-text-muted font-mono">{row.original.asset_symbol}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'transaction_type',
        header: 'Type',
        size: 110,
        cell: ({ row }) => {
          const type = row.original.transaction_type
          return (
            <Badge variant={getTransactionBadgeVariant(type)}>
              {TRANSACTION_TYPE_LABELS[type]}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        size: 100,
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">
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
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">
            {row.original.price > 0 ? formatCurrency(row.original.price, row.original.currency) : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'net_amount',
        header: 'Net Amount',
        size: 120,
        cell: ({ row }) => {
          const amount = row.original.net_amount
          const isNegative = ['sell', 'withdrawal', 'transfer_out', 'fee', 'tax'].includes(
            row.original.transaction_type
          )
          return (
            <span
              className={cn(
                'tabular-nums font-medium',
                isNegative ? 'text-danger' : 'text-success'
              )}
            >
              {isNegative ? '-' : '+'}{formatCurrency(Math.abs(amount), row.original.currency)}
            </span>
          )
        },
      },
      {
        accessorKey: 'account',
        header: 'Account',
        size: 140,
        cell: ({ row }) => (
          <span className="text-sm text-text-muted truncate">
            {row.original.account ?? '—'}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={transactions}
      loading={loading}
      pagination={pagination}
      onRowClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
      emptyTitle="No transactions"
      emptyDescription="No transactions found. Import your data or add transactions manually."
    />
  )
}
