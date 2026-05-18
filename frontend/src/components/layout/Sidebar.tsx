'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  ArrowLeftRight,
  Upload,
  Sparkles,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  ChevronDown,
  LogOut,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolios', label: 'Portfolios', icon: Briefcase },
  { href: '/assets', label: 'Assets', icon: TrendingUp },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/imports', label: 'Import', icon: Upload },
  { href: '/ai', label: 'AI Copilot', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings2 },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { activeOrg } = useAuthStore()
  const { user, logout } = useAuth()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'flex flex-col h-full bg-surface border-r border-border',
        'flex-shrink-0 overflow-hidden relative z-30'
      )}
      aria-label="Main navigation"
    >
      {/* Logo / Brand */}
      <div className="flex items-center h-16 px-4 border-b border-border flex-shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          {!sidebarCollapsed ? (
            <motion.div
              key="full-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 flex-1 min-w-0"
            >
              <div className="size-8 rounded-lg bg-brand-primary flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-text-inverse font-display">OM</span>
              </div>
              <span className="font-display font-bold text-text-primary text-lg tracking-tight truncate">
                OldMoney
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="icon-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center w-full"
            >
              <div className="size-8 rounded-lg bg-brand-primary flex items-center justify-center">
                <span className="text-xs font-bold text-text-inverse font-display">OM</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="App navigation">
        <ul className="space-y-0.5 px-2" role="list">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-button text-sm font-medium transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                  active
                    ? 'bg-surface-muted text-brand-primary border-l-2 border-brand-primary pl-[10px]'
                    : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'size-4 flex-shrink-0',
                    active ? 'text-brand-primary' : 'text-text-muted'
                  )}
                  aria-hidden="true"
                />
                <AnimatePresence initial={false}>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )

            return (
              <li key={item.href}>
                {sidebarCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom: Org + User */}
      <div className="border-t border-border p-2 space-y-1 flex-shrink-0">
        {/* Org switcher */}
        {!sidebarCollapsed && activeOrg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-button text-sm text-text-secondary hover:bg-surface-muted transition-colors duration-150 cursor-pointer group">
            <Building2 className="size-4 text-text-muted flex-shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate font-medium">{activeOrg.name}</span>
            <ChevronDown className="size-3.5 text-text-muted" aria-hidden="true" />
          </div>
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-button text-sm',
                'hover:bg-surface-muted transition-colors duration-150 focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-brand-primary'
              )}
              aria-label="User menu"
            >
              {/* Avatar */}
              <div className="size-7 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-text-inverse uppercase">
                  {user?.full_name?.charAt(0) ?? user?.email?.charAt(0) ?? 'U'}
                </span>
              </div>
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 text-left overflow-hidden"
                  >
                    <p className="text-xs font-medium text-text-primary truncate">
                      {user?.full_name ?? 'User'}
                    </p>
                    <p className="text-xs text-text-muted truncate">{user?.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-danger focus:bg-danger-bg focus:text-danger"
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-4 text-text-muted" />
          ) : (
            <PanelLeftClose className="size-4 text-text-muted" />
          )}
        </Button>
      </div>
    </motion.aside>
  )
}
