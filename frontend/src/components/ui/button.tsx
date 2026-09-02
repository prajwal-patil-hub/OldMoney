import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base: a tactile "key" — raised from the paper, presses IN on :active.
  // Arbitrary-value backgrounds (bg-[var(--…)]) are used deliberately so
  // buttons do NOT match the global [class*="bg-surface"] raised rule and
  // keep full control of their own neumorphic press state.
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-[var(--radius-md)] font-semibold select-none', // 8px tactile radius
    'transition-[box-shadow,transform,filter,background-color] duration-[140ms] ease-standard',
    'active:translate-y-px', // key physically sinks
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-brand-primary/45 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--background)]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        // Default — neutral raised paper key (per your preference: no coloured fills).
        // The reference's primary key is terracotta; flip bg to var(--accent) to adopt it.
        default:
          'bg-[var(--surface-elevated)] text-text-primary shadow-[var(--nm-raised-sm)] hover:brightness-[1.03] active:shadow-[var(--nm-pressed)]',
        // Secondary — a lighter, flatter key on the same material
        secondary:
          'bg-[var(--surface)] text-text-secondary shadow-[var(--nm-raised-sm)] hover:brightness-[1.03] active:shadow-[var(--nm-pressed)]',
        // Ghost — flush with the paper; hover reveals a faint recess
        ghost:
          'text-text-secondary hover:bg-[var(--surface-muted)] hover:text-text-primary active:shadow-[var(--nm-inset)]',
        // Destructive — neutral key, danger-coloured ink (semantics without a loud fill)
        destructive:
          'bg-[var(--surface-elevated)] text-danger-text shadow-[var(--nm-raised-sm)] hover:brightness-[1.03] active:shadow-[var(--nm-pressed)]',
        // Link — no key, terracotta text
        link:
          'text-accent underline-offset-4 hover:underline p-0 h-auto shadow-none active:translate-y-0',
        // Outline — engraved outline on the paper, presses into a well
        outline:
          'bg-transparent text-text-primary border border-border-strong hover:bg-[var(--surface-muted)] active:shadow-[var(--nm-inset)]',
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
