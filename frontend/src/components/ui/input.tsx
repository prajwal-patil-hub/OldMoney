import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** When true, applies danger border + ring — set by form validation */
  error?: boolean | string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    const hasError = Boolean(error)

    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            // Layout + sizing
            'flex h-[34px] w-full',
            // Palette
            'bg-surface-inset text-text-primary font-sans text-sm',
            // Border — 1px hairline
            'border border-border rounded',
            // Spacing
            'px-2.5',
            // Placeholder
            'placeholder:text-text-placeholder',
            // Focus — swap border to border-strong + soft brand ring
            'focus:outline-none focus:border-border-strong focus:ring-3 focus:ring-brand-primary/15',
            // Transition — only border and shadow to avoid layout jank
            'transition-[border-color,box-shadow] duration-[120ms]',
            // File input cosmetics
            'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary',
            // Disabled
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Error state overrides border + ring
            hasError && 'border-danger focus:border-danger focus:ring-danger/20',
            className
          )}
          ref={ref}
          aria-invalid={hasError || undefined}
          {...props}
        />
        {/* Only render error string if one was provided */}
        {typeof error === 'string' && error && (
          <p className="mt-1 text-xs text-danger-text" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
