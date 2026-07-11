'use client'

import { useMemo, useState } from 'react'
import { GitFork, Building2, Landmark, Briefcase, Users, PieChart } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'

// ─── Demo ownership structure ─────────────────────────────────────────────────
// A typical single-family-office entity hierarchy. Edges carry ownership
// percentages; effective exposure = product of percentages along the path.

type EntityKind = 'trust' | 'holdco' | 'entity' | 'portfolio'

interface OwnershipNode {
  id: string
  name: string
  kind: EntityKind
  value: number // direct AUM/value held at this node, USD
}

interface OwnershipEdge {
  from: string
  to: string
  pct: number // 0–100
}

const NODES: OwnershipNode[] = [
  { id: 'trust', name: 'Whitmore Family Trust', kind: 'trust', value: 0 },
  { id: 'holdco', name: 'Whitmore Holdings LLC', kind: 'holdco', value: 0 },
  { id: 'foundation', name: 'Whitmore Foundation', kind: 'entity', value: 12_500_000 },
  { id: 'realestate', name: 'WH Real Estate LP', kind: 'entity', value: 38_000_000 },
  { id: 'ventures', name: 'WH Ventures LLC', kind: 'entity', value: 21_000_000 },
  { id: 'growth', name: 'Growth Fund', kind: 'portfolio', value: 44_000_000 },
  { id: 'balanced', name: 'Balanced 60/40', kind: 'portfolio', value: 61_500_000 },
  { id: 'alts', name: 'Alternatives', kind: 'portfolio', value: 18_200_000 },
]

const EDGES: OwnershipEdge[] = [
  { from: 'trust', to: 'holdco', pct: 100 },
  { from: 'trust', to: 'foundation', pct: 100 },
  { from: 'holdco', to: 'realestate', pct: 85 },
  { from: 'holdco', to: 'ventures', pct: 60 },
  { from: 'holdco', to: 'growth', pct: 100 },
  { from: 'holdco', to: 'balanced', pct: 100 },
  { from: 'ventures', to: 'alts', pct: 75 },
]

const KIND_META: Record<EntityKind, { label: string; Icon: typeof Landmark; color: string }> = {
  trust: { label: 'Trust', Icon: Landmark, color: 'text-brand-primary' },
  holdco: { label: 'Holding Co', Icon: Building2, color: 'text-accent-text' },
  entity: { label: 'Entity', Icon: Users, color: 'text-info-text' },
  portfolio: { label: 'Portfolio', Icon: Briefcase, color: 'text-success-text' },
}

// ─── Layout: simple layered tree ──────────────────────────────────────────────

const NODE_W = 190
const NODE_H = 64
const LEVEL_GAP = 110
const PADDING = 24

interface PositionedNode extends OwnershipNode {
  x: number
  y: number
  depth: number
}

function useGraphLayout() {
  return useMemo(() => {
    // Depth = longest path from root
    const depthOf = new Map<string, number>()
    const inbound = new Map<string, OwnershipEdge[]>()
    EDGES.forEach((e) => {
      inbound.set(e.to, [...(inbound.get(e.to) ?? []), e])
    })
    const resolveDepth = (id: string): number => {
      if (depthOf.has(id)) return depthOf.get(id)!
      const parents = inbound.get(id) ?? []
      const d = parents.length === 0 ? 0 : Math.max(...parents.map((e) => resolveDepth(e.from))) + 1
      depthOf.set(id, d)
      return d
    }
    NODES.forEach((n) => resolveDepth(n.id))

    // Group by depth, spread horizontally
    const byDepth = new Map<number, OwnershipNode[]>()
    NODES.forEach((n) => {
      const d = depthOf.get(n.id)!
      byDepth.set(d, [...(byDepth.get(d) ?? []), n])
    })
    const maxPerLevel = Math.max(...[...byDepth.values()].map((l) => l.length))
    const width = Math.max(760, maxPerLevel * (NODE_W + 40) + PADDING * 2)
    const depths = [...byDepth.keys()].sort((a, b) => a - b)
    const height = depths.length * (NODE_H + LEVEL_GAP) - LEVEL_GAP + PADDING * 2

    const positioned = new Map<string, PositionedNode>()
    depths.forEach((d) => {
      const level = byDepth.get(d)!
      const totalW = level.length * NODE_W + (level.length - 1) * 40
      const startX = (width - totalW) / 2
      level.forEach((n, i) => {
        positioned.set(n.id, {
          ...n,
          depth: d,
          x: startX + i * (NODE_W + 40),
          y: PADDING + d * (NODE_H + LEVEL_GAP),
        })
      })
    })

    // Effective ownership from root: product of pct along path (max over paths)
    const effective = new Map<string, number>()
    const resolveEff = (id: string): number => {
      if (effective.has(id)) return effective.get(id)!
      const parents = inbound.get(id) ?? []
      const eff =
        parents.length === 0
          ? 100
          : Math.max(...parents.map((e) => (resolveEff(e.from) * e.pct) / 100))
      effective.set(id, eff)
      return eff
    }
    NODES.forEach((n) => resolveEff(n.id))

    return { positioned, width, height, effective }
  }, [])
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OwnershipPage() {
  const { positioned, width, height, effective } = useGraphLayout()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? positioned.get(selectedId) : null

  const totalExposure = useMemo(
    () =>
      NODES.reduce((sum, n) => sum + (n.value * (effective.get(n.id) ?? 0)) / 100, 0),
    [effective]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ownership Graph"
        description="Entity hierarchy and effective exposure (demo structure)"
        actions={<Badge variant="secondary">Demo data</Badge>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Graph canvas */}
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GitFork className="size-4 text-text-muted" aria-hidden="true" />
                Entity Hierarchy
              </CardTitle>
              <span className="text-xs text-text-muted">Click a node for details</span>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full min-w-[700px]"
              style={{ height: Math.min(height, 560) }}
              role="img"
              aria-label="Ownership hierarchy graph"
            >
              {/* Edges */}
              {EDGES.map((e) => {
                const from = positioned.get(e.from)!
                const to = positioned.get(e.to)!
                const x1 = from.x + NODE_W / 2
                const y1 = from.y + NODE_H
                const x2 = to.x + NODE_W / 2
                const y2 = to.y
                const midY = (y1 + y2) / 2
                return (
                  <g key={`${e.from}-${e.to}`}>
                    <path
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      fill="none"
                      stroke="var(--border-strong)"
                      strokeWidth={1.5}
                    />
                    <rect
                      x={(x1 + x2) / 2 - 21}
                      y={midY - 10}
                      width={42}
                      height={18}
                      rx={9}
                      fill="var(--surface-muted)"
                      stroke="var(--border)"
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={midY + 3}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill="var(--text-secondary)"
                    >
                      {e.pct}%
                    </text>
                  </g>
                )
              })}

              {/* Nodes */}
              {[...positioned.values()].map((n) => {
                const isSelected = n.id === selectedId
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    onClick={() => setSelectedId(n.id === selectedId ? null : n.id)}
                    className="cursor-pointer"
                    role="button"
                    aria-label={`${n.name}, ${KIND_META[n.kind].label}`}
                  >
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={10}
                      fill={isSelected ? 'var(--brand-primary-subtle)' : 'var(--surface-elevated)'}
                      stroke={isSelected ? 'var(--brand-primary)' : 'var(--border)'}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <text x={14} y={26} fontSize={12.5} fontWeight={600} fill="var(--text-primary)">
                      {n.name.length > 24 ? `${n.name.slice(0, 23)}…` : n.name}
                    </text>
                    <text x={14} y={46} fontSize={10.5} fill="var(--text-muted)">
                      {KIND_META[n.kind].label}
                      {n.value > 0 ? ` · ${formatCurrency(n.value)}` : ''}
                    </text>
                  </g>
                )
              })}
            </svg>
          </CardContent>
        </Card>

        {/* Details panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="size-4 text-text-muted" aria-hidden="true" />
                {selected ? selected.name : 'Effective Exposure'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {selected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{KIND_META[selected.kind].label}</Badge>
                    <Badge variant="success">
                      {(effective.get(selected.id) ?? 0).toFixed(1)}% effective ownership
                    </Badge>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Direct value</dt>
                      <dd className="text-text-primary tabular-nums">
                        {selected.value > 0 ? formatCurrency(selected.value) : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Effective exposure</dt>
                      <dd className="text-text-primary tabular-nums">
                        {selected.value > 0
                          ? formatCurrency((selected.value * (effective.get(selected.id) ?? 0)) / 100)
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Owns</dt>
                      <dd className="text-text-primary">
                        {EDGES.filter((e) => e.from === selected.id).length} entit
                        {EDGES.filter((e) => e.from === selected.id).length === 1 ? 'y' : 'ies'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="space-y-2">
                  {NODES.filter((n) => n.value > 0).map((n) => {
                    const eff = effective.get(n.id) ?? 0
                    const exposure = (n.value * eff) / 100
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setSelectedId(n.id)}
                        className={cn(
                          'w-full flex items-center justify-between py-2 px-2 rounded-lg text-left',
                          'hover:bg-surface-muted transition-colors duration-[120ms]'
                        )}
                      >
                        <span className="text-sm text-text-primary truncate">{n.name}</span>
                        <span className="text-sm text-text-secondary tabular-nums flex-shrink-0 ml-2">
                          {formatCurrency(exposure)}
                        </span>
                      </button>
                    )
                  })}
                  <div className="border-t border-border pt-2 flex items-center justify-between px-2">
                    <span className="text-sm font-semibold text-text-primary">Total exposure</span>
                    <span className="text-sm font-semibold text-text-primary tabular-nums">
                      {formatCurrency(totalExposure)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Legend</CardTitle>
            </CardHeader>
            <CardContent className="pt-1 space-y-2">
              {(Object.keys(KIND_META) as EntityKind[]).map((kind) => {
                const { label, Icon, color } = KIND_META[kind]
                return (
                  <div key={kind} className="flex items-center gap-2.5">
                    <Icon className={cn('size-4', color)} aria-hidden="true" />
                    <span className="text-sm text-text-secondary">{label}</span>
                  </div>
                )
              })}
              <p className="text-xs text-text-muted pt-1">
                Edge labels show direct ownership. Effective exposure multiplies percentages along
                the chain from the family trust.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
