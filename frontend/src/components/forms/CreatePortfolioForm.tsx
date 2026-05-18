'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePortfolio } from '@/lib/hooks/usePortfolios'
import { CURRENCIES, BENCHMARKS } from '@/lib/constants'
import type { CreatePortfolioInput } from '@/types/portfolio'

interface CreatePortfolioFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreatePortfolioForm({ onSuccess, onCancel }: CreatePortfolioFormProps) {
  const [formData, setFormData] = useState<Partial<CreatePortfolioInput>>({
    name: '',
    description: '',
    currency: 'USD',
    inception_date: '',
    benchmark: '',
    tags: [],
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CreatePortfolioInput, string>>>({})

  const { mutate: createPortfolio, isPending } = useCreatePortfolio()

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreatePortfolioInput, string>> = {}
    if (!formData.name?.trim()) {
      newErrors.name = 'Portfolio name is required'
    }
    if (!formData.currency) {
      newErrors.currency = 'Currency is required'
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
        const axiosError = error as { response?: { data?: { detail?: string } } }
        toast.error(axiosError?.response?.data?.detail ?? 'Failed to create portfolio')
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
        <textarea
          id="portfolio-desc"
          placeholder="Optional description..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="flex w-full rounded-button border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:border-brand-primary transition-all duration-150 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Currency */}
        <div className="space-y-1.5">
          <label htmlFor="portfolio-currency" className="text-sm font-medium text-text-primary">
            Base Currency <span className="text-danger">*</span>
          </label>
          <Select
            value={formData.currency}
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
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
          {errors.currency && (
            <p className="text-xs text-danger">{errors.currency}</p>
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

      {/* Benchmark */}
      <div className="space-y-1.5">
        <label htmlFor="portfolio-benchmark" className="text-sm font-medium text-text-primary">
          Benchmark
        </label>
        <Select
          value={formData.benchmark}
          onValueChange={(value) => setFormData({ ...formData, benchmark: value })}
        >
          <SelectTrigger id="portfolio-benchmark">
            <SelectValue placeholder="Select benchmark (optional)" />
          </SelectTrigger>
          <SelectContent>
            {BENCHMARKS.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
