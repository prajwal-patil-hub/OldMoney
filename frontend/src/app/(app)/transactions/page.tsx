'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { Plus, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useTransactions, useCreateTransaction } from '@/lib/hooks/useTransactions'
import { usePortfolios } from '@/lib/hooks/usePortfolios'
import { PageHeader } from '@/components/shared/PageHeader'
import { TransactionsTable } from '@/components/tables/TransactionsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import { TRANSACTION_TYPE_LABELS, CURRENCIES } from '@/lib/constants'
import type { TransactionType, CreateTransactionInput } from '@/types/transaction'

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

const TRANSACTION_TYPES: TransactionType[] = [
  'BUY',
  'SELL',
  'DIVIDEND',
  'DEPOSIT',
  'WITHDRAWAL',
  'INTEREST',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'FEE',
  'TAX',
]

// ─── Filter pill ───────────────────────────────────────────────────────────────

function TypePill({
  type,
  active,
  onClick,
}: {
  type: TransactionType
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 px-3 rounded text-xs font-medium transition-colors duration-[120ms] whitespace-nowrap',
        active
          ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
          : 'text-text-muted border border-border hover:text-text-primary hover:bg-surface-muted'
      )}
      aria-pressed={active}
    >
      {TRANSACTION_TYPE_LABELS[type]}
    </button>
  )
}

// ─── Add Transaction Dialog Form ──────────────────────────────────────────────

interface AddTransactionFormProps {
  onSuccess: () => void
  onCancel: () => void
}

function AddTransactionForm({ onSuccess, onCancel }: AddTransactionFormProps) {
  const today = new Date().toISOString().split('T')[0]!

  const [formData, setFormData] = useState<Partial<CreateTransactionInput>>({
    portfolio_id: '',
    transaction_type: 'BUY',
    trade_date: today,
    quantity: 0,
    price: 0,
    fees: 0,
    currency: 'USD',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { mutate: createTransaction, isPending } = useCreateTransaction()
  const { data: portfoliosData } = usePortfolios()
  const portfolios = portfoliosData?.items ?? []

  const updateField = useCallback(
    <K extends keyof CreateTransactionInput>(key: K, value: CreateTransactionInput[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    },
    []
  )

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!formData.portfolio_id) errs.portfolio_id = 'Portfolio is required'
    if (!formData.trade_date) errs.trade_date = 'Trade date is required'
    if (!formData.transaction_type) errs.transaction_type = 'Type is required'
    const needsQty = ['BUY', 'SELL', 'SPLIT', 'MERGER'].includes(
      formData.transaction_type ?? ''
    )
    if (needsQty && (!formData.quantity || formData.quantity <= 0)) {
      errs.quantity = 'Quantity must be greater than 0'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) return
    createTransaction(formData as CreateTransactionInput, {
      onSuccess: () => {
        toast.success('Transaction added successfully')
        onSuccess()
      },
      onError: (error) => {
        const axiosError = error as { response?: { data?: { errors?: Array<{ message: string }> } } }
        toast.error(axiosError?.response?.data?.errors?.[0]?.message ?? 'Failed to add transaction')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Portfolio */}
      <div className="space-y-1.5">
        <label htmlFor="new-txn-portfolio" className="text-sm font-medium text-text-primary">
          Portfolio <span className="text-negative">*</span>
        </label>
        <Select
          value={formData.portfolio_id}
          onValueChange={(v) => updateField('portfolio_id', v)}
        >
          <SelectTrigger id="new-txn-portfolio" className="h-8 text-sm">
            <SelectValue placeholder="Select portfolio" />
          </SelectTrigger>
          <SelectContent>
            {portfolios.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.portfolio_id && (
          <p className="text-xs text-negative">{errors.portfolio_id}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div className="space-y-1.5">
          <label htmlFor="new-txn-type" className="text-sm font-medium text-text-primary">
            Type <span className="text-negative">*</span>
          </label>
          <Select
            value={formData.transaction_type}
            onValueChange={(v) => updateField('transaction_type', v as TransactionType)}
          >
            <SelectTrigger id="new-txn-type" className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TRANSACTION_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trade date */}
        <div className="space-y-1.5">
          <label htmlFor="new-txn-date" className="text-sm font-medium text-text-primary">
            Trade Date <span className="text-negative">*</span>
          </label>
          <Input
            id="new-txn-date"
            type="date"
            value={formData.trade_date}
            onChange={(e) => updateField('trade_date', e.target.value)}
            className="h-8 text-sm"
            max={today}
            required
          />
          {errors.trade_date && (
            <p className="text-xs text-negative">{errors.trade_date}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Quantity */}
        <div className="space-y-1.5">
          <label htmlFor="new-txn-qty" className="text-sm font-medium text-text-primary">
            Quantity
          </label>
          <Input
            id="new-txn-qty"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={formData.quantity || ''}
            onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
            className="h-8 text-sm font-mono"
          />
          {errors.quantity && (
            <p className="text-xs text-negative">{errors.quantity}</p>
          )}
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <label htmlFor="new-txn-price" className="text-sm font-medium text-text-primary">
            Price
          </label>
          <Input
            id="new-txn-price"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={formData.price || ''}
            onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
            className="h-8 text-sm font-mono"
          />
        </div>

        {/* Currency */}
        <div className="space-y-1.5">
          <label htmlFor="new-txn-currency" className="text-sm font-medium text-text-primary">
            Currency
          </label>
          <Select
            value={formData.currency}
            onValueChange={(v) => updateField('currency', v)}
          >
            <SelectTrigger id="new-txn-currency" className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fees */}
      <div className="space-y-1.5">
        <label htmlFor="new-txn-fees" className="text-sm font-medium text-text-primary">
          Fees / Commission
        </label>
        <Input
          id="new-txn-fees"
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
          value={formData.fees || ''}
          onChange={(e) => updateField('fees', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm font-mono"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="new-txn-notes" className="text-sm font-medium text-text-primary">
          Notes
        </label>
        <textarea
          id="new-txn-notes"
          placeholder="Optional notes..."
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
          className="flex w-full rounded border border-border bg-surface-inset px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:border-brand-primary transition-all duration-150 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={isPending}>
          Add Transaction
        </Button>
      </div>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSizeOption>(25)
  const [portfolioId, setPortfolioId] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<TransactionType>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)

  // For multi-type filtering we send the first active type for now (API may support array)
  const firstType = activeTypes.size === 1 ? [...activeTypes][0] : undefined

  const { data, isLoading } = useTransactions({
    page,
    page_size: pageSize,
    portfolio_id: portfolioId || undefined,
    transaction_type: firstType,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })

  const { data: portfoliosData } = usePortfolios()
  const portfolios = portfoliosData?.items ?? []

  const transactions = data?.items ?? []
  const total = data?.total ?? 0

  const activeFilterCount =
    (portfolioId ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    activeTypes.size

  const toggleType = (type: TransactionType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
    setPage(1)
  }

  const handleExportCsv = () => {
    if (!transactions.length) {
      toast.info('No transactions to export')
      return
    }
    const headers = ['Date', 'Asset', 'Type', 'Quantity', 'Price', 'Net Amount', 'Account']
    const rows = transactions.map((t) =>
      [
        formatDate(t.trade_date, 'yyyy-MM-dd'),
        t.asset_id ?? '',
        TRANSACTION_TYPE_LABELS[t.transaction_type],
        t.quantity,
        t.price,
        t.net_amount,
        t.account_id ?? '',
      ].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="page-transition space-y-5">
      <PageHeader
        title="Transactions"
        asOf={`As of ${today}`}
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            Add Transaction
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="space-y-3">
        {/* Row 1: portfolio + date range + export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Portfolio */}
          <Select
            value={portfolioId || 'all'}
            onValueChange={(v) => {
              setPortfolioId(v === 'all' ? '' : v)
              setPage(1)
            }}
          >
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

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="h-8 w-36 text-xs font-mono"
              aria-label="From date"
              title="From date"
            />
            <span className="text-xs text-text-muted select-none">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="h-8 w-36 text-xs font-mono"
              aria-label="To date"
              title="To date"
            />
          </div>

          {/* Active filter badge */}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-7 px-2 text-xs font-medium">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </Badge>
          )}

          {/* Export — pushed to right */}
          <div className="ml-auto">
            <Button variant="secondary" size="sm" onClick={handleExportCsv}>
              <Download aria-hidden="true" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Row 2: type pills — scrollable */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-xs text-text-muted whitespace-nowrap flex-shrink-0">
            Type:
          </span>
          {TRANSACTION_TYPES.map((t) => (
            <TypePill
              key={t}
              type={t}
              active={activeTypes.has(t)}
              onClick={() => toggleType(t)}
            />
          ))}
          {activeTypes.size > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTypes(new Set())
                setPage(1)
              }}
              className="h-7 px-2 text-xs text-text-muted hover:text-text-primary transition-colors duration-[120ms] whitespace-nowrap flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden shadow-sm">
        <TransactionsTable transactions={transactions} loading={isLoading} />
      </div>

      {/* Pagination bar */}
      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            Showing{' '}
            <span className="font-medium text-text-secondary tabular-nums">
              {start}–{end}
            </span>{' '}
            of{' '}
            <span className="font-medium text-text-secondary tabular-nums">{total}</span>{' '}
            transactions
          </p>

          <div className="flex items-center gap-2">
            {/* Page size selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-muted">Rows:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v) as PageSizeOption)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-7 w-16 text-xs px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prev / Next */}
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="text-xs text-text-muted tabular-nums select-none">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Transaction Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
          </DialogHeader>
          <AddTransactionForm
            onSuccess={() => setCreateOpen(false)}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
