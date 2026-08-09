import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base: flex layout, rounded (6px — never pill), no pointer-events when disabled
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded font-semibold select-none',
    'transition-colors duration-[120ms] ease-standard',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-surface',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary action — neutral frosted glass, distinguished by a gold hairline
        default:
          'bg-surface-elevated text-text-primary border border-accent/45 backdrop-blur-md shadow-sm hover:bg-surface-muted hover:border-accent/70',
        // Secondary — lighter frosted glass
        secondary:
          'bg-surface text-text-primary border border-border backdrop-blur-md hover:bg-surface-muted hover:border-border-strong',
        // Ghost — transparent, text-only
        ghost:
          'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
        // Destructive — faint danger tint kept for affordance (semantics > uniformity)
        destructive:
          'bg-danger-bg text-danger-text border border-danger-border backdrop-blur-md hover:bg-danger/20',
        // Link style — no background
        link:
          'text-accent underline-offset-4 hover:underline p-0 h-auto',
        // Outline — border with transparent background
        outline:
          'bg-transparent text-text-primary border border-border hover:bg-surface-muted hover:border-border-strong',
      },
      size: {
        sm:      'h-7 px-2.5 text-xs [&_svg]:size-3',
        default: 'h-[34px] px-3.5 text-sm [&_svg]:size-4',
        lg:      'h-10 px-4 text-base [&_svg]:size-4',
        // Icon: square button, same height as default
        icon:    'h-[34px] w-[34px] [&_svg]:size-4',
        // Icon-sm: square button, same height as sm
        'icon-sm': 'h-7 w-7 [&_svg]:size-3.5',
        // Icon-lg: square button, same height as lg
        'icon-lg': 'h-10 w-10 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin size-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
