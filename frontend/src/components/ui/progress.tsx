import * as React from 'react'
import { cn } from '@/lib/utils'

const trackHeights = {
  sm: 'h-1.5',
  default: 'h-2',
  lg: 'h-3',
} as const

const fillColors = {
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
} as const

export interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 0–100. Omit (or pass undefined) for an indeterminate sweep. */
  value?: number
  size?: keyof typeof trackHeights
  tone?: keyof typeof fillColors
  /** Accessible name for the bar — falls back to "Progress". */
  label?: string
}

/**
 * Linear progress — an inset groove in the paper with a raised accent fill.
 * The track uses bg-surface-inset so it picks up --nm-inset from globals;
 * the fill uses an arbitrary background so it does NOT match that rule and
 * sits cleanly on top of the groove.
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, size = 'default', tone = 'accent', label, ...props }, ref) => {
    const indeterminate = value === undefined || value === null || Number.isNaN(value)
    const pct = indeterminate ? 0 : Math.min(Math.max(value, 0), 100)

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : Math.round(pct)}
        className={cn(
          'w-full overflow-hidden rounded-full bg-surface-inset',
          trackHeights[size],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full',
            indeterminate
              ? 'w-2/5 nm-progress-indeterminate'
              : 'transition-[width] duration-[240ms] ease-standard'
          )}
          style={{
            background: fillColors[tone],
            ...(indeterminate ? {} : { width: `${pct}%` }),
          }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
