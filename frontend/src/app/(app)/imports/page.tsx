'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { importsApi } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ImportWizard } from '@/components/forms/ImportWizard'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { STALE_TIME } from '@/lib/constants'

export default function ImportsPage() {
  const router = useRouter()
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data: importsData, isLoading, refetch } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importsApi.list().then((r) => r.data),
    staleTime: STALE_TIME.SHORT,
  })

  const imports = importsData?.items ?? []

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="size-4 text-success" />
      case 'failed': return <AlertCircle className="size-4 text-danger" />
      case 'processing': return <Clock className="size-4 text-warning animate-spin" />
      default: return <Clock className="size-4 text-text-muted" />
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completed</Badge>
      case 'failed': return <Badge variant="danger">Failed</Badge>
      case 'processing': return <Badge variant="warning">Processing</Badge>
      default: return <Badge variant="secondary">Pending</Badge>
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
          {
            icon: FileText,
            title: 'CSV Files',
            description: 'Generic transaction exports from any broker',
          },
          {
            icon: FileText,
            title: 'Excel Files',
            description: 'XLSX and XLS spreadsheet formats',
          },
          {
            icon: FileText,
            title: 'Auto-mapping',
            description: 'Smart column detection and mapping',
          },
        ].map((item, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
                <item.icon className="size-4 text-brand-gold" aria-hidden="true" />
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Import History</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : imports.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Upload className="size-10 text-text-muted" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-text-primary">No imports yet</p>
                <p className="text-xs text-text-muted mt-1">
                  Start by importing your first transaction file.
                </p>
              </div>
              <Button onClick={() => setWizardOpen(true)} variant="secondary" size="sm">
                <Upload className="size-4" />
                Import Now
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {imports.map((job) => (
                <div key={job.id} className="flex items-center gap-4 py-4">
                  <div className="flex-shrink-0" aria-hidden="true">
                    {statusIcon(job.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {job.file_name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-muted">
                        {formatRelativeTime(job.created_at)}
                      </span>
                      {job.status === 'completed' && (
                        <span className="text-xs text-text-muted">
                          {job.imported_rows} imported
                          {job.error_rows > 0 && `, ${job.error_rows} errors`}
                        </span>
                      )}
                      {job.status === 'processing' && (
                        <span className="text-xs text-text-muted">
                          {job.imported_rows}/{job.total_rows} rows...
                        </span>
                      )}
                    </div>
                  </div>
                  {statusBadge(job.status)}
                  {job.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWizardOpen(true)}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import wizard dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="!max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Transactions</DialogTitle>
          </DialogHeader>
          <ImportWizard
            onComplete={() => {
              setWizardOpen(false)
              router.push('/transactions')
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
