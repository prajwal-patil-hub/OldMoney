'use client'

import { useState } from 'react'
import { Plus, ArrowLeftRight, Filter, X } from 'lucide-react'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { usePortfolios } from '@/lib/hooks/usePortfolios'
import { PageHeader } from '@/components/shared/PageHeader'
import { TransactionsTable } from '@/components/tables/TransactionsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreateTransactionForm } from '@/components/forms/CreateTransactionForm'
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants'
import type { TransactionType } from '@/types/transaction'

const PAGE_SIZE = 25

const TRANSACTION_TYPES: TransactionType[] = [
  'buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal',
  'transfer_in', 'transfer_out', 'fee', 'tax'
]

export default function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [portfolioId, setPortfolioId] = useState<string>('')
  const [txnType, setTxnType] = useState<TransactionType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useTransactions({
    page,
    page_size: PAGE_SIZE,
    portfolio_id: portfolioId || undefined,
    transaction_type: txnType || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })

  const { data: portfoliosData } = usePortfolios()
  const portfolios = portfoliosData?.items ?? []

  const transactions = data?.items ?? []
  const hasActiveFilters = portfolioId || txnType || startDate || endDate

  const clearFilters = () => {
    setPortfolioId('')
    setTxnType('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Complete history of all investment transactions"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add Transaction
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
          <Filter className="size-3.5" aria-hidden="true" />
          Filter:
        </div>

        {/* Portfolio filter */}
        <Select value={portfolioId || 'all'} onValueChange={(v) => { setPortfolioId(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All portfolios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Portfolios</SelectItem>
            {portfolios.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select value={txnType || 'all'} onValueChange={(v) => { setTxnType(v === 'all' ? '' : v as TransactionType); setPage(1) }}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TRANSACTION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <Input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
          className="h-8 w-36 text-xs"
          aria-label="Start date"
          title="From date"
        />
        <span className="text-text-muted text-xs">to</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
          className="h-8 w-36 text-xs"
          aria-label="End date"
          title="To date"
        />

        {/* Active filters + clear */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs gap-1">
              Filtered
            </Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearFilters}
              aria-label="Clear all filters"
            >
              <X className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <TransactionsTable
        transactions={transactions}
        loading={isLoading}
        pagination={
          data
            ? {
                page,
                pageSize: PAGE_SIZE,
                total: data.total,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Add Transaction Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <CreateTransactionForm
            onSuccess={() => setCreateOpen(false)}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
