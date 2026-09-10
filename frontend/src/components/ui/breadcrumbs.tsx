import * as React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  href: string
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: Crumb[]
  /** Shown when items is empty (e.g. at the app root). */
  fallback?: string
}

/**
 * Breadcrumb trail. Ink-only — no chrome — so it stays flush with the paper
 * and lets the top bar's own surface carry the elevation. The last crumb is
 * the current page and is not a link (aria-current="page").
 */
const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  ({ className, items, fallback = 'Dashboard', ...props }, ref) => (
    <nav
      ref={ref}
      aria-label="Breadcrumb"
      className={cn('flex min-w-0 items-center gap-0.5 overflow-hidden', className)}
      {...props}
    >
      {items.length === 0 ? (
        <span className="text-sm font-medium text-text-primary">{fallback}</span>
      ) : (
        items.map((crumb, i) => {
          const isLast = i === items.length - 1
          return (
            <React.Fragment key={crumb.href}>
              {i > 0 && (
                <ChevronRight className="mx-0.5 size-3 shrink-0 text-text-muted" aria-hidden="true" />
              )}
              {isLast ? (
                <span aria-current="page" className="truncate text-sm font-medium text-text-primary">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={cn(
                    'shrink-0 text-sm text-text-muted',
                    'transition-colors duration-[120ms] hover:text-text-primary'
                  )}
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          )
        })
      )}
    </nav>
  )
)
Breadcrumbs.displayName = 'Breadcrumbs'

export { Breadcrumbs }
