'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, LogOut, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, getInitials } from '@/components/ui/avatar'
import { Breadcrumbs, type Crumb } from '@/components/ui/breadcrumbs'
import { ThemeToggle } from './ThemeToggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Map path segments → human-readable labels
const routeLabels: Record<string, string> = {
  dashboard:    'Dashboard',
  portfolios:   'Portfolios',
  assets:       'Assets',
  transactions: 'Transactions',
  imports:      'Import',
  ai:           'AI Copilot',
  ownership:    'Ownership',
  settings:     'Settings',
}

function useBreadcrumbs(): Crumb[] {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return segments.map((segment: string, i: number) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label =
      routeLabels[segment] ??
      // UUID-like segments (portfolio IDs etc): use a truncated version
      (segment.length > 12
        ? segment.slice(0, 8) + '…'
        : segment.charAt(0).toUpperCase() + segment.slice(1))
    return { label, href }
  })
}

export function TopBar() {
  const { setCommandPaletteOpen } = useUIStore()
  const { activeOrg } = useAuthStore()
  const { user, logout } = useAuth()
  const breadcrumbs = useBreadcrumbs()
  const initials = getInitials(user?.full_name, user?.email)

  return (
    <header
      style={{ height: 'var(--topbar-height)' }}
      className={cn(
        'flex items-center justify-between px-5 gap-4',
        'bg-surface border-b border-border shrink-0',
        'sticky top-0 z-sticky'
      )}
      role="banner"
    >
      {/* ── Left: Breadcrumb ── */}
      <Breadcrumbs items={breadcrumbs} className="flex-1" />

      {/* ── Right actions ── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Search trigger — looks like an input, opens command palette */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className={cn(
                'hidden sm:flex items-center gap-2',
                'h-8 w-48 px-2.5 rounded',
                'bg-surface-muted border border-border',
                'text-xs text-text-muted',
                'hover:border-border-strong transition-[border-color] duration-[120ms]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40'
              )}
              aria-label="Open command palette (⌘K)"
            >
              <Search className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">Search…</span>
              <kbd
                className={cn(
                  'hidden md:inline-flex items-center gap-0.5 shrink-0',
                  'rounded border border-border px-1 py-0.5',
                  'text-[10px] font-medium text-text-muted bg-surface'
                )}
              >
                <span>⌘</span>K
              </kbd>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Command palette (⌘K)</TooltipContent>
        </Tooltip>

        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search"
        >
          <Search className="size-4" aria-hidden="true" />
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Separator */}
        <div className="w-px h-4 bg-border mx-0.5 shrink-0" aria-hidden="true" />

        {/* User avatar menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full',
                'transition-[filter] duration-[120ms] hover:brightness-[1.04]',
                'active:[&>span]:shadow-[var(--nm-pressed)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                'focus-visible:[outline-color:var(--accent)]'
              )}
              aria-label="User menu"
            >
              <Avatar initials={initials} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* Identity header */}
            <div className="px-2 py-1.5 mb-1">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.full_name ?? 'User'}
              </p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
              {activeOrg && (
                <p className="text-[11px] text-text-muted truncate mt-0.5">{activeOrg.name}</p>
              )}
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <User className="size-4" aria-hidden="true" />
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="size-4" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => logout()}
              className="text-danger-text focus:bg-danger-bg focus:text-danger-text flex items-center gap-2"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
