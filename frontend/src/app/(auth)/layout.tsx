import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Sign in — OldMoney',
    template: '%s — OldMoney',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — editorial luxury moment, hidden below lg */}
      <div className="hidden lg:flex lg:w-2/5 flex-col bg-surface-muted border-r border-border">
        <div className="flex-1 flex flex-col justify-center px-12">
          {/* Wordmark */}
          <div>
            <h1 className="font-display text-4xl font-bold text-text-primary tracking-tighter leading-none">
              OldMoney
            </h1>
            <p className="font-display italic text-lg text-text-muted mt-3 leading-snug">
              Wealth intelligence, refined.
            </p>
          </div>

          {/* Feature callouts */}
          <ul className="mt-12 space-y-3" aria-label="Platform features">
            {[
              'Multi-asset portfolio analytics',
              'AI-powered insights',
              'Institutional-grade reporting',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <span className="text-accent-text text-xs leading-none select-none" aria-hidden="true">
                  ✦
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom security note */}
        <div className="px-12 pb-10">
          <p className="text-xs text-text-muted">
            Secure · Local-first · No data leaves your machine
          </p>
        </div>
      </div>

      {/* Right panel — full width on mobile, w-3/5 on lg */}
      <div className="flex-1 lg:w-3/5 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
