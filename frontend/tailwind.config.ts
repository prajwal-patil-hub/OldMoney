import type { Config } from 'tailwindcss'

/**
 * OldMoney Tailwind Config
 * All colors reference CSS custom properties from src/styles/tokens.css
 * Values use OKLCH color space — never hard-coded hex here.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    // ── Override defaults where we want full control ──
    borderRadius: {
      none:   '0px',
      xs:     'var(--radius-xs)',     // 2px
      sm:     'var(--radius-sm)',     // 4px
      DEFAULT:'var(--radius-md)',     // 6px  ← `rounded` maps here
      md:     'var(--radius-md)',     // 6px
      lg:     'var(--radius-lg)',     // 10px
      xl:     'var(--radius-xl)',     // 14px
      full:   '9999px',
    },
    fontFamily: {
      display: ['var(--font-display)', 'Georgia', 'serif'],
      sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
      mono:    ['var(--font-mono)', 'Fira Code', 'monospace'],
    },
    fontSize: {
      '2xs': ['0.6875rem',  { lineHeight: '1rem',    letterSpacing: '0.01em' }],  // 11px
      xs:    ['0.75rem',    { lineHeight: '1.125rem', letterSpacing: '0.01em' }],  // 12px
      sm:    ['0.8125rem',  { lineHeight: '1.25rem',  letterSpacing: '0em'    }],  // 13px
      base:  ['0.875rem',   { lineHeight: '1.375rem', letterSpacing: '0em'    }],  // 14px
      md:    ['1rem',       { lineHeight: '1.5rem',   letterSpacing: '0em'    }],  // 16px
      lg:    ['1.125rem',   { lineHeight: '1.5rem',   letterSpacing: '-0.01em'}],  // 18px
      xl:    ['1.25rem',    { lineHeight: '1.625rem', letterSpacing: '-0.01em'}],  // 20px
      '2xl': ['1.5rem',     { lineHeight: '1.75rem',  letterSpacing: '-0.02em'}],  // 24px
      '3xl': ['1.875rem',   { lineHeight: '2rem',     letterSpacing: '-0.02em'}],  // 30px
      '4xl': ['2.25rem',    { lineHeight: '2.375rem', letterSpacing: '-0.03em'}],  // 36px
      '5xl': ['3rem',       { lineHeight: '3.125rem', letterSpacing: '-0.03em'}],  // 48px
    },
    extend: {
      // ── Colors — every value is a CSS variable ──
      colors: {
        // Surfaces
        background:           'var(--background)',
        surface:              'var(--surface)',
        'surface-elevated':   'var(--surface-elevated)',
        'surface-muted':      'var(--surface-muted)',
        'surface-inset':      'var(--surface-inset)',
        'surface-overlay':    'var(--surface-overlay)',

        // Borders
        border:               'var(--border)',
        'border-strong':      'var(--border-strong)',
        'border-subtle':      'var(--border-subtle)',

        // Text
        'text-primary':       'var(--text-primary)',
        'text-secondary':     'var(--text-secondary)',
        'text-muted':         'var(--text-muted)',
        'text-placeholder':   'var(--text-placeholder)',
        'text-inverse':       'var(--text-inverse)',
        'text-disabled':      'var(--text-disabled)',

        // Brand (Falu Red family)
        'brand-primary':      'var(--brand-primary)',
        'brand-hover':        'var(--brand-primary-hover)',
        'brand-active':       'var(--brand-primary-active)',
        'brand-subtle':       'var(--brand-primary-subtle)',
        'brand-muted':        'var(--brand-primary-muted)',

        // Accent (Gold family)
        accent:               'var(--accent)',
        'accent-hover':       'var(--accent-hover)',
        'accent-subtle':      'var(--accent-subtle)',
        'accent-text':        'var(--accent-text)',

        // Semantic
        success:              'var(--success)',
        'success-text':       'var(--success-text)',
        'success-bg':         'var(--success-bg)',
        'success-border':     'var(--success-border)',
        warning:              'var(--warning)',
        'warning-text':       'var(--warning-text)',
        'warning-bg':         'var(--warning-bg)',
        danger:               'var(--danger)',
        'danger-text':        'var(--danger-text)',
        'danger-bg':          'var(--danger-bg)',
        info:                 'var(--info)',
        'info-text':          'var(--info-text)',
        'info-bg':            'var(--info-bg)',

        // Financial
        positive:             'var(--positive)',
        'positive-subtle':    'var(--positive-subtle)',
        negative:             'var(--negative)',
        'negative-subtle':    'var(--negative-subtle)',
      },

      // ── Spacing — direct 4px grid ──
      spacing: {
        px:    '1px',
        '0.5': '2px',
        1:     '4px',
        1.5:   '6px',
        2:     '8px',
        2.5:   '10px',
        3:     '12px',
        3.5:   '14px',
        4:     '16px',
        5:     '20px',
        6:     '24px',
        7:     '28px',
        8:     '32px',
        9:     '36px',
        10:    '40px',
        11:    '44px',
        12:    '48px',
        14:    '56px',
        16:    '64px',
        18:    '72px',
        20:    '80px',
        24:    '96px',
        28:    '112px',
        32:    '128px',
        sidebar:        'var(--sidebar-width)',
        'sidebar-sm':   'var(--sidebar-collapsed-width)',
        topbar:         'var(--topbar-height)',
        'detail-panel': 'var(--detail-panel-width)',
      },

      // ── Shadows ──
      boxShadow: {
        xs:       'var(--shadow-xs)',
        sm:       'var(--shadow-sm)',
        DEFAULT:  'var(--shadow-sm)',
        md:       'var(--shadow-md)',
        lg:       'var(--shadow-lg)',
        none:     'none',
        // focus ring is done via ring utilities
      },

      // ── Motion ──
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast:    'var(--duration-fast)',
        normal:  'var(--duration-normal)',
        slow:    'var(--duration-slow)',
        exit:    'var(--duration-exit)',
        120:     '120ms',
        140:     '140ms',
        180:     '180ms',
        240:     '240ms',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        decel:    'var(--ease-decel)',
        accel:    'var(--ease-accel)',
        sharp:    'var(--ease-sharp)',
      },

      // ── Z-index scale ──
      zIndex: {
        below:    '-1',
        base:     '0',
        raised:   '10',
        dropdown: '20',
        sticky:   '30',
        overlay:  '40',
        modal:    '50',
        toast:    '60',
        tooltip:  '70',
      },

      // ── Layout ──
      maxWidth: {
        content: 'var(--content-max-width)',
      },
      height: {
        topbar:           'var(--topbar-height)',
        'table-compact':  'var(--table-row-height-compact)',
        'table-comfy':    'var(--table-row-height-comfortable)',
      },
      width: {
        sidebar:          'var(--sidebar-width)',
        'sidebar-sm':     'var(--sidebar-collapsed-width)',
        'detail-panel':   'var(--detail-panel-width)',
      },

      // ── Keyframes & animations ──
      keyframes: {
        // Page entry
        'page-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        // Skeleton shimmer (low-contrast)
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0'  },
        },
        // Toast slide in from right
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-out': {
          from: { opacity: '1', transform: 'translateX(0)' },
          to:   { opacity: '0', transform: 'translateX(8px)' },
        },
        // Dialog
        'dialog-in': {
          from: { opacity: '0', transform: 'scale(0.98) translateY(4px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'dialog-out': {
          from: { opacity: '1', transform: 'scale(1) translateY(0)' },
          to:   { opacity: '0', transform: 'scale(0.98) translateY(4px)' },
        },
        // Spin (loading)
        spin: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'page-in':    'page-in 150ms var(--ease-decel) both',
        shimmer:      'shimmer 1.4s linear infinite',
        'toast-in':   'toast-in 180ms var(--ease-decel) both',
        'toast-out':  'toast-out 140ms var(--ease-accel) both',
        'dialog-in':  'dialog-in 180ms var(--ease-decel) both',
        'dialog-out': 'dialog-out 140ms var(--ease-accel) both',
        spin:         'spin 600ms linear infinite',
      },

      // ── Typography utilities ──
      letterSpacing: {
        tighter: '-0.03em',
        tight:   '-0.02em',
        snug:    '-0.01em',
        normal:  '0em',
        wide:    '0.01em',
        wider:   '0.03em',
        caps:    '0.06em',
      },
      lineHeight: {
        display: '1.1',
        heading: '1.2',
        ui:      '1.4',
        body:    '1.5',
        relaxed: '1.6',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Utility plugin: .tabular-nums for financial data
    ({ addUtilities }: { addUtilities: (utils: Record<string, Record<string, string>>) => void }) => {
      addUtilities({
        '.tabular-nums': {
          'font-variant-numeric': 'tabular-nums',
          'font-feature-settings': '"tnum"',
        },
        '.slashed-zero': {
          'font-variant-numeric': 'slashed-zero tabular-nums',
        },
        '.lining-nums': {
          'font-variant-numeric': 'lining-nums tabular-nums',
        },
        '.text-display': {
          'font-family': 'var(--font-display)',
          'font-weight': '700',
          'letter-spacing': '-0.03em',
          'line-height': '1.1',
        },
        '.page-transition': {
          'animation': 'page-in 150ms var(--ease-decel) both',
        },
      })
    },
  ],
}

export default config
