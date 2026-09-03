'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: string[]
  /** 0-indexed current step */
  current: number
  onStepClick?: (index: number) => void
}

/**
 * Tactile stepper. Nodes sit on the paper:
 *  - completed → raised terracotta disc with a check
 *  - current   → raised disc ringed in terracotta
 *  - future    → inset well with a muted number
 * The connector fills terracotta up to the current step.
 */
const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ className, steps, current, onStepClick, ...props }, ref) => (
    <ol ref={ref} className={cn('flex w-full items-start', className)} {...props}>
      {steps.map((label, i) => {
        const state = i < current ? 'complete' : i === current ? 'current' : 'future'
        const clickable = Boolean(onStepClick) && i <= current
        const isLast = i === steps.length - 1
        return (
          <li key={label} className={cn('flex flex-col items-center', !isLast && 'flex-1')}>
            <div className="flex w-full items-center">
              {/* Node */}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(i)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  'transition-all duration-[140ms]',
                  clickable && 'cursor-pointer',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--accent)]',
                  state === 'complete' &&
                    'bg-[var(--accent)] text-[var(--text-inverse)] shadow-[var(--nm-raised-sm)]',
                  state === 'current' &&
                    'bg-[var(--surface-elevated)] text-[var(--accent)] shadow-[var(--nm-raised-sm)] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]',
                  state === 'future' &&
                    'bg-[var(--surface-inset)] text-text-muted shadow-[var(--nm-inset)]'
                )}
              >
                {state === 'complete' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </button>
              {/* Connector */}
              {!isLast && (
                <span
                  className="mx-2 h-[3px] flex-1 rounded-full"
                  style={{
                    background: i < current ? 'var(--accent)' : 'var(--surface-inset)',
                    boxShadow: i < current ? 'none' : 'var(--nm-inset)',
                  }}
                />
              )}
            </div>
            {/* Label */}
            <span
              className={cn(
                'mt-2 max-w-[8rem] text-center text-xs',
                state === 'future' ? 'text-text-muted' : 'text-text-primary',
                state === 'current' && 'font-semibold'
              )}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
)
Stepper.displayName = 'Stepper'

export { Stepper }
