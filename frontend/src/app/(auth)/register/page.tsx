'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Mail, User, Building2, Hash, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { slugify } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Step = 'account' | 'organization'

interface FormData {
  email: string
  password: string
  confirmPassword: string
  full_name: string
  org_name: string
  org_slug: string
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  full_name?: string
  org_name?: string
  org_slug?: string
  form?: string
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'organization', label: 'Organization' },
]

export default function RegisterPage() {
  const { registerAsync, isRegistering } = useAuth()
  const [step, setStep] = useState<Step>('account')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    org_name: '',
    org_slug: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value }
      // Auto-generate slug from org name
      if (key === 'org_name') {
        updated.org_slug = slugify(value as string)
      }
      return updated
    })
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required'
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.org_name.trim()) newErrors.org_name = 'Organization name is required'
    if (!formData.org_slug.trim()) {
      newErrors.org_slug = 'Slug is required'
    } else if (!/^[a-z0-9-]+$/.test(formData.org_slug)) {
      newErrors.org_slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 'account' && validateStep1()) {
      setStep('organization')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return

    try {
      await registerAsync({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        org_name: formData.org_name,
        org_slug: formData.org_slug,
      })
    } catch {
      setErrors({ form: 'Registration failed. Please try again.' })
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const passwordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 1) return { score, label: 'Weak', color: 'bg-danger' }
    if (score <= 3) return { score, label: 'Fair', color: 'bg-warning' }
    return { score, label: 'Strong', color: 'bg-success' }
  }

  const pwdStrength = passwordStrength(formData.password)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background pattern */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(circle at 75% 25%, rgba(124,34,32,0.08) 0%, transparent 50%),
                           radial-gradient(circle at 25% 75%, rgba(159,105,32,0.06) 0%, transparent 50%)`,
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="size-12 rounded-xl bg-brand-primary flex items-center justify-center shadow-card">
              <span className="text-lg font-bold text-text-inverse font-display">OM</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold font-display tracking-heading text-text-primary">
            OldMoney
          </h1>
          <p className="text-text-muted text-sm mt-1">Wealth Intelligence, Refined</p>
        </div>

        <div className="bg-surface rounded-card border border-border shadow-card-hover p-8">
          {/* Step indicators */}
          <div className="flex items-center mb-6" role="list" aria-label="Registration steps">
            {STEPS.map((s, i) => {
              const isCompleted = i < stepIndex
              const isCurrent = s.id === step

              return (
                <div key={s.id} className="flex items-center flex-1" role="listitem">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'size-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200',
                        isCompleted
                          ? 'bg-success text-text-inverse'
                          : isCurrent
                          ? 'bg-brand-primary text-text-inverse'
                          : 'bg-surface-muted text-text-muted border border-border'
                      )}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      {isCompleted ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs',
                        isCurrent ? 'text-text-primary font-medium' : 'text-text-muted'
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mb-5 mx-2 transition-colors duration-200',
                        isCompleted ? 'bg-success' : 'bg-border'
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Form error */}
          {errors.form && (
            <div
              className="mb-4 p-3 rounded-lg bg-danger-bg border border-danger/20 text-sm text-danger"
              role="alert"
            >
              {errors.form}
            </div>
          )}

          {/* Step 1: Account */}
          {step === 'account' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-heading text-text-primary">
                  Create your account
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  Start your wealth intelligence journey
                </p>
              </div>

              {/* Full name */}
              <div className="space-y-1.5">
                <label htmlFor="full-name" className="text-sm font-medium text-text-primary">
                  Full Name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" aria-hidden="true" />
                  <Input
                    id="full-name"
                    value={formData.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    placeholder="John Smith"
                    error={errors.full_name}
                    className="pl-9"
                    autoComplete="name"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="register-email" className="text-sm font-medium text-text-primary">
                  Email Address <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" aria-hidden="true" />
                  <Input
                    id="register-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="you@example.com"
                    error={errors.email}
                    className="pl-9"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="register-password" className="text-sm font-medium text-text-primary">
                  Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" aria-hidden="true" />
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="Min. 8 characters"
                    error={errors.password}
                    className="pl-9 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Password strength */}
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-all duration-300',
                            i <= pwdStrength.score ? pwdStrength.color : 'bg-border'
                          )}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-text-muted">
                      Password strength:{' '}
                      <span
                        className={cn(
                          'font-medium',
                          pwdStrength.color === 'bg-danger' && 'text-danger',
                          pwdStrength.color === 'bg-warning' && 'text-warning',
                          pwdStrength.color === 'bg-success' && 'text-success'
                        )}
                      >
                        {pwdStrength.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-sm font-medium text-text-primary">
                  Confirm Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" aria-hidden="true" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    placeholder="Repeat your password"
                    error={errors.confirmPassword}
                    className="pl-9 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="button" onClick={handleNext} className="w-full" size="lg">
                Continue
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}

          {/* Step 2: Organization */}
          {step === 'organization' && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <h2 className="text-xl font-semibold tracking-heading text-text-primary">
                  Set up your organization
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  Your organization holds your portfolios and team
                </p>
              </div>

              {/* Org name */}
              <div className="space-y-1.5">
                <label htmlFor="org-name" className="text-sm font-medium text-text-primary">
                  Organization Name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" aria-hidden="true" />
                  <Input
                    id="org-name"
                    value={formData.org_name}
                    onChange={(e) => updateField('org_name', e.target.value)}
                    placeholder="e.g., Smith Family Office"
                    error={errors.org_name}
                    className="pl-9"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Org slug */}
              <div className="space-y-1.5">
                <label htmlFor="org-slug" className="text-sm font-medium text-text-primary">
                  Organization Slug <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" aria-hidden="true" />
                  <Input
                    id="org-slug"
                    value={formData.org_slug}
                    onChange={(e) => updateField('org_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="smith-family-office"
                    error={errors.org_slug}
                    className="pl-9 font-mono"
                    pattern="[a-z0-9-]+"
                    required
                  />
                </div>
                <p className="text-xs text-text-muted">
                  Used in URLs. Only lowercase letters, numbers, and hyphens.
                </p>
              </div>

              {/* Plan selection (simplified) */}
              <div className="p-4 rounded-lg bg-surface-muted border border-border">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-brand-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-brand-gold text-sm font-bold">★</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Starting with Free Plan</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Up to 5 portfolios · 1 user · Core analytics
                    </p>
                    <p className="text-xs text-brand-primary mt-1 font-medium">
                      Upgrade anytime from Settings
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('account')}
                  className="flex-1"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
                <Button type="submit" loading={isRegistering} className="flex-1" size="lg">
                  Create Account
                </Button>
              </div>
            </form>
          )}

          {/* Login link */}
          <p className="text-center text-sm text-text-muted mt-4">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-brand-primary hover:text-brand-primary-hover transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          By creating an account, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  )
}
