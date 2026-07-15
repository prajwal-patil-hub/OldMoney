'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, slugify } from '@/lib/utils'
import { ALLOW_DEMO_LOGIN } from '@/lib/constants'
import type { AxiosError } from 'axios'
import type { LoginApiResponse, OrgApiResponse } from '@/types/api'

// ─── Password strength ────────────────────────────────────────────────────────

interface PasswordStrength {
  score: 1 | 2 | 3 | 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong'
}

function getPasswordStrength(pwd: string): PasswordStrength | null {
  if (!pwd) return null
  const hasLen = pwd.length >= 8
  const hasUpper = /[A-Z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd)

  if (!hasLen) return { score: 1, label: 'Weak' }
  if (hasLen && !hasUpper) return { score: 2, label: 'Fair' }
  if (hasLen && hasUpper && !hasNumber) return { score: 3, label: 'Good' }
  if (hasLen && hasUpper && hasNumber && hasSpecial) return { score: 4, label: 'Strong' }
  return { score: 3, label: 'Good' }
}

const STRENGTH_COLORS: Record<string, string> = {
  Weak: 'bg-danger',
  Fair: 'bg-warning',
  Good: 'bg-warning',
  Strong: 'bg-success',
}

const STRENGTH_TEXT: Record<string, string> = {
  Weak: 'text-danger-text',
  Fair: 'text-warning-text',
  Good: 'text-warning-text',
  Strong: 'text-success-text',
}

// ─── Step 1 form state ────────────────────────────────────────────────────────

interface Step1Data {
  fullName: string
  email: string
  password: string
}

interface Step1Errors {
  fullName?: string
  email?: string
  password?: string
}

// ─── Step 2 form state ────────────────────────────────────────────────────────

interface Step2Data {
  orgName: string
  slug: string
}

interface Step2Errors {
  orgName?: string
  slug?: string
  form?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)

  // Step 1
  const [step1, setStep1] = useState<Step1Data>({ fullName: '', email: '', password: '' })
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({})
  const [showPassword, setShowPassword] = useState(false)

  // Step 2
  const [step2, setStep2] = useState<Step2Data>({ orgName: '', slug: '' })
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({})

  const passwordStrength = getPasswordStrength(step1.password)

  function handleDemoLogin() {
    setAuth({
      access_token: 'demo-token-mock',
      refresh_token: 'demo-refresh-mock',
      token_type: 'bearer',
      user: {
        id: 'demo-user-id',
        email: 'demo@oldmoney.app',
        full_name: 'Demo User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      org: {
        id: 'demo-org-id',
        name: 'Demo Organization',
        slug: 'demo-org',
        plan: 'free',
        created_at: new Date().toISOString(),
      },
      role: 'owner',
    })
    router.push('/dashboard')
  }

  const pwdReqs = [
    { label: 'At least 8 characters', met: step1.password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(step1.password) },
    { label: 'One number', met: /[0-9]/.test(step1.password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(step1.password) },
  ]

  function validateStep1(): boolean {
    const errs: Step1Errors = {}
    if (!step1.fullName.trim()) errs.fullName = 'Full name is required.'
    if (!step1.email.trim()) {
      errs.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1.email.trim())) {
      errs.email = 'Enter a valid email address.'
    }
    if (!step1.password) {
      errs.password = 'Password is required.'
    } else if (step1.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.'
    }
    setStep1Errors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2(): boolean {
    const errs: Step2Errors = {}
    if (!step2.orgName.trim()) errs.orgName = 'Organization name is required.'
    if (!step2.slug.trim()) {
      errs.slug = 'Slug is required.'
    } else if (!/^[a-z0-9-]+$/.test(step2.slug)) {
      errs.slug = 'Only lowercase letters, numbers, and hyphens.'
    }
    setStep2Errors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (validateStep1()) setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateStep2()) return
    setIsLoading(true)
    setStep2Errors({})

    try {
      // 1. Create user account (returns no tokens)
      await api.post('/auth/register', {
        email: step1.email.trim(),
        password: step1.password,
        full_name: step1.fullName.trim(),
      })

      // 2. Login to get tokens
      const loginRes = await api.post<LoginApiResponse>('/auth/login', {
        email: step1.email.trim(),
        password: step1.password,
      })
      const loginData = loginRes.data as LoginApiResponse
      const tempToken = loginData.access_token

      // 3. Create organization using the bare user token
      const orgRes = await api.post<OrgApiResponse>(
        '/orgs',
        { name: step2.orgName.trim(), slug: step2.slug },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      )
      const org = orgRes.data as OrgApiResponse

      // 4. Switch into org context — get an org-scoped access token
      const switchRes = await api.post<{ access_token: string }>(
        `/orgs/${org.id}/switch`,
        {},
        { headers: { Authorization: `Bearer ${tempToken}` } }
      )
      const orgToken = (switchRes.data as { access_token: string }).access_token

      // 5. Populate the auth store with the complete session
      setAuth({
        access_token: orgToken,
        refresh_token: loginData.refresh_token,
        token_type: 'bearer',
        user: {
          id: loginData.user.id,
          email: loginData.user.email,
          full_name: loginData.user.full_name,
          created_at: loginData.user.created_at,
          updated_at: loginData.user.created_at,
        },
        org: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: (org.plan as 'free' | 'pro' | 'enterprise') || 'free',
          created_at: org.created_at,
        },
      })

      router.push('/dashboard')
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: Array<{ message: string }> }>
      const backendMsg = axiosErr?.response?.data?.errors?.[0]?.message
      setStep2Errors({ form: backendMsg || 'Registration failed. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-6">
        <p className="text-xs text-text-muted mb-2">Step {step} of 2</p>
        <div className="h-0.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-primary rounded-full transition-all duration-normal ease-decel"
            style={{ width: step === 1 ? '50%' : '100%' }}
            aria-hidden="true"
          />
        </div>
      </div>

      {step === 1 && (
        <>
          <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-text-muted mt-1">Start your wealth intelligence journey</p>

          <form onSubmit={handleNext} className="mt-8 space-y-5" noValidate>
            {/* Full name */}
            <div>
              <label htmlFor="full-name" className="block text-xs text-text-secondary mb-1.5 font-medium">
                Full Name
              </label>
              <Input
                id="full-name"
                type="text"
                autoComplete="name"
                autoFocus
                placeholder="Jane Smith"
                value={step1.fullName}
                onChange={(e) => {
                  setStep1((p) => ({ ...p, fullName: e.target.value }))
                  if (step1Errors.fullName) setStep1Errors((p) => ({ ...p, fullName: undefined }))
                }}
                error={step1Errors.fullName}
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs text-text-secondary mb-1.5 font-medium">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={step1.email}
                onChange={(e) => {
                  setStep1((p) => ({ ...p, email: e.target.value }))
                  if (step1Errors.email) setStep1Errors((p) => ({ ...p, email: undefined }))
                }}
                error={step1Errors.email}
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs text-text-secondary mb-1.5 font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={step1.password}
                  onChange={(e) => {
                    setStep1((p) => ({ ...p, password: e.target.value }))
                    if (step1Errors.password) setStep1Errors((p) => ({ ...p, password: undefined }))
                  }}
                  error={step1Errors.password}
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

              {/* Strength dots */}
              {step1.password && passwordStrength && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-1.5">
                    {([1, 2, 3, 4] as const).map((n) => (
                      <div
                        key={n}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors duration-normal',
                          n <= passwordStrength.score
                            ? STRENGTH_COLORS[passwordStrength.label]
                            : 'bg-border'
                        )}
                        aria-hidden="true"
                      />
                    ))}
                    <span
                      className={cn(
                        'text-xs ml-1 font-medium',
                        STRENGTH_TEXT[passwordStrength.label]
                      )}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>

                  {/* Requirements */}
                  <ul className="space-y-1">
                    {pwdReqs.map((req) => (
                      <li
                        key={req.label}
                        className={cn(
                          'flex items-center gap-1.5 text-xs transition-colors duration-fast',
                          req.met ? 'text-success-text' : 'text-text-muted'
                        )}
                      >
                        <Check
                          className={cn(
                            'size-3 shrink-0 transition-opacity duration-fast',
                            req.met ? 'opacity-100' : 'opacity-30'
                          )}
                          aria-hidden="true"
                        />
                        {req.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              Continue
            </Button>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
            Set up your workspace
          </h1>
          <p className="text-sm text-text-muted mt-1">Create an organization to manage portfolios</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            {/* Form-level error */}
            {step2Errors.form && (
              <div
                role="alert"
                className="px-3 py-2 rounded bg-danger-bg border border-danger/20 text-sm text-danger-text"
              >
                {step2Errors.form}
              </div>
            )}

            {/* Org name */}
            <div>
              <label htmlFor="org-name" className="block text-xs text-text-secondary mb-1.5 font-medium">
                Organization name
              </label>
              <Input
                id="org-name"
                type="text"
                autoFocus
                placeholder="Smith Family Office"
                value={step2.orgName}
                onChange={(e) => {
                  const name = e.target.value
                  setStep2((p) => ({
                    orgName: name,
                    slug: p.slug === slugify(p.orgName) ? slugify(name) : p.slug,
                  }))
                  if (step2Errors.orgName) setStep2Errors((p) => ({ ...p, orgName: undefined }))
                }}
                error={step2Errors.orgName}
                disabled={isLoading}
              />
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="org-slug" className="block text-xs text-text-secondary mb-1.5 font-medium">
                Slug
              </label>
              <Input
                id="org-slug"
                type="text"
                placeholder="smith-family-office"
                value={step2.slug}
                onChange={(e) => {
                  setStep2((p) => ({
                    ...p,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  }))
                  if (step2Errors.slug) setStep2Errors((p) => ({ ...p, slug: undefined }))
                }}
                error={step2Errors.slug}
                disabled={isLoading}
                className="font-mono"
              />
              {step2.slug && (
                <p className="mt-1.5 text-xs text-text-muted font-mono">
                  oldmoney.app/{step2.slug}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              Create workspace
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-4 text-sm text-text-muted hover:text-text-primary transition-colors duration-fast"
          >
            ← Back to account details
          </button>
        </>
      )}

      {/* Sign in link */}
      <p className="mt-8 text-sm text-text-muted text-center">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-brand-primary hover:underline underline-offset-4 transition-colors duration-fast"
        >
          Sign in
        </Link>
      </p>

      {/* Demo mode — only rendered when explicitly enabled (never in prod) */}
      {ALLOW_DEMO_LOGIN && (
        <>
          <div className="mt-4 relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full mt-4"
            onClick={handleDemoLogin}
          >
            Continue as Demo
          </Button>
        </>
      )}
    </div>
  )
}
