'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import type { AxiosError } from 'axios'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AuthResponse } from '@/types/api'

interface ApiErrorDetail {
  detail?: string
  locked_until?: string
}

function getErrorMessage(err: unknown): { message: string; locked?: boolean; minutesLeft?: number } {
  const axiosErr = err as AxiosError<ApiErrorDetail>
  const status = axiosErr?.response?.status
  const data = axiosErr?.response?.data

  if (status === 423) {
    const lockedUntil = data?.locked_until
    let minutesLeft: number | undefined
    if (lockedUntil) {
      const diff = new Date(lockedUntil).getTime() - Date.now()
      minutesLeft = Math.max(1, Math.ceil(diff / 60_000))
    }
    return {
      message: minutesLeft
        ? `Account locked. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`
        : 'Account locked. Please contact support.',
      locked: true,
      minutesLeft,
    }
  }

  if (status === 401) {
    return { message: 'Invalid email or password.' }
  }

  if (data?.detail) {
    return { message: data.detail }
  }

  return { message: 'Something went wrong. Please try again.' }
}

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  function validate(): boolean {
    const next: typeof fieldErrors = {}
    if (!email.trim()) {
      next.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    if (!password) {
      next.password = 'Password is required.'
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setFormError(null)
    setIsLoading(true)

    try {
      const res = await api.post<AuthResponse>('/auth/login', {
        email: email.trim(),
        password,
      })
      setAuth(res.data)
      router.push('/dashboard')
    } catch (err) {
      const { message } = getErrorMessage(err)
      setFormError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Heading */}
      <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
        Welcome back
      </h1>
      <p className="text-sm text-text-muted mt-1">Sign in to your wealth platform</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {/* Form-level error */}
        {formError && (
          <div
            role="alert"
            className="px-3 py-2 rounded bg-danger-bg border border-danger/20 text-sm text-danger-text"
          >
            {formError}
          </div>
        )}

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs text-text-secondary mb-1.5 font-medium"
          >
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
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }))
            }}
            error={fieldErrors.email}
            disabled={isLoading}
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs text-text-secondary mb-1.5 font-medium"
          >
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
              }}
              error={fieldErrors.password}
              disabled={isLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-[9px] text-text-muted hover:text-text-primary transition-colors duration-fast"
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
            className={cn(
              'size-4 rounded-sm border-border bg-surface-inset',
              'accent-brand-primary cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20'
            )}
            disabled={isLoading}
          />
          <label
            htmlFor="remember-me"
            className="text-sm text-text-secondary cursor-pointer select-none"
          >
            Keep me signed in
          </label>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          disabled={isLoading}
        >
          Sign in
        </Button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-sm text-text-muted text-center">
        New here?{' '}
        <Link
          href="/register"
          className="text-brand-primary hover:underline underline-offset-4 transition-colors duration-fast"
        >
          Create an account
        </Link>
      </p>

      {/* Security note */}
      <p className="mt-6 text-xs text-text-muted text-center">
        Protected by JWT authentication · No data sent to external servers
      </p>
    </div>
  )
}
