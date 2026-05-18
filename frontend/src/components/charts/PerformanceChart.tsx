'use client'

import { useMemo } from 'react'
import { ReactECharts, chartTheme } from './ChartWrapper'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { TimeSeriesPoint } from '@/types/api'
import type { EChartsOption } from 'echarts'

interface PerformanceChartProps {
  data: TimeSeriesPoint[]
  loading?: boolean
  height?: number
  currency?: string
  showGrid?: boolean
}

export function PerformanceChart({
  data,
  loading = false,
  height = 280,
  currency = 'USD',
  showGrid = true,
}: PerformanceChartProps) {
  const option = useMemo((): EChartsOption => {
    const dates = data.map((d) => formatDate(d.date, 'MMM d'))
    const values = data.map((d) => d.value)

    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const startValue = values[0] ?? 0
    const endValue = values[values.length - 1] ?? 0
    const isPositive = endValue >= startValue
    const lineColor = isPositive ? '#2D6A4F' : '#7C2220'
    const fillColorStart = isPositive ? 'rgba(45,106,79,0.15)' : 'rgba(124,34,32,0.15)'
    const fillColorEnd = 'rgba(255,255,255,0)'

    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...chartTheme.tooltip,
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'var(--border-strong)',
            width: 1,
            type: 'dashed',
          },
        },
        formatter: (params: unknown) => {
          const paramsArr = params as Array<{ name: string; value: number }>
          const point = paramsArr[0]
          if (!point) return ''
          return `<div style="padding:4px 0">
            <div style="color:var(--text-muted);font-size:11px;margin-bottom:4px">${point.name}</div>
            <div style="font-weight:600;font-size:14px;color:var(--text-primary)">${formatCurrency(point.value, currency)}</div>
          </div>`
        },
      },
      grid: {
        left: 16,
        right: 16,
        top: 16,
        bottom: showGrid ? 36 : 8,
        containLabel: showGrid,
      },
      xAxis: {
        type: 'category',
        data: dates,
        show: showGrid,
        axisLabel: {
          color: 'var(--text-muted)' as string,
          fontSize: 11,
          interval: Math.floor(dates.length / 6),
          rotate: 0,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        show: showGrid,
        min: minValue * 0.995,
        max: maxValue * 1.005,
        axisLabel: {
          color: 'var(--text-muted)' as string,
          fontSize: 11,
          formatter: (value: number) => formatCurrency(value, currency),
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: showGrid,
          lineStyle: {
            color: 'var(--border)' as string,
            type: 'dashed',
            opacity: 0.5,
          },
        },
      },
      series: [
        {
          type: 'line',
          data: values,
          smooth: 0.4,
          symbol: 'none',
          lineStyle: {
            color: lineColor,
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
                { offset: 0, color: fillColorStart },
                { offset: 1, color: fillColorEnd },
              ],
            },
          },
          emphasis: {
            focus: 'series',
          },
        },
      ],
    }
  }, [data, currency, showGrid])

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
