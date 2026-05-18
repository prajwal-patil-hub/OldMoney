'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateTransaction } from '@/lib/hooks/useTransactions'
import { usePortfolios } from '@/lib/hooks/usePortfolios'
import { CURRENCIES, TRANSACTION_TYPE_LABELS } from '@/lib/constants'
import type { CreateTransactionInput, TransactionType } from '@/types/transaction'

interface CreateTransactionFormProps {
  portfolioId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const TRANSACTION_TYPES: TransactionType[] = [
  'buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal',
  'transfer_in', 'transfer_out', 'fee', 'tax'
]

export function CreateTransactionForm({ portfolioId, onSuccess, onCancel }: CreateTransactionFormProps) {
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState<Partial<CreateTransactionInput>>({
    portfolio_id: portfolioId ?? '',
    transaction_type: 'buy',
    trade_date: today,
    quantity: 0,
    price: 0,
    commission: 0,
    tax: 0,
    currency: 'USD',
    account: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { mutate: createTransaction, isPending } = useCreateTransaction()
  const { data: portfoliosData } = usePortfolios()
  const portfolios = portfoliosData?.items ?? []

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.portfolio_id) newErrors.portfolio_id = 'Portfolio is required'
    if (!formData.trade_date) newErrors.trade_date = 'Trade date is required'
    if (!formData.transaction_type) newErrors.transaction_type = 'Transaction type is required'
    if (formData.quantity === undefined || formData.quantity <= 0) {
      const needsQty = ['buy', 'sell', 'split', 'merger'].includes(formData.transaction_type ?? '')
      if (needsQty) newErrors.quantity = 'Quantity must be greater than 0'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    createTransaction(formData as CreateTransactionInput, {
      onSuccess: () => {
        toast.success('Transaction added successfully')
        onSuccess?.()
      },
      onError: (error) => {
        const axiosError = error as { response?: { data?: { detail?: string } } }
        toast.error(axiosError?.response?.data?.detail ?? 'Failed to add transaction')
      },
    })
  }

  const updateField = <K extends keyof CreateTransactionInput>(
    key: K,
    value: CreateTransactionInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Portfolio */}
      {!portfolioId && (
        <div className="space-y-1.5">
          <label htmlFor="txn-portfolio" className="text-sm font-medium text-text-primary">
            Portfolio <span className="text-danger">*</span>
          </label>
          <Select
            value={formData.portfolio_id}
            onValueChange={(v) => updateField('portfolio_id', v)}
          >
            <SelectTrigger id="txn-portfolio">
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
          {errors.portfolio_id && <p className="text-xs text-danger">{errors.portfolio_id}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Transaction Type */}
        <div className="space-y-1.5">
          <label htmlFor="txn-type" className="text-sm font-medium text-text-primary">
            Type <span className="text-danger">*</span>
          </label>
          <Select
            value={formData.transaction_type}
            onValueChange={(v) => updateField('transaction_type', v as TransactionType)}
          >
            <SelectTrigger id="txn-type">
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

        {/* Trade Date */}
        <div className="space-y-1.5">
          <label htmlFor="txn-date" className="text-sm font-medium text-text-primary">
            Trade Date <span className="text-danger">*</span>
          </label>
          <Input
            id="txn-date"
            type="date"
            value={formData.trade_date}
            onChange={(e) => updateField('trade_date', e.target.value)}
            error={errors.trade_date}
            max={today}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Quantity */}
        <div className="space-y-1.5">
          <label htmlFor="txn-qty" className="text-sm font-medium text-text-primary">
            Quantity
          </label>
          <Input
            id="txn-qty"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={formData.quantity || ''}
            onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
            error={errors.quantity}
          />
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <label htmlFor="txn-price" className="text-sm font-medium text-text-primary">
            Price
          </label>
          <Input
            id="txn-price"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={formData.price || ''}
            onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Currency */}
        <div className="space-y-1.5">
          <label htmlFor="txn-currency" className="text-sm font-medium text-text-primary">
            Currency
          </label>
          <Select
            value={formData.currency}
            onValueChange={(v) => updateField('currency', v)}
          >
            <SelectTrigger id="txn-currency">
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

      <div className="grid grid-cols-2 gap-4">
        {/* Commission */}
        <div className="space-y-1.5">
          <label htmlFor="txn-commission" className="text-sm font-medium text-text-primary">
            Commission
          </label>
          <Input
            id="txn-commission"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={formData.commission || ''}
            onChange={(e) => updateField('commission', parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Tax */}
        <div className="space-y-1.5">
          <label htmlFor="txn-tax" className="text-sm font-medium text-text-primary">
            Tax
          </label>
          <Input
            id="txn-tax"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={formData.tax || ''}
            onChange={(e) => updateField('tax', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Account */}
      <div className="space-y-1.5">
        <label htmlFor="txn-account" className="text-sm font-medium text-text-primary">
          Account
        </label>
        <Input
          id="txn-account"
          placeholder="e.g., Brokerage Account 1"
          value={formData.account}
          onChange={(e) => updateField('account', e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="txn-notes" className="text-sm font-medium text-text-primary">
          Notes
        </label>
        <textarea
          id="txn-notes"
          placeholder="Optional notes..."
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
          className="flex w-full rounded-button border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:border-brand-primary transition-all duration-150 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isPending}>
          Add Transaction
        </Button>
      </div>
    </form>
  )
}
