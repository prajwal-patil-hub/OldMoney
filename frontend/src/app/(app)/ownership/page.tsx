import { GitFork, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'

const FEATURE_LIST = [
  'Recursive ownership traversal via CTEs',
  'Effective exposure rollup calculations',
  'Visual node-edge graph (D3 / React Flow)',
  'Cross-entity position aggregation',
] as const

export default function OwnershipPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Ownership Graph"
        description="Visualize entity hierarchies and indirect exposure"
      />

      {/* Dashed border placeholder container */}
      <div className="flex-1 rounded-xl border-2 border-dashed border-border flex items-center justify-center py-16 px-8">
        <div className="flex flex-col items-center text-center max-w-sm">
          <GitFork
            className="size-12 text-text-muted mb-6"
            aria-hidden="true"
          />

          <h2 className="font-display text-2xl text-text-primary tracking-tight mb-3">
            Ownership Graph
          </h2>

          <p className="text-sm text-text-muted max-w-xs text-center mb-8 leading-relaxed">
            Interactive entity hierarchy visualization with indirect exposure rollups. Coming in
            Phase 2.
          </p>

          {/* Feature list */}
          <ul className="text-sm text-text-secondary text-left space-y-2 mb-8 self-stretch">
            {FEATURE_LIST.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span
                  className="text-accent-text text-xs leading-[1.4] shrink-0 select-none"
                  aria-hidden="true"
                >
                  ✦
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a
              href="/docs/adr/0001-phase1-foundation.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Architecture Decision
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
