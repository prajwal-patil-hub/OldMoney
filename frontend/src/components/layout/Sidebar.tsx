'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  ArrowLeftRight,
  Upload,
  Sparkles,
  GitFork,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  Building2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/portfolios',   label: 'Portfolios',   icon: Briefcase },
  { href: '/assets',       label: 'Assets',       icon: TrendingUp },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/imports',      label: 'Import',       icon: Upload },
  { href: '/ai',           label: 'AI Copilot',   icon: Sparkles, accent: true },
  { href: '/ownership',    label: 'Ownership',    icon: GitFork },
  { href: '/settings',     label: 'Settings',     icon: Settings2 },
] as const

/** Returns true when the nav item's path is active given the current pathname */
function useIsActive(href: string) {
  const pathname = usePathname()
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

// ── Single nav item ──
interface NavItemProps {
  href: string
  label: string
  icon: React.ElementType
  collapsed: boolean
  accent?: boolean
}

function NavItem({ href, label, icon: Icon, collapsed, accent }: NavItemProps) {
  const active = useIsActive(href)

  const inner = (
    <Link
      href={href}
      className={cn(
        'relative flex items-center h-9 rounded transition-all duration-[120ms] ease-standard',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40',
        collapsed ? 'w-9 justify-center px-0' : 'gap-2.5 px-3',
        active
          ? 'bg-brand-subtle text-brand-primary'
          : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
      )}
      aria-current={active ? 'page' : undefined}
    >
      {/* Active left accent line — absolute, vertically centered */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-primary rounded-full"
          aria-hidden="true"
        />
      )}
      <Icon
        className={cn(
          'size-4 shrink-0 transition-colors duration-[120ms]',
          active
            ? 'text-brand-primary'
            : accent
              ? 'text-accent-text'
              : 'text-text-muted'
        )}
        aria-hidden="true"
      />
      {!collapsed && (
        <span
          className={cn(
            'text-sm font-medium truncate',
            active ? 'text-brand-primary' : undefined,
            // Subtle gold styling for AI Copilot when inactive
            accent && !active ? 'text-accent-text' : undefined
          )}
        >
          {label}
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return inner
}

// ── User initials helper ──
function getInitials(fullName?: string | null, email?: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return fullName.slice(0, 2).toUpperCase()
  }
  return (email?.charAt(0) ?? 'U').toUpperCase()
}

// ── Org monogram (2 chars from name) ──
function getOrgMonogram(name?: string | null): string {
  if (!name) return 'OM'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { activeOrg } = useAuthStore()
  const { user, logout } = useAuth()

  const initials = getInitials(user?.full_name, user?.email)
  const orgMonogram = getOrgMonogram(activeOrg?.name)

  return (
    <aside
      style={{
        width: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        // CSS transition on width — 180ms ease-decel (elements arriving)
        transition: 'width 180ms cubic-bezier(0, 0, 0.2, 1)',
      }}
      className={cn(
        'flex flex-col h-screen bg-surface border-r border-border',
        'shrink-0 overflow-hidden relative z-sticky'
      )}
      aria-label="Main navigation"
    >
      {/* ── Logo area ── */}
      <div
        style={{ height: 'var(--topbar-height)' }}
        className="flex items-center px-3 border-b border-border shrink-0 gap-2.5"
      >
        {/* Brand monogram — always visible */}
        <div className="size-7 rounded bg-brand-primary flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-text-inverse font-display tracking-wide">
            {orgMonogram}
          </span>
        </div>

        {/* Expanded: wordmark + org name */}
        {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-text-primary text-[15px] tracking-tight leading-none truncate">
              OldMoney
            </p>
            {activeOrg && (
              <p className="text-[11px] text-text-muted truncate mt-0.5 leading-none">
                {activeOrg.name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-2 overflow-y-auto" aria-label="App navigation">
        <ul className={cn('space-y-0.5', sidebarCollapsed ? 'px-1.5' : 'px-2')} role="list">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavItem
                href={item.href}
                label={item.label}
                icon={item.icon}
                collapsed={sidebarCollapsed}
                accent={'accent' in item ? item.accent : undefined}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Bottom section ── */}
      <div className="border-t border-border p-2 space-y-1 shrink-0">
        {/* Collapse toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={sidebarCollapsed ? 'icon-sm' : 'default'}
              onClick={toggleSidebar}
              className={cn(
                'w-full text-text-muted',
                !sidebarCollapsed && 'justify-start gap-2.5 px-3'
              )}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4" aria-hidden="true" />
              ) : (
                <>
                  <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">Collapse</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          {sidebarCollapsed && (
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          )}
        </Tooltip>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center w-full rounded transition-colors duration-[120ms]',
                'hover:bg-surface-muted focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-brand-primary/40',
                sidebarCollapsed ? 'justify-center p-1.5' : 'gap-2.5 px-3 py-2'
              )}
              aria-label="User menu"
            >
              {/* 28px avatar — brand-subtle bg, initials */}
              <div className="size-7 rounded-full bg-brand-subtle flex items-center justify-center shrink-0">
                <span className="text-[11px] font-semibold text-brand-primary uppercase">
                  {initials}
                </span>
              </div>

              {!sidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate leading-snug">
                    {user?.full_name ?? 'User'}
                  </p>
                  <p className="text-[11px] text-text-muted truncate leading-snug">
                    {user?.email}
                  </p>
                </div>
              )}

              {!sidebarCollapsed && (
                <ChevronDown className="size-3.5 text-text-muted shrink-0" aria-hidden="true" />
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-52">
            {/* Identity header — not interactive */}
            <div className="px-2 py-1.5 mb-1">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.full_name ?? 'User'}
              </p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <User className="size-4" aria-hidden="true" />
                Profile
              </Link>
            </DropdownMenuItem>

            {activeOrg && (
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Building2 className="size-4" aria-hidden="true" />
                  {activeOrg.name}
                </Link>
              </DropdownMenuItem>
            )}

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
    </aside>
  )
}
