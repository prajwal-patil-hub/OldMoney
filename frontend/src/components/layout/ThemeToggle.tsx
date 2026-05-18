'use client'

import { Sun, Moon } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ThemeToggle() {
  const { theme, toggleTheme } = useUIStore()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <Moon className="size-4 text-text-secondary" />
          ) : (
            <Sun className="size-4 text-brand-gold-light" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {theme === 'light' ? 'Dark mode' : 'Light mode'}
      </TooltipContent>
    </Tooltip>
  )
}
