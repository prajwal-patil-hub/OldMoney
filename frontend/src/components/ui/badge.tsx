import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Badge: compact, 20px tall, 4px radius (rounded-sm)
// All variants use the semantic palette from tokens.css
const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-1.5 h-5 text-xs font-medium border whitespace-nowrap',
  {
    variants: {
      variant: {
        // Neutral default — low-contrast, for status labels etc.
        default:
          'bg-surface-muted text-text-secondary border-border',
        // Brand — Falu Red tint
        brand:
          'bg-brand-subtle text-brand-primary border-brand-muted',
        // Semantic status variants
        success:
          'bg-success-bg text-success-text border-success-border',
        warning:
          'bg-warning-bg text-warning-text border-warning-border',
        danger:
          'bg-danger-bg text-danger-text border-danger-border',
        info:
          'bg-info-bg text-info-text border-info-border',
        // Gold accent — for dividends, premium features
        accent:
          'bg-accent-subtle text-accent-text border-accent/20',
        // Outline variant — minimal, just a border
        outline:
          'bg-transparent text-text-secondary border-border',
        // Secondary — surface-muted background
        secondary:
          'bg-surface-muted text-text-secondary border-border',
        // Gold — warm gold accent for private equity, premium
        gold:
          'bg-accent-subtle text-accent-text border-accent/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// ── Asset type badge helpers ──
// Maps instrument type strings to badge variants for consistent rendering across tables
const assetTypeBadgeVariant: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  EQUITY:   'default',
  STOCK:    'default',
  ETF:      'info',
  BOND:     'success',
  FIXED_INCOME: 'success',
  CRYPTO:   'warning',
  REAL_ESTATE: 'accent',
  COMMODITY: 'accent',
  CASH:     'outline',
  OTHER:    'outline',
}

interface AssetTypeBadgeProps extends Omit<BadgeProps, 'variant'> {
  type: string
}

function AssetTypeBadge({ type, ...props }: AssetTypeBadgeProps) {
  const variant = assetTypeBadgeVariant[type?.toUpperCase()] ?? 'default'
  return (
    <Badge variant={variant} {...props}>
      {type}
    </Badge>
  )
}

// ── Transaction type badge helpers ──
// BUY → success, SELL → danger, DIVIDEND → accent, DEPOSIT/WITHDRAWAL → info
const txTypeBadgeVariant: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  BUY:        'success',
  SELL:       'danger',
  DIVIDEND:   'accent',
  DEPOSIT:    'info',
  WITHDRAWAL: 'warning',
  TRANSFER:   'default',
  FEE:        'outline',
  OTHER:      'outline',
}

interface TransactionTypeBadgeProps extends Omit<BadgeProps, 'variant'> {
  type: string
}

function TransactionTypeBadge({ type, ...props }: TransactionTypeBadgeProps) {
  const variant = txTypeBadgeVariant[type?.toUpperCase()] ?? 'default'
  return (
    <Badge variant={variant} {...props}>
      {type}
    </Badge>
  )
}

export { Badge, badgeVariants, AssetTypeBadge, TransactionTypeBadge }
