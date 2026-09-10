'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>

/**
 * Tactile checkbox: an inset well (unchecked) that becomes a raised terracotta
 * chip with a check (checked). Native <input> underneath for full a11y + forms.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <span className="relative inline-flex h-[18px] w-[18px] shrink-0 align-middle">
      <input
        type="checkbox"
        ref={ref}
        className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none flex h-full w-full items-center justify-center rounded-[var(--radius-xs)]',
          'bg-[var(--surface-inset)] text-transparent shadow-[var(--nm-inset)]',
          'transition-all duration-[120ms]',
          'peer-checked:bg-[var(--accent)] peer-checked:text-[var(--text-inverse)] peer-checked:shadow-[var(--nm-raised-sm)]',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:[outline-color:var(--accent)]',
          'peer-disabled:opacity-50',
          className
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </span>
  )
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
