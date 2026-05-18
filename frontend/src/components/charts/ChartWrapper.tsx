'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// SSR-safe ECharts wrapper
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full min-h-[200px]" />,
})

export { ReactECharts }

// Base chart theme options matching our design system
export const chartTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    color: 'var(--text-secondary)',
    fontSize: 12,
  },
  color: [
    '#7C2220', // brand-primary
    '#854023', // brand-secondary
    '#9F6920', // brand-gold
    '#DAA755', // brand-gold-light
    '#2D6A4F', // success
    '#1B4965', // info
    '#6C5141', // text-secondary
    '#A28C75', // text-muted
    '#3D2820', // border-dark
    '#5C3A2E', // border-strong-dark
  ],
  axisLine: {
    lineStyle: {
      color: 'var(--border)',
    },
  },
  splitLine: {
    lineStyle: {
      color: 'var(--border)',
      opacity: 0.6,
    },
  },
  tooltip: {
    backgroundColor: 'var(--surface-elevated)',
    borderColor: 'var(--border)',
    borderWidth: 1,
    textStyle: {
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      fontSize: 12,
    },
    extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(26,15,12,0.12);',
  },
}
