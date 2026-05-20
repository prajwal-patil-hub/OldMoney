'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatPct, cn } from '@/lib/utils'
import { ASSET_TYPE_LABELS } from '@/lib/constants'
import type { AllocationBreakdown } from '@/types/portfolio'
import type { EChartsOption } from 'echarts'

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full min-h-[200px]" />,
})

export interface AllocationData {
  asset_type: AllocationBreakdown['asset_type']
  value: number
  weight: number
  count: number
}

export interface AllocationChartProps {
  data: AllocationData[]
  loading?: boolean
  height?: number
  currency?: string
  showLegend?: boolean
  onTypeClick?: (assetType: string | null) => void
}

// Old Money gold family + brand reds — ordered palette
const PALETTE = [
  'oklch(49% 0.116 60)',  // Golden Brown
  'oklch(28% 0.119 26)',  // Falu Red
  'oklch(62% 0.110 65)',  // Warm Gold
  'oklch(74% 0.099 73)',  // Rob Roy
  'oklch(37% 0.056 40)',  // Quincy
  'oklch(60% 0.116 52)',  // Raw Sienna
]

export function AllocationChart({
  data,
  loading = false,
  height = 280,
  currency: _currency,
  showLegend = true,
  onTypeClick,
}: AllocationChartProps) {
  const [activeType, setActiveType] = useState<string | null>(null)

  const totalValue = useMemo(
    () => data.reduce((sum, d) => sum + d.value, 0),
    [data]
  )

  const option = useMemo((): EChartsOption => {
    const seriesData = data.map((item, i) => ({
      name: ASSET_TYPE_LABELS[item.asset_type] ?? item.asset_type,
      value: item.value,
      _weight: item.weight,
      _type: item.asset_type,
      itemStyle: {
        color: PALETTE[i % PALETTE.length],
        borderColor: 'var(--surface)',
        borderWidth: 2,
        borderRadius: 4,
      },
    }))

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
        borderWidth: 1,
        extraCssText:
          'border-radius: 8px; box-shadow: var(--shadow-md); font-family: var(--font-mono), "JetBrains Mono", monospace;',
        formatter: (params: unknown) => {
          const p = params as {
            name: string
            value: number
            data: { _weight: number }
          }
          return `<div style="padding:4px 0">
            <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;font-family:var(--font-sans)">${p.name}</div>
            <div style="color:var(--text-secondary);font-size:12px">${formatCurrency(p.value)}</div>
            <div style="color:var(--text-muted);font-size:11px;margin-top:2px">${formatPct(p.data._weight * 100)} of portfolio</div>
          </div>`
        },
      },
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '38%',
          style: {
            text: formatCurrency(totalValue),
            fill: 'var(--text-primary)',
            fontSize: 20,
            fontFamily: 'var(--font-display), "Fraunces", Georgia, serif',
            fontWeight: 600,
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '52%',
          style: {
            text: 'Total AUM',
            fill: 'var(--text-muted)',
            fontSize: 12,
            fontFamily: 'var(--font-sans), "Inter", system-ui, sans-serif',
          },
        },
      ],
      series: [
        {
          type: 'pie',
          radius: ['52%', '75%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          padAngle: 2,
          data: seriesData,
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 4,
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'oklch(12% 0.028 38 / 0.15)',
            },
          },
          animationType: 'scale',
          animationEasing: 'elasticOut',
        },
      ],
    }
  }, [data, totalValue])

  const handleLegendClick = (type: string) => {
    const next = activeType === type ? null : type
    setActiveType(next)
    onTypeClick?.(next)
  }

  if (loading) {
    return (
      <div>
        <Skeleton style={{ height }} className="w-full rounded-lg" />
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-text-muted"
      >
        No allocation data available
      </div>
    )
  }

  return (
    <div>
      <ReactECharts
        option={option}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge
        lazyUpdate
      />

      {/* Custom legend rendered below chart */}
      {showLegend && <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((item, i) => {
          const label = ASSET_TYPE_LABELS[item.asset_type] ?? item.asset_type
          const color = PALETTE[i % PALETTE.length]
          const isActive = activeType === item.asset_type
          const isInactive = activeType !== null && !isActive
          return (
            <button
              key={item.asset_type}
              type="button"
              onClick={() => handleLegendClick(item.asset_type)}
              className={cn(
                'flex items-center gap-2 text-left rounded px-1.5 py-1 transition-colors duration-[120ms]',
                'hover:bg-surface-muted',
                isActive && 'bg-surface-muted',
                isInactive && 'opacity-40'
              )}
            >
              <span
                className="size-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="text-xs text-text-primary truncate flex-1">{label}</span>
              <span className="text-xs font-mono text-text-muted tabular-nums flex-shrink-0">
                {formatPct(item.weight * 100)}
              </span>
            </button>
          )
        })}
      </div>}
    </div>
  )
}
