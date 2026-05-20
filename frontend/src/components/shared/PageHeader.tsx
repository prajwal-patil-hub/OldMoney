'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  /**
   * Optional description. Collapsed behind a "Details" toggle to save
   * vertical space — Palantir-style density.
   */
  description?: string
  /** "As of May 18, 2025 · Updated 2h ago" — appears below the title in muted text */
  asOf?: string
  /** Primary action button (or group), slotted top-right */
  action?: React.ReactNode
  /** Alias for action — accepts a button or group of buttons */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, asOf, action, actions, className }: PageHeaderProps) {
  const actionSlot = actions ?? action
  const [descOpen, setDescOpen] = React.useState(false)

  return (
    <div className={cn('mb-6', className)}>
      {/* Single row: title + asOf on left, action on right */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-display tracking-tight text-text-primary leading-heading truncate">
            {title}
          </h1>

          {/* Row 2: asOf + optional description toggle */}
          {(asOf || description) && (
            <div className="flex items-center gap-3 mt-1">
              {asOf && (
                <p className="text-xs text-text-muted leading-ui">{asOf}</p>
              )}

              {description && (
                <button
                  type="button"
                  onClick={() => setDescOpen((v: boolean) => !v)}
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs text-text-muted',
                    'hover:text-text-secondary transition-colors duration-[120ms]',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary/40 rounded-sm'
                  )}
                  aria-expanded={descOpen}
                >
                  Details
                  {descOpen ? (
                    <ChevronUp className="size-3" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-3" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action slot */}
        {actionSlot && (
          <div className="shrink-0 flex items-center gap-2">{actionSlot}</div>
        )}
      </div>

      {/* Expandable description — collapsed by default */}
      {description && descOpen && (
        <p className="mt-2 text-sm text-text-muted max-w-2xl leading-body">{description}</p>
      )}
    </div>
  )
}
