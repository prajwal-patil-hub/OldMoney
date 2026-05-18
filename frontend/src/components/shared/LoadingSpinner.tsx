import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

export function LoadingSpinner({ size = 'md', className, label = 'Loading...' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'size-4 border-2',
    md: 'size-8 border-2',
    lg: 'size-12 border-3',
  }

  return (
    <div
      className={cn('flex items-center justify-center', className)}
      role="status"
      aria-label={label}
    >
      <div
        className={cn(
          'rounded-full border-border border-t-brand-primary animate-spin',
          sizeClasses[size]
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
