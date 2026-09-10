'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  'BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'DEPOSIT', 'WITHDRAWAL',
  'TRANSFER_IN', 'TRANSFER_OUT', 'FEE', 'TAX',
]

export function CreateTransactionForm({ portfolioId, onSuccess, onCancel }: CreateTransactionFormProps) {
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState<Partial<CreateTransactionInput>>({
    portfolio_id: portfolioId ?? '',
    transaction_type: 'BUY',
    trade_date: today,
    quantity: undefined,
    price: undefined,
    fees: 0,
    currency: 'USD',
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
    const needsQty = ['BUY', 'SELL', 'SPLIT', 'MERGER'].includes(formData.transaction_type ?? '')
    if (needsQty && (!formData.quantity || formData.quantity <= 0)) {
      newErrors.quantity = 'Quantity must be greater than 0'
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
        const axiosError = error as { response?: { data?: { errors?: Array<{ message: string }> } } }
        toast.error(axiosError?.response?.data?.errors?.[0]?.message ?? 'Failed to add transaction')
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
            value={formData.quantity ?? ''}
            onChange={(e) => updateField('quantity', parseFloat(e.target.value) || undefined)}
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
            value={formData.price ?? ''}
            onChange={(e) => updateField('price', parseFloat(e.target.value) || undefined)}
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

      {/* Fees */}
      <div className="space-y-1.5">
        <label htmlFor="txn-fees" className="text-sm font-medium text-text-primary">
          Fees (commission + taxes)
        </label>
        <Input
          id="txn-fees"
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
          value={formData.fees ?? ''}
          onChange={(e) => updateField('fees', parseFloat(e.target.value) || 0)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="txn-notes" className="text-sm font-medium text-text-primary">
          Notes
        </label>
        <Textarea
          id="txn-notes"
          placeholder="Optional notes..."
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
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
