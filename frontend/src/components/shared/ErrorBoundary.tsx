'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production, send to error reporting service
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-danger-bg mb-4">
            <AlertTriangle className="size-7 text-danger" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-text-muted max-w-sm mb-4">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
          >
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for use in server component trees
export function ErrorBoundaryWrapper({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}
