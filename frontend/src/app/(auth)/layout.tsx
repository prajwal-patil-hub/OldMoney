import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, rgba(124, 34, 32, 0.06) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(159, 105, 32, 0.05) 0%, transparent 50%)
        `,
      }}
    >
      {/* Subtle diagonal line texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        aria-hidden="true"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 10px,
            var(--text-primary) 10px,
            var(--text-primary) 11px
          )`,
        }}
      />

      {/* Brand mark */}
      <div className="relative mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary shadow-card mb-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-6 h-6 text-text-inverse"
            aria-hidden="true"
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          className="text-2xl font-bold text-text-primary tracking-tight"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          OldMoney
        </span>
        <span className="text-xs text-text-muted tracking-widest uppercase">
          Wealth Intelligence
        </span>
      </div>

      {/* Content area */}
      <div className="relative w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="relative mt-8 text-xs text-text-muted text-center">
        &copy; {new Date().getFullYear()} OldMoney. All rights reserved.
      </p>
    </div>
  )
}
