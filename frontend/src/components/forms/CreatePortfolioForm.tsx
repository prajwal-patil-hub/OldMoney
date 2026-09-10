'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePortfolio } from '@/lib/hooks/usePortfolios'
import { CURRENCIES } from '@/lib/constants'
import type { CreatePortfolioInput } from '@/types/portfolio'

interface CreatePortfolioFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreatePortfolioForm({ onSuccess, onCancel }: CreatePortfolioFormProps) {
  const [formData, setFormData] = useState<Partial<CreatePortfolioInput>>({
    name: '',
    description: '',
    base_currency: 'USD',
    inception_date: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CreatePortfolioInput, string>>>({})

  const { mutate: createPortfolio, isPending } = useCreatePortfolio()

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreatePortfolioInput, string>> = {}
    if (!formData.name?.trim()) {
      newErrors.name = 'Portfolio name is required'
    }
    if (!formData.base_currency) {
      newErrors.base_currency = 'Currency is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    createPortfolio(formData as CreatePortfolioInput, {
      onSuccess: () => {
        toast.success('Portfolio created successfully')
        onSuccess?.()
      },
      onError: (error) => {
        const axiosError = error as { response?: { data?: { errors?: Array<{ message: string }> } } }
        toast.error(axiosError?.response?.data?.errors?.[0]?.message ?? 'Failed to create portfolio')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="portfolio-name" className="text-sm font-medium text-text-primary">
          Portfolio Name <span className="text-danger">*</span>
        </label>
        <Input
          id="portfolio-name"
          placeholder="e.g., Family Office Core"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          autoFocus
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="portfolio-desc" className="text-sm font-medium text-text-primary">
          Description
        </label>
        <Textarea
          id="portfolio-desc"
          placeholder="Optional description..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Currency */}
        <div className="space-y-1.5">
          <label htmlFor="portfolio-currency" className="text-sm font-medium text-text-primary">
            Base Currency <span className="text-danger">*</span>
          </label>
          <Select
            value={formData.base_currency}
            onValueChange={(value) => setFormData({ ...formData, base_currency: value })}
          >
            <SelectTrigger id="portfolio-currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.base_currency && (
            <p className="text-xs text-danger">{errors.base_currency}</p>
          )}
        </div>

        {/* Inception Date */}
        <div className="space-y-1.5">
          <label htmlFor="portfolio-inception" className="text-sm font-medium text-text-primary">
            Inception Date
          </label>
          <Input
            id="portfolio-inception"
            type="date"
            value={formData.inception_date}
            onChange={(e) => setFormData({ ...formData, inception_date: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isPending}>
          Create Portfolio
        </Button>
      </div>
    </form>
  )
}
