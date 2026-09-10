import * as React from 'react'
import { cn } from '@/lib/utils'

const avatarSizes = {
  sm: 'size-6 text-[10px]',
  default: 'size-7 text-[11px]',
  lg: 'size-9 text-sm',
  xl: 'size-12 text-base',
} as const

/**
 * Derive up-to-two initials from a name, falling back to the email's first
 * character. Shared by the sidebar and top-bar identity menus.
 */
export function getInitials(fullName?: string | null, email?: string | null): string {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return fullName.trim().slice(0, 2).toUpperCase()
  }
  return (email?.charAt(0) ?? 'U').toUpperCase()
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string | null
  email?: string | null
  /** Overrides the initials derived from name/email. */
  initials?: string
  size?: keyof typeof avatarSizes
  /** Raised disc (default) vs. flush tinted disc — use flush inside raised rows. */
  raised?: boolean
}

/**
 * Tactile avatar — a raised disc of the same paper, carrying the user's
 * initials in accent ink. Arbitrary-value background keeps it out of the
 * global bg-surface raise rule so it owns its own (smaller) elevation.
 */
const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, name, email, initials, size = 'default', raised = true, ...props }, ref) => {
    const text = initials ?? getInitials(name, email)

    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={cn(
          'inline-flex shrink-0 select-none items-center justify-center rounded-full',
          'font-semibold uppercase tracking-wide text-accent-text',
          raised
            ? 'bg-[var(--surface-elevated)] shadow-[var(--nm-raised-sm)]'
            : 'bg-[var(--accent-subtle)]',
          avatarSizes[size],
          className
        )}
        {...props}
      >
        {text}
      </span>
    )
  }
)
Avatar.displayName = 'Avatar'

export { Avatar }
