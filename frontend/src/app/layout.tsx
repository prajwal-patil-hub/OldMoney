import type { Metadata, Viewport } from 'next'
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  weight: ['400', '600'],
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
  weight: ['400', '700'],
  axes: ['opsz'], // optical size axis for crisp KPI numbers at large sizes
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: false, // non-critical — only used in data cells and code blocks
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: {
    default: 'OldMoney — Wealth Intelligence',
    template: '%s | OldMoney',
  },
  description: 'Local-first wealth intelligence platform for discerning investors.',
  keywords: ['wealth management', 'portfolio tracking', 'investment analytics', 'family office'],
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF6F1' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0A09' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Inline theme init prevents FOUC on dark mode — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = JSON.parse(localStorage.getItem('oldmoney-ui') || '{}')?.state?.theme
                if (theme === 'dark') document.documentElement.classList.add('dark')
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-md)',
                borderRadius: 'var(--radius-lg)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
