'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Stepper } from '@/components/ui/stepper'
import { cn } from '@/lib/utils'
import { useImportPreview, useImportCommit } from '@/lib/hooks/useImports'
import type { ImportPreviewResponse, ImportCommitResponse } from '@/lib/hooks/useImports'
import { usePortfolios } from '@/lib/hooks/usePortfolios'

type WizardStep = 'upload' | 'preview' | 'done'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'preview', label: 'Preview' },
  { id: 'done', label: 'Import' },
]

const TARGET_OPTIONS = [
  { value: 'transactions', label: 'Transactions' },
  { value: 'holdings', label: 'Holdings' },
  { value: 'prices', label: 'Prices' },
]

export interface ImportOutcome {
  file_name: string
  target: string
  imported: number
  skipped: number
  errors: number
}

export function ImportWizard({
  onComplete,
}: {
  onComplete?: (outcome?: ImportOutcome) => void
}) {
  const [step, setStep] = useState<WizardStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [target, setTarget] = useState('transactions')
  const [portfolioId, setPortfolioId] = useState('')
  const [dateFormat, setDateFormat] = useState('%Y-%m-%d')
  const [skipRows, setSkipRows] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null)
  const [commitResult, setCommitResult] = useState<ImportCommitResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewMutation = useImportPreview()
  const commitMutation = useImportCommit()
  const { data: portfoliosData } = usePortfolios({ page_size: 100 })
  const portfolios = portfoliosData?.items ?? []
  // Prices are org-global; transactions/holdings land in a portfolio.
  const needsPortfolio = target !== 'prices'

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  const handlePreview = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }
    if (needsPortfolio && !portfolioId) {
      toast.error('Please select a target portfolio')
      return
    }
    try {
      const result = await previewMutation.mutateAsync({
        file, target, date_format: dateFormat, skip_rows: skipRows,
        portfolio_id: needsPortfolio ? portfolioId : undefined,
      })
      setPreviewData(result)
      setStep('preview')
    } catch {
      toast.error('Failed to preview file. Check the format and try again.')
    }
  }

  const handleCommit = async () => {
    if (!file) return
    try {
      const result = await commitMutation.mutateAsync({
        file, target, date_format: dateFormat, skip_rows: skipRows,
        portfolio_id: needsPortfolio ? portfolioId : undefined,
      })
      setCommitResult(result)
      setStep('done')
      toast.success(`Imported ${result.imported} rows successfully`)
      onComplete?.({
        file_name: file.name,
        target,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
      })
    } catch {
      toast.error('Import failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicators — the shared tactile stepper */}
      <Stepper
        steps={STEPS.map((s) => s.label)}
        current={stepIndex}
        aria-label="Import progress"
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Target type */}
              <div className="space-y-1.5">
                <label htmlFor="import-target" className="text-sm font-medium text-text-primary">
                  Import Type <span className="text-danger">*</span>
                </label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger id="import-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target portfolio (transactions/holdings land somewhere) */}
              {needsPortfolio && (
                <div className="space-y-1.5">
                  <label htmlFor="import-portfolio" className="text-sm font-medium text-text-primary">
                    Target Portfolio <span className="text-danger">*</span>
                  </label>
                  <Select value={portfolioId} onValueChange={setPortfolioId}>
                    <SelectTrigger id="import-portfolio">
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-text-muted">
                    Rows without an explicit portfolio in the file are imported here.
                  </p>
                </div>
              )}

              {/* Date format */}
              <div className="space-y-1.5">
                <label htmlFor="import-date-format" className="text-sm font-medium text-text-primary">
                  Date Format
                </label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger id="import-date-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="%Y-%m-%d">YYYY-MM-DD</SelectItem>
                    <SelectItem value="%d/%m/%Y">DD/MM/YYYY</SelectItem>
                    <SelectItem value="%m/%d/%Y">MM/DD/YYYY</SelectItem>
                    <SelectItem value="%d-%m-%Y">DD-MM-YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Header offset — real bank/brokerage exports often carry a
                  preamble (account summary, disclaimers) above the header row.
                  The API already accepts skip_rows; this exposes it. */}
              <div className="space-y-1.5">
                <label htmlFor="import-skip-rows" className="text-sm font-medium text-text-primary">
                  Skip Leading Rows
                </label>
                <Input
                  id="import-skip-rows"
                  type="number"
                  min={0}
                  max={100}
                  value={skipRows}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10)
                    setSkipRows(Number.isNaN(n) ? 0 : Math.min(Math.max(n, 0), 100))
                  }}
                />
                <p className="text-xs text-text-muted">
                  Rows to discard before the header row. Leave at 0 for a clean export.
                </p>
              </div>

              {/* Drop zone */}
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-card p-10 text-center cursor-pointer transition-all duration-150',
                  isDragging
                    ? 'border-brand-primary bg-brand-primary/5'
                    : file
                    ? 'border-success bg-success-bg/30'
                    : 'border-border hover:border-brand-primary/50 hover:bg-surface-muted'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                aria-label="Drop zone for file upload"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="sr-only"
                  aria-label="File input"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="size-10 text-success" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-text-primary">{file.name}</p>
                      <p className="text-sm text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    >
                      <X className="size-4" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="size-10 text-text-muted" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-text-primary">Drop your file here, or click to browse</p>
                      <p className="text-sm text-text-muted mt-1">Supports CSV, XLSX — up to 50MB</p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handlePreview}
                disabled={!file || (needsPortfolio && !portfolioId)}
                loading={previewMutation.isPending}
                className="w-full"
              >
                Preview Import
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && previewData && (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-bg text-success text-xs font-medium">
                  <CheckCircle className="size-3.5" aria-hidden="true" />
                  {previewData.valid_count} valid rows
                </div>
                {previewData.error_count > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger-bg text-danger text-xs font-medium">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    {previewData.error_count} rows with errors
                  </div>
                )}
                <span className="text-xs text-text-muted ml-auto">{previewData.file_type.toUpperCase()}</span>
              </div>

              {/* Preview table */}
              {previewData.preview.length > 0 && (
                <div className="rounded-card border border-border overflow-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface-elevated border-b border-border">
                      <tr>
                        {Object.keys(previewData.preview[0]!).map((col) => (
                          <th key={col} className="px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.map((row, i) => (
                        <tr key={i} className="border-b border-border hover:bg-surface-muted">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-3 py-2 text-text-primary whitespace-nowrap">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Row errors */}
              {previewData.errors.length > 0 && (
                <Alert
                  variant="warning"
                  title={`${previewData.error_count} row(s) will be skipped`}
                >
                  <ul className="space-y-0.5">
                    {previewData.errors.slice(0, 5).map((e, i) => (
                      <li key={i} className="text-xs text-text-secondary">
                        Row {e.row}{e.field ? ` · ${e.field}` : ''}: {e.error}
                      </li>
                    ))}
                    {previewData.errors.length > 5 && (
                      <li className="text-xs text-text-muted">…and {previewData.errors.length - 5} more</li>
                    )}
                  </ul>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('upload')} className="flex-1">
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
                <Button
                  onClick={handleCommit}
                  loading={commitMutation.isPending}
                  disabled={previewData.valid_count === 0}
                  className="flex-1"
                >
                  Import {previewData.valid_count} rows
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && commitResult && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="size-16 rounded-full bg-success-bg flex items-center justify-center">
                <CheckCircle className="size-8 text-success" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Import Complete!</h3>
                <p className="text-sm text-text-muted mt-1">
                  {commitResult.imported} rows imported
                  {commitResult.skipped > 0 && `, ${commitResult.skipped} skipped`}
                  {commitResult.errors > 0 && `, ${commitResult.errors} errors`}
                </p>
              </div>
              <div className="flex gap-2">
                {commitResult.imported > 0 && (
                  <Badge variant="success">{commitResult.imported} imported</Badge>
                )}
                {commitResult.skipped > 0 && (
                  <Badge variant="secondary">{commitResult.skipped} skipped</Badge>
                )}
                {commitResult.errors > 0 && (
                  <Badge variant="danger">{commitResult.errors} errors</Badge>
                )}
              </div>
              <Button onClick={() => onComplete?.()}>Done</Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
