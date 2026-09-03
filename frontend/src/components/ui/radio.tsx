'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Tactile radio: an inset well (unselected) that becomes a raised terracotta
 * disc with a light center dot (selected). Native <input type="radio">.
 * Group them by passing the same `name`.
 */
export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, ...props }, ref) => (
    <span className="relative inline-flex h-[18px] w-[18px] shrink-0 align-middle">
      <input
        type="radio"
        ref={ref}
        className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none flex h-full w-full items-center justify-center rounded-full',
          'bg-[var(--surface-inset)] shadow-[var(--nm-inset)]',
          'transition-all duration-[120ms]',
          'peer-checked:bg-[var(--accent)] peer-checked:shadow-[var(--nm-raised-sm)]',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:[outline-color:var(--accent)]',
          'peer-disabled:opacity-50',
          // center dot appears only when checked
          'peer-checked:[&>.dot]:opacity-100',
          className
        )}
      >
        <span className="dot h-1.5 w-1.5 rounded-full bg-[var(--text-inverse)] opacity-0 transition-opacity duration-[120ms]" />
      </span>
    </span>
  )
)
Radio.displayName = 'Radio'

/** Optional layout wrapper — semantic radiogroup role. */
const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} role="radiogroup" className={cn('flex flex-col gap-2', className)} {...props} />
))
RadioGroup.displayName = 'RadioGroup'

export { Radio, RadioGroup }
