'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  ArrowLeftRight,
  Upload,
  Sparkles,
  Settings2,
  Search,
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { usePortfolios } from '@/lib/hooks/usePortfolios'
import { cn } from '@/lib/utils'

const pages = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'home overview' },
  { label: 'Portfolios', href: '/portfolios', icon: Briefcase, keywords: 'portfolio list' },
  { label: 'Assets', href: '/assets', icon: TrendingUp, keywords: 'stocks bonds funds' },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight, keywords: 'trade history buy sell' },
  { label: 'Import Data', href: '/imports', icon: Upload, keywords: 'import upload csv' },
  { label: 'AI Copilot', href: '/ai', icon: Sparkles, keywords: 'ai chat assistant' },
  { label: 'Settings', href: '/settings', icon: Settings2, keywords: 'preferences org' },
] as const

export function CommandPalette() {
  const router = useRouter()
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()
  const { data: portfoliosData } = usePortfolios()

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setCommandPaletteOpen])

  const runCommand = useCallback(
    (fn: () => void) => {
      setCommandPaletteOpen(false)
      fn()
    },
    [setCommandPaletteOpen]
  )

  const portfolios = portfoliosData?.items ?? []

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="!p-0 !max-w-[640px] overflow-hidden gap-0">
        <Command
          className="rounded-card overflow-hidden"
          loop
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="size-4 text-text-muted flex-shrink-0" aria-hidden="true" />
            <Command.Input
              placeholder="Search pages, portfolios, assets..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted"
              aria-label="Command palette search"
            />
            <kbd className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
              ESC
            </kbd>
          </div>

          <Command.List
            className="max-h-[420px] overflow-y-auto p-2"
            aria-label="Commands"
          >
            <Command.Empty className="py-12 text-center text-sm text-text-muted">
              No results found.
            </Command.Empty>

            {/* Pages group */}
            <Command.Group
              heading="Pages"
              className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-2 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider [&>[cmdk-group-heading]]:text-text-muted"
            >
              {pages.map((page) => {
                const Icon = page.icon
                return (
                  <Command.Item
                    key={page.href}
                    value={`${page.label} ${page.keywords}`}
                    onSelect={() => runCommand(() => router.push(page.href))}
                    className={cn(
                      'flex items-center gap-3 rounded-button px-3 py-2 text-sm text-text-primary cursor-pointer',
                      'aria-selected:bg-surface-muted transition-colors duration-100'
                    )}
                  >
                    <Icon className="size-4 text-text-muted" aria-hidden="true" />
                    {page.label}
                  </Command.Item>
                )
              })}
            </Command.Group>

            {/* Portfolios group */}
            {portfolios.length > 0 && (
              <>
                <Command.Separator className="my-1 h-px bg-border" />
                <Command.Group
                  heading="Portfolios"
                  className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-2 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider [&>[cmdk-group-heading]]:text-text-muted"
                >
                  {portfolios.slice(0, 5).map((portfolio) => (
                    <Command.Item
                      key={portfolio.id}
                      value={`portfolio ${portfolio.name}`}
                      onSelect={() => runCommand(() => router.push(`/portfolios/${portfolio.id}`))}
                      className={cn(
                        'flex items-center gap-3 rounded-button px-3 py-2 text-sm text-text-primary cursor-pointer',
                        'aria-selected:bg-surface-muted transition-colors duration-100'
                      )}
                    >
                      <Briefcase className="size-4 text-text-muted" aria-hidden="true" />
                      <span className="flex-1 truncate">{portfolio.name}</span>
                      <span className="text-xs text-text-muted">{portfolio.currency}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            )}

            {/* Quick actions */}
            <Command.Separator className="my-1 h-px bg-border" />
            <Command.Group
              heading="Quick Actions"
              className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-2 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider [&>[cmdk-group-heading]]:text-text-muted"
            >
              <Command.Item
                value="create new portfolio"
                onSelect={() => runCommand(() => router.push('/portfolios?create=true'))}
                className={cn(
                  'flex items-center gap-3 rounded-button px-3 py-2 text-sm text-text-primary cursor-pointer',
                  'aria-selected:bg-surface-muted transition-colors duration-100'
                )}
              >
                <Briefcase className="size-4 text-text-muted" aria-hidden="true" />
                Create new portfolio
              </Command.Item>
              <Command.Item
                value="import transactions data"
                onSelect={() => runCommand(() => router.push('/imports'))}
                className={cn(
                  'flex items-center gap-3 rounded-button px-3 py-2 text-sm text-text-primary cursor-pointer',
                  'aria-selected:bg-surface-muted transition-colors duration-100'
                )}
              >
                <Upload className="size-4 text-text-muted" aria-hidden="true" />
                Import transactions
              </Command.Item>
              <Command.Item
                value="ask ai copilot question"
                onSelect={() => runCommand(() => router.push('/ai'))}
                className={cn(
                  'flex items-center gap-3 rounded-button px-3 py-2 text-sm text-text-primary cursor-pointer',
                  'aria-selected:bg-surface-muted transition-colors duration-100'
                )}
              >
                <Sparkles className="size-4 text-text-muted" aria-hidden="true" />
                Ask AI Copilot
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
