'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** how many page keys to show on each side of the current page */
  siblingCount?: number
}

const DOTS = '…'

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

/** Compute the page items to render (numbers + ellipses). */
function usePageItems(page: number, pageCount: number, siblingCount: number): (number | typeof DOTS)[] {
  return React.useMemo(() => {
    const totalNumbers = siblingCount * 2 + 5 // first, last, current, 2*siblings, +2 dots slots
    if (pageCount <= totalNumbers) return range(1, pageCount)

    const left = Math.max(page - siblingCount, 1)
    const right = Math.min(page + siblingCount, pageCount)
    const showLeftDots = left > 2
    const showRightDots = right < pageCount - 1

    if (!showLeftDots && showRightDots) {
      return [...range(1, 3 + siblingCount * 2), DOTS, pageCount]
    }
    if (showLeftDots && !showRightDots) {
      return [1, DOTS, ...range(pageCount - (2 + siblingCount * 2), pageCount)]
    }
    return [1, DOTS, ...range(left, right), DOTS, pageCount]
  }, [page, pageCount, siblingCount])
}

const keyBase =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-md)] px-2 text-sm font-medium ' +
  'transition-all duration-[140ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:[outline-color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none'

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ className, page, pageCount, onPageChange, siblingCount = 1, ...props }, ref) => {
    const items = usePageItems(page, pageCount, siblingCount)
    const go = (p: number) => onPageChange(Math.min(Math.max(p, 1), pageCount))

    return (
      <nav
        ref={ref}
        role="navigation"
        aria-label="Pagination"
        className={cn('flex items-center gap-1.5', className)}
        {...props}
      >
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className={cn(keyBase, 'bg-[var(--surface-elevated)] text-text-primary shadow-[var(--nm-raised-sm)] hover:brightness-[1.03] active:shadow-[var(--nm-pressed)] active:translate-y-px')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {items.map((item, idx) =>
          item === DOTS ? (
            <span key={`dots-${idx}`} className="inline-flex h-8 min-w-8 items-center justify-center text-text-muted">
              {DOTS}
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              onClick={() => go(item)}
              className={cn(
                keyBase,
                item === page
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-[var(--nm-pressed)]'
                  : 'bg-[var(--surface-elevated)] text-text-primary shadow-[var(--nm-raised-sm)] hover:brightness-[1.03] active:shadow-[var(--nm-pressed)] active:translate-y-px'
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
          className={cn(keyBase, 'bg-[var(--surface-elevated)] text-text-primary shadow-[var(--nm-raised-sm)] hover:brightness-[1.03] active:shadow-[var(--nm-pressed)] active:translate-y-px')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    )
  }
)
Pagination.displayName = 'Pagination'

export { Pagination }
