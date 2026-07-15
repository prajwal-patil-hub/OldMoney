'use client'

import { useEffect, useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImportWizard, type ImportOutcome } from '@/components/forms/ImportWizard'
import { formatRelativeTime } from '@/lib/utils'

interface ImportRecord {
  id: string
  file_name: string
  target: string
  imported: number
  skipped: number
  errors: number
  completed_at: string
  status: 'completed' | 'failed'
}

const HISTORY_KEY = 'oldmoney-import-history'

export default function ImportsPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [history, setHistory] = useState<ImportRecord[]>([])

  // The backend has no import-jobs table; persist a lightweight local history
  // so a completed import survives page refreshes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch {
      // ignore malformed/absent history
    }
  }, [])

  function handleComplete(outcome?: ImportOutcome) {
    setWizardOpen(false)
    if (!outcome) return
    const record: ImportRecord = {
      id: `${Date.now()}`,
      file_name: outcome.file_name,
      target: outcome.target,
      imported: outcome.imported,
      skipped: outcome.skipped,
      errors: outcome.errors,
      completed_at: new Date().toISOString(),
      status: outcome.errors > 0 && outcome.imported === 0 ? 'failed' : 'completed',
    }
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, 25)
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {
        // storage full / unavailable — history stays in-memory only
      }
      return next
    })
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="size-4 text-success" />
      default: return <AlertCircle className="size-4 text-danger" />
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        description="Import transactions from CSV, Excel, or brokerage exports"
        actions={
          <Button onClick={() => setWizardOpen(true)}>
            <Upload className="size-4" aria-hidden="true" />
            New Import
          </Button>
        }
      />

      {/* Supported formats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: FileText, title: 'CSV Files', description: 'Generic transaction exports from any broker' },
          { icon: FileText, title: 'Excel Files', description: 'XLSX and XLS spreadsheet formats' },
          { icon: FileText, title: 'Auto-mapping', description: 'Smart column detection and mapping' },
        ].map((item, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
                <item.icon className="size-4 text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Import history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import History</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Upload className="size-10 text-text-muted" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-text-primary">No imports yet</p>
                <p className="text-xs text-text-muted mt-1">Start by importing your first transaction file.</p>
              </div>
              <Button onClick={() => setWizardOpen(true)} variant="secondary" size="sm">
                <Upload className="size-4" />
                Import Now
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((job) => (
                <div key={job.id} className="flex items-center gap-4 py-4">
                  <div className="flex-shrink-0" aria-hidden="true">{statusIcon(job.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{job.file_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-muted capitalize">{job.target}</span>
                      <span className="text-xs text-text-muted">
                        {job.imported} imported
                        {job.skipped > 0 && `, ${job.skipped} skipped`}
                        {job.errors > 0 && `, ${job.errors} errors`}
                      </span>
                      <span className="text-xs text-text-muted">
                        {formatRelativeTime(job.completed_at)}
                      </span>
                    </div>
                  </div>
                  <Badge variant={job.status === 'completed' ? 'success' : 'danger'}>
                    {job.status === 'completed' ? 'Completed' : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="!max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
          </DialogHeader>
          <ImportWizard onComplete={handleComplete} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
