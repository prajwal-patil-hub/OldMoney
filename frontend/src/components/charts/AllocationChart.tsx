'use client'

import { useMemo } from 'react'
import { ReactECharts, chartTheme } from './ChartWrapper'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatPct } from '@/lib/utils'
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/lib/constants'
import type { AllocationBreakdown } from '@/types/portfolio'
import type { EChartsOption } from 'echarts'

interface AllocationChartProps {
  data: AllocationBreakdown[]
  loading?: boolean
  height?: number
  currency?: string
  showLegend?: boolean
}

export function AllocationChart({
  data,
  loading = false,
  height = 280,
  currency = 'USD',
  showLegend = true,
}: AllocationChartProps) {
  const option = useMemo((): EChartsOption => {
    const seriesData = data.map((item) => ({
      name: ASSET_TYPE_LABELS[item.asset_type] ?? item.asset_type,
      value: item.value,
      weight: item.weight,
      itemStyle: {
        color: ASSET_TYPE_COLORS[item.asset_type] ?? chartTheme.color[0],
        borderColor: 'var(--surface)',
        borderWidth: 2,
        borderRadius: 4,
      },
    }))

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as {
            name: string
            value: number
            percent: number
            data: { weight: number }
          }
          return `<div style="padding:4px 0">
            <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px">${p.name}</div>
            <div style="color:var(--text-secondary);font-size:12px">${formatCurrency(p.value, currency)}</div>
            <div style="color:var(--text-muted);font-size:11px;margin-top:2px">${formatPct(p.data.weight * 100)} of portfolio</div>
          </div>`
        },
      },
      legend: showLegend
        ? {
            orient: 'vertical',
            right: '0%',
            top: 'middle',
            textStyle: {
              color: 'var(--text-secondary)' as string,
              fontSize: 12,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            },
            itemWidth: 10,
            itemHeight: 10,
            icon: 'circle',
            formatter: (name: string) => {
              const item = data.find(
                (d) => (ASSET_TYPE_LABELS[d.asset_type] ?? d.asset_type) === name
              )
              if (!item) return name
              return `{name|${name}} {pct|${formatPct(item.weight * 100)}}`
            },
            rich: {
              name: { color: 'var(--text-secondary)', fontSize: 12 },
              pct: {
                color: 'var(--text-muted)',
                fontSize: 11,
                padding: [0, 0, 0, 8],
              },
            },
          }
        : undefined,
      series: [
        {
          type: 'pie',
          radius: showLegend ? ['52%', '78%'] : ['48%', '76%'],
          center: showLegend ? ['35%', '50%'] : ['50%', '50%'],
          avoidLabelOverlap: false,
          padAngle: 2,
          data: seriesData,
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          emphasis: {
            scale: true,
            scaleSize: 4,
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(26,15,12,0.15)',
            },
          },
          animationType: 'scale',
          animationEasing: 'elasticOut',
        },
      ],
    }
  }, [data, currency, showLegend])

  if (loading) {
    return <Skeleton style={{ height }} className="w-full rounded-lg" />
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
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
      lazyUpdate
    />
  )
}
