'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// An alert banner sits IN the page flow, so it is raised paper (not a
// floating drop-shadow like a toast). The semantic tint is carried by a
// warm wash + a 4px accent edge — the "strong border" from §3.6 — rather
// than a loud saturated fill, per the restrained-ink principle.
const alertVariants = cva(
  [
    'relative flex w-full items-start gap-3',
    'rounded-[var(--radius-lg)] border-l-4 px-4 py-3',
    'shadow-[var(--nm-raised-sm)]',
  ].join(' '),
  {
    variants: {
      variant: {
        info: 'bg-info-bg border-l-[var(--info)] text-info-text',
        success: 'bg-success-bg border-l-[var(--success)] text-success-text',
        warning: 'bg-warning-bg border-l-[var(--warning)] text-warning-text',
        danger: 'bg-danger-bg border-l-[var(--danger)] text-danger-text',
        neutral: 'bg-[var(--surface-elevated)] border-l-[var(--accent)] text-text-secondary',
      },
    },
    defaultVariants: { variant: 'info' },
  }
)

const variantIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  neutral: Info,
} as const

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string
  /** Hide the leading semantic icon. */
  hideIcon?: boolean
  /** Render a dismiss button; called when the user closes the banner. */
  onDismiss?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, title, hideIcon = false, onDismiss, children, ...props }, ref) => {
    const Icon = variantIcons[variant ?? 'info']

    return (
      <div
        ref={ref}
        // Errors interrupt; everything else is announced politely.
        role={variant === 'danger' ? 'alert' : 'status'}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {!hideIcon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}

        <div className="min-w-0 flex-1">
          {title && <p className="text-sm font-semibold leading-snug">{title}</p>}
          {children && (
            <div className={cn('text-sm text-text-secondary', title && 'mt-0.5')}>{children}</div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className={cn(
              '-mr-1 -mt-0.5 shrink-0 rounded-[var(--radius-sm)] p-1 text-text-muted',
              'transition-colors duration-[120ms] hover:text-text-primary',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
              'focus-visible:[outline-color:var(--accent)]'
            )}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = 'Alert'

export { Alert, alertVariants }
