'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import type { EChartsOption } from 'echarts'

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full min-h-[200px]" />,
})

export interface PerformanceChartProps {
  data: { date: string; value: number }[]
  loading?: boolean
  height?: number
  grain?: '1W' | '1M' | '3M' | 'YTD' | '1Y'
}

export function PerformanceChart({
  data,
  loading = false,
  height = 280,
}: PerformanceChartProps) {
  const option = useMemo((): EChartsOption => {
    const ACCENT = 'oklch(49% 0.116 60)'
    const ACCENT_AREA_TOP = 'oklch(49% 0.116 60 / 0.15)'
    const ACCENT_AREA_BOTTOM = 'oklch(49% 0.116 60 / 0)'

    const seriesData = data.map((d) => [d.date, d.value])

    return {
      backgroundColor: 'transparent',
      grid: {
        left: 0,
        right: 0,
        top: 8,
        bottom: 0,
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: 'var(--text-muted)',
          fontSize: 11,
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
        },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: 'var(--text-muted)',
          fontSize: 11,
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
          formatter: (value: number) => formatCurrency(value),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'var(--border)',
            type: 'dashed',
            width: 1,
          },
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
        borderWidth: 1,
        extraCssText:
          'border-radius: 8px; box-shadow: var(--shadow-md); font-family: var(--font-mono), "JetBrains Mono", monospace;',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'var(--border-strong)',
            width: 1,
            type: 'dashed',
          },
        },
        formatter: (params: unknown) => {
          const arr = params as Array<{ name: string; value: [string, number] }>
          const pt = arr[0]
          if (!pt) return ''
          const dateStr = new Date(pt.value[0]).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
          return `<div style="padding:4px 0">
            <div style="color:var(--text-muted);font-size:11px;margin-bottom:4px">${dateStr}</div>
            <div style="font-weight:600;font-size:13px;color:var(--text-primary)">${formatCurrency(pt.value[1])}</div>
          </div>`
        },
      },
      series: [
        {
          type: 'line',
          data: seriesData,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: ACCENT,
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: ACCENT_AREA_TOP },
                { offset: 1, color: ACCENT_AREA_BOTTOM },
              ],
            },
          },
          emphasis: { focus: 'series' },
        },
      ],
    }
  }, [data])

  if (loading) {
    return <Skeleton style={{ height }} className="w-full rounded-lg" />
  }

  if (!data.length) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-text-muted"
      >
        No performance data available
      </div>
    )
  }

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
      lazyUpdate
    />
  )
}
