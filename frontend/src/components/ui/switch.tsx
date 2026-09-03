'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

/**
 * Tactile switch: an inset groove track (off) that fills terracotta (on),
 * with a raised knob that slides. Uncontrolled or controlled.
 */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, defaultChecked, onCheckedChange, disabled, ...props }, ref) => {
    const isControlled = checked !== undefined
    const [internal, setInternal] = React.useState(defaultChecked ?? false)
    const on = isControlled ? checked : internal

    const toggle = () => {
      if (disabled) return
      if (!isControlled) setInternal((v) => !v)
      onCheckedChange?.(!on)
    }

    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        ref={ref}
        onClick={toggle}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
          'transition-colors duration-150',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--accent)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Track: raised-inset groove when off (manual shadow, not the global
          // rule, so the ON state can override it), accent fill when on.
          on
            ? 'bg-[var(--accent)] shadow-[var(--nm-pressed)]'
            : 'bg-[var(--surface-inset)] shadow-[var(--nm-inset)]',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-[18px] w-[18px] rounded-full bg-[var(--surface-elevated)] shadow-[var(--nm-raised-sm)]',
            'transition-transform duration-150 will-change-transform',
            on ? 'translate-x-[22px]' : 'translate-x-[3px]'
          )}
        />
      </button>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
