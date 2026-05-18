import * as React from 'react'
import { cn } from '@/lib/utils'

// Skeleton uses gradient shimmer (defined in globals.css as .skeleton-shimmer)
// instead of opacity pulse — more refined, matches the warm palette
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton-shimmer rounded bg-surface-muted', className)}
      role="status"
      aria-label="Loading..."
      {...props}
    />
  )
}

export { Skeleton }
