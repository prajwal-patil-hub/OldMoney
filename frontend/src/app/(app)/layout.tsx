'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { cn } from '@/lib/utils'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const { theme } = useUIStore()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
    }
  }, [accessToken, router])

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  if (!accessToken) {
    return null
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar />
          <main
            className={cn(
              'flex-1 overflow-y-auto p-6',
              'focus-visible:outline-none'
            )}
            id="main-content"
            tabIndex={-1}
          >
            <div className="max-w-[1400px] mx-auto page-transition">
              {children}
            </div>
          </main>
        </div>

        {/* Global command palette */}
        <CommandPalette />
      </div>
    </TooltipProvider>
  )
}
