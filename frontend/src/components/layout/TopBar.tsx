'use client'

import { usePathname } from 'next/navigation'
import { Search, Bell } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/portfolios': 'Portfolios',
  '/assets': 'Assets',
  '/transactions': 'Transactions',
  '/imports': 'Import Data',
  '/ai': 'AI Copilot',
  '/settings': 'Settings',
}

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; href?: string }[] = [{ label: 'OldMoney', href: '/dashboard' }]

  let accumulated = ''
  for (const segment of segments) {
    accumulated += `/${segment}`
    const label = routeLabels[accumulated] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
    crumbs.push({ label, href: accumulated })
  }

  return crumbs
}

export function TopBar() {
  const pathname = usePathname()
  const { setCommandPaletteOpen } = useUIStore()
  const breadcrumbs = getBreadcrumbs(pathname)
  const currentPage = breadcrumbs[breadcrumbs.length - 1]

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b border-border bg-surface-elevated flex-shrink-0"
      role="banner"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
          {breadcrumbs.length > 1 &&
            breadcrumbs.slice(0, -1).map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-sm text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
                  {crumb.label}
                </span>
                <span className="text-text-muted text-sm" aria-hidden="true">
                  /
                </span>
              </span>
            ))}
          <span className="text-sm font-semibold text-text-primary">{currentPage?.label}</span>
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* Search / command palette trigger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 text-text-muted border border-border rounded-button px-3 h-8 hover:bg-surface-muted"
              aria-label="Open command palette"
            >
              <Search className="size-3.5" aria-hidden="true" />
              <span className="text-xs text-text-muted hidden md:inline">Search...</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                <span>⌘</span>K
              </kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Command palette (⌘K)</TooltipContent>
        </Tooltip>

        {/* Mobile search */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search"
        >
          <Search className="size-4" />
        </Button>

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Notifications">
              <Bell className="size-4 text-text-secondary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Notifications</TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  )
}
