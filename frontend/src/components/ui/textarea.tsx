import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** When true, applies danger lip + outline — set by form validation */
  error?: boolean | string
  /** Allow the user to drag-resize vertically (default: off, keeps forms stable) */
  resizable?: boolean
}

/**
 * Tactile textarea — the multi-line sibling of Input. An inset well pressed
 * into the paper (nm-inset comes from the global bg-surface-inset rule);
 * focus is an accent OUTLINE, not a ring, so it survives that box-shadow.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, resizable = false, rows = 3, ...props }, ref) => {
    const hasError = Boolean(error)

    return (
      <div className="w-full">
        <textarea
          rows={rows}
          className={cn(
            'flex w-full',
            // Palette — inset well
            'bg-surface-inset text-text-primary font-sans text-sm',
            // Border — hairline lip on the well
            'border border-border-subtle rounded-[var(--radius-md)]',
            'px-3 py-2',
            'placeholder:text-text-placeholder',
            // Focus — accent ring via OUTLINE (independent of the well's box-shadow)
            'focus:outline focus:outline-2 focus:outline-offset-1 focus:[outline-color:var(--accent)] focus:border-[var(--accent)]',
            'transition-[border-color,outline-color] duration-[120ms]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            resizable ? 'resize-y' : 'resize-none',
            hasError && 'border-danger focus:[outline-color:var(--danger)] focus:border-danger',
            className
          )}
          ref={ref}
          aria-invalid={hasError || undefined}
          {...props}
        />
        {typeof error === 'string' && error && (
          <p className="mt-1 text-xs text-danger-text" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
