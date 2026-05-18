'use client'

import * as React from 'react'
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCardProps {
  label: string
  /** Pre-formatted value string: "$1.23M", "42.1%", etc. */
  value: string
  /** Percentage change, e.g. 3.24 means +3.24%. Negative = red. */
  change?: number
  /** Context label next to the delta badge, e.g. "vs last month" */
  changeLabel?: string
  /** Optional icon, rendered top-right at 16px */
  icon?: LucideIcon
  loading?: boolean
  /** Optional sparkline data points — renders a 40px ECharts line if provided */
  trend?: number[]
  valueClassName?: string
  className?: string
}

export function MetricCard({
  label,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  loading = false,
  trend,
  valueClassName,
  className,
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <Card className={cn('p-5 relative', className)}>
      {/* Icon — absolute top-right, 16px, muted */}
      {Icon && !loading && (
        <Icon
          className="absolute right-4 top-4 size-4 text-text-muted"
          aria-hidden="true"
        />
      )}

      {/* Hero value — Fraunces display font for that old-money feel */}
      {loading ? (
        <Skeleton className="h-9 w-36 mb-1" />
      ) : (
        <p
          className={cn(
            'text-3xl font-display tabular-nums tracking-tighter text-text-primary leading-display',
            valueClassName
          )}
        >
          {value}
        </p>
      )}

      {/* Label */}
      {loading ? (
        <Skeleton className="h-3 w-24 mt-1.5" />
      ) : (
        <p className="text-xs text-text-muted mt-1 leading-ui">{label}</p>
      )}

      {/* Delta row */}
      {loading ? (
        <Skeleton className="h-4 w-28 mt-2" />
      ) : change !== undefined ? (
        <div className="flex items-center gap-1.5 mt-2">
          {/* Delta badge — rounded-full, colored bg */}
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
              isPositive && 'bg-positive-subtle text-positive',
              isNegative && 'bg-negative-subtle text-negative',
              !isPositive && !isNegative && 'bg-surface-muted text-text-muted'
            )}
          >
            {isPositive ? (
              <TrendingUp className="size-3 shrink-0" aria-hidden="true" />
            ) : isNegative ? (
              <TrendingDown className="size-3 shrink-0" aria-hidden="true" />
            ) : (
              <Minus className="size-3 shrink-0" aria-hidden="true" />
            )}
            {isPositive ? '+' : ''}{Math.abs(change).toFixed(2)}%
          </span>

          {changeLabel && (
            <span className="text-xs text-text-muted">{changeLabel}</span>
          )}
        </div>
      ) : null}

      {/* Sparkline — only rendered when trend data provided */}
      {trend && trend.length > 1 && !loading && (
        <SparkLine data={trend} positive={isPositive} negative={isNegative} />
      )}
    </Card>
  )
}

// ── Inline sparkline (no ECharts dependency in this file — lazy-load it) ──
// Renders a simple SVG polyline so the component stays lightweight.
// For interactive charts, swap this with a lazy-loaded ECharts wrapper.
interface SparkLineProps {
  data: number[]
  positive?: boolean
  negative?: boolean
}

function SparkLine({ data, positive, negative }: SparkLineProps) {
  const width = 120
  const height = 40
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  const color = positive
    ? 'var(--positive)'
    : negative
      ? 'var(--negative)'
      : 'var(--text-muted)'

  return (
    <div className="mt-3 -mx-1" aria-hidden="true">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
      >
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
    </div>
  )
}
