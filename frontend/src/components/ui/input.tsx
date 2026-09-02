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
            // Layout + sizing — a touch taller for tactile comfort
            'flex h-9 w-full',
            // Palette — inset well (nm-inset shadow applied globally to bg-surface-inset)
            'bg-surface-inset text-text-primary font-sans text-sm',
            // Border — hairline lip on the well
            'border border-border-subtle rounded-[var(--radius-md)]',
            // Spacing
            'px-3',
            // Placeholder
            'placeholder:text-text-placeholder',
            // Focus — accent ring via OUTLINE (independent of the well's box-shadow)
            'focus:outline focus:outline-2 focus:outline-offset-1 focus:[outline-color:var(--accent)] focus:border-[var(--accent)]',
            // Transition — border + outline only, no layout jank
            'transition-[border-color,outline-color] duration-[120ms]',
            // File input cosmetics
            'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary',
            // Disabled
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Error state — warm danger lip + ring
            hasError && 'border-danger focus:[outline-color:var(--danger)] focus:border-danger',
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
