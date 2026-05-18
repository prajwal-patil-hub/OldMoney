import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  value: number,
  currency = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  if (value === undefined || value === null || isNaN(value)) return '—'

  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  // Compact notation for large numbers
  if (absValue >= 1_000_000_000) {
    return (
      sign +
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
        ...options,
      }).format(absValue / 1_000_000_000) +
      'B'
    )
  }

  if (absValue >= 1_000_000) {
    return (
      sign +
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
        ...options,
      }).format(absValue / 1_000_000) +
      'M'
    )
  }

  if (absValue >= 1_000) {
    return (
      sign +
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...options,
      }).format(absValue)
    )
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

export function formatCurrencyFull(value: number, currency = 'USD'): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value: number, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 0): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, fmt)
  } catch {
    return '—'
  }
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'MMM d')
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM d, yyyy HH:mm')
}

export function formatRelativeTime(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return formatDate(d)
  } catch {
    return '—'
  }
}

export function abbreviateNumber(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absValue >= 1_000_000_000) return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`
  if (absValue >= 1_000_000) return `${sign}${(absValue / 1_000_000).toFixed(1)}M`
  if (absValue >= 1_000) return `${sign}${(absValue / 1_000).toFixed(1)}K`
  return `${sign}${absValue.toFixed(0)}`
}

export function getChangeColor(value: number): string {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-text-muted'
}

export function getChangeBgColor(value: number): string {
  if (value > 0) return 'bg-success-bg text-success'
  if (value < 0) return 'bg-danger-bg text-danger'
  return 'bg-surface-muted text-text-muted'
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
