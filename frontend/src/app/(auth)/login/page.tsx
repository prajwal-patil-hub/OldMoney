'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AxiosError } from 'axios'

interface ApiErrorResponse {
  detail?: string
  errors?: Array<{ message: string }>
}

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorResponse>
  const data = axiosError?.response?.data
  if (data?.errors?.[0]?.message) return data.errors[0].message
  if (data?.detail) return data.detail
  return 'Invalid credentials. Please check your email and password.'
}

export default function LoginPage() {
  const { loginAsync, isLoggingIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})

  function validate(): boolean {
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Password is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setErrors({})

    try {
      await loginAsync({ email: email.trim(), password })
      toast.success('Welcome back!')
    } catch (err) {
      const message = extractErrorMessage(err)
      const isLocked =
        message.toLowerCase().includes('lock') || message.toLowerCase().includes('suspend')

      setErrors({ form: message })

      if (isLocked) {
        toast.error('Account locked', {
          description: 'Your account has been locked. Please contact support.',
        })
      } else {
        toast.error('Sign in failed', { description: message })
      }
    }
  }

  return (
    <Card className="shadow-card-hover">
      <CardHeader className="pb-2">
        <h1
          className="text-2xl font-bold text-text-primary leading-tight"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Welcome back
        </h1>
        <p className="text-sm text-text-muted mt-1">Sign in to your wealth platform</p>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Form-level error */}
          {errors.form && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger"
            >
              {errors.form}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-text-primary">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              error={errors.email}
              disabled={isLoggingIn}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-text-primary">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-brand-primary hover:underline transition-colors"
                tabIndex={-1}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                }}
                error={errors.password}
                disabled={isLoggingIn}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={cn(
                  'absolute right-3 top-[18px] text-text-muted hover:text-text-primary transition-colors',
                  errors.password && 'top-[18px]'
                )}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded border-border accent-brand-primary cursor-pointer"
              disabled={isLoggingIn}
            />
            <label
              htmlFor="remember-me"
              className="text-sm text-text-secondary cursor-pointer select-none"
            >
              Remember me for 30 days
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={isLoggingIn}
            disabled={isLoggingIn}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-brand-primary hover:underline transition-colors"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
