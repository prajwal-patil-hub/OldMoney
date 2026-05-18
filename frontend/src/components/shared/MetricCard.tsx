'use client'

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatPct } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCardProps {
  label: string
  value: string
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  loading?: boolean
  className?: string
  valueClassName?: string
}

export function MetricCard({
  label,
  value,
  change,
  changeLabel = 'vs yesterday',
  icon: Icon,
  loading = false,
  className,
  valueClassName,
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <Card
      className={cn(
        'p-6 hover:shadow-card-hover transition-shadow duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
            {label}
          </p>

          {/* Value */}
          {loading ? (
            <Skeleton className="h-8 w-32 mt-1" />
          ) : (
            <p
              className={cn(
                'text-2xl font-semibold tabular-nums tracking-heading text-text-primary',
                valueClassName
              )}
            >
              {value}
            </p>
          )}

          {/* Change indicator */}
          {loading ? (
            <Skeleton className="h-4 w-24 mt-2" />
          ) : change !== undefined ? (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-medium',
                  isPositive && 'text-success',
                  isNegative && 'text-danger',
                  !isPositive && !isNegative && 'text-text-muted'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="size-3.5" />
                ) : isNegative ? (
                  <TrendingDown className="size-3.5" />
                ) : (
                  <Minus className="size-3.5" />
                )}
                {formatPct(Math.abs(change))}
              </span>
              <span className="text-xs text-text-muted">{changeLabel}</span>
            </div>
          ) : null}
        </div>

        {/* Icon */}
        {Icon && (
          <div className="flex-shrink-0 p-2 rounded-lg bg-surface-muted">
            <Icon
              className="size-5 text-brand-gold"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </Card>
  )
}
