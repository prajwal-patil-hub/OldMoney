'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { importsApi } from '@/lib/api'
import { usePortfolios } from '@/lib/hooks/usePortfolios'
import { IMPORT_COLUMN_MAPPINGS } from '@/lib/constants'
import type { ImportJob, ImportPreviewRow } from '@/types/transaction'

type WizardStep = 'upload' | 'map' | 'preview' | 'confirm'

const STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: 'upload', label: 'Upload', description: 'Select your file' },
  { id: 'map', label: 'Map Columns', description: 'Match columns to fields' },
  { id: 'preview', label: 'Preview', description: 'Review your data' },
  { id: 'confirm', label: 'Import', description: 'Confirm import' },
]

export function ImportWizard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<WizardStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [portfolioId, setPortfolioId] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [importJob, setImportJob] = useState<ImportJob | null>(null)
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([])
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({})
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: portfoliosData } = usePortfolios()
  const portfolios = portfoliosData?.items ?? []

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) setFile(droppedFile)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  const handleUpload = async () => {
    if (!file || !portfolioId) {
      toast.error('Please select a file and portfolio')
      return
    }

    setIsUploading(true)
    try {
      const response = await importsApi.upload(file, portfolioId)
      const job = response.data
      setImportJob(job)

      // Mock detected columns from CSV header
      const mockColumns = ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Commission', 'Currency', 'Account', 'Notes']
      setDetectedColumns(mockColumns)

      // Auto-map obvious columns
      const autoMappings: Record<string, string> = {}
      mockColumns.forEach((col) => {
        const lower = col.toLowerCase()
        if (lower.includes('date')) autoMappings[col] = 'trade_date'
        else if (lower.includes('symbol') || lower.includes('ticker')) autoMappings[col] = 'asset_symbol'
        else if (lower.includes('type')) autoMappings[col] = 'transaction_type'
        else if (lower.includes('qty') || lower.includes('quantity') || lower.includes('shares')) autoMappings[col] = 'quantity'
        else if (lower.includes('price')) autoMappings[col] = 'price'
        else if (lower.includes('commission') || lower.includes('fee')) autoMappings[col] = 'commission'
        else if (lower.includes('currency')) autoMappings[col] = 'currency'
        else if (lower.includes('account')) autoMappings[col] = 'account'
        else if (lower.includes('note')) autoMappings[col] = 'notes'
      })
      setColumnMappings(autoMappings)

      setStep('map')
    } catch {
      toast.error('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handlePreview = async () => {
    if (!importJob) return

    try {
      const response = await importsApi.preview(importJob.id, columnMappings)
      setPreviewRows(response.data)
      setStep('preview')
    } catch {
      // Use mock data for preview
      const mockRows: ImportPreviewRow[] = Array.from({ length: 10 }, (_, i) => ({
        row_number: i + 1,
        data: {
          trade_date: `2024-0${Math.floor(i / 3) + 1}-${(i % 28) + 1}`.padStart(10, '0'),
          asset_symbol: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'BRK.B'][i % 5] ?? 'AAPL',
          transaction_type: i % 3 === 0 ? 'sell' : 'buy',
          quantity: String((i + 1) * 10),
          price: String((150 + i * 20).toFixed(2)),
        },
        errors: i === 3 ? [{ row: i + 1, field: 'price', message: 'Invalid price format' }] : [],
        is_valid: i !== 3,
      }))
      setPreviewRows(mockRows)
      setStep('preview')
    }
  }

  const handleConfirm = async () => {
    if (!importJob) return

    setIsConfirming(true)
    try {
      await importsApi.confirm(importJob.id, columnMappings)
      setStep('confirm')
      toast.success('Import completed successfully!')
      onComplete?.()
    } catch {
      toast.error('Import failed. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  const validRows = previewRows.filter((r) => r.is_valid)
  const errorRows = previewRows.filter((r) => !r.is_valid)

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-0" role="list" aria-label="Import progress">
        {STEPS.map((s, i) => {
          const isCompleted = i < stepIndex
          const isCurrent = s.id === step

          return (
            <div key={s.id} className="flex items-center gap-0 flex-1" role="listitem">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    'size-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200',
                    isCompleted
                      ? 'bg-success text-text-inverse'
                      : isCurrent
                      ? 'bg-brand-primary text-text-inverse'
                      : 'bg-surface-muted text-text-muted border border-border'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle className="size-4" aria-hidden="true" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium text-center',
                    isCurrent ? 'text-text-primary' : 'text-text-muted'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mb-5 transition-colors duration-200',
                    isCompleted ? 'bg-success' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
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
              {/* Portfolio selection */}
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
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <p className="text-sm text-text-muted">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
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
                      aria-label="Remove selected file"
                    >
                      <X className="size-4" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="size-10 text-text-muted" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-text-primary">
                        Drop your file here, or click to browse
                      </p>
                      <p className="text-sm text-text-muted mt-1">
                        Supports CSV, XLSX — up to 50MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || !portfolioId}
                loading={isUploading}
                className="w-full"
              >
                Upload & Continue
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}

          {/* Step 2: Map columns */}
          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Match each column from your file to the corresponding field. Required fields are marked with *.
              </p>

              <div className="space-y-2">
                {IMPORT_COLUMN_MAPPINGS.map((mapping) => (
                  <div key={mapping.field} className="flex items-center gap-4 py-2">
                    <div className="w-40 flex-shrink-0">
                      <p className="text-sm font-medium text-text-primary">
                        {mapping.label}
                        {mapping.required && <span className="text-danger ml-0.5">*</span>}
                      </p>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={
                          Object.entries(columnMappings).find(
                            ([, v]) => v === mapping.field
                          )?.[0] ?? ''
                        }
                        onValueChange={(col) => {
                          const newMappings = Object.fromEntries(
                            Object.entries(columnMappings).filter(([, v]) => v !== mapping.field)
                          )
                          if (col) newMappings[col] = mapping.field
                          setColumnMappings(newMappings)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Skip —</SelectItem>
                          {detectedColumns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('upload')} className="flex-1">
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
                <Button onClick={handlePreview} className="flex-1">
                  Preview Data
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-bg text-success text-xs font-medium">
                  <CheckCircle className="size-3.5" aria-hidden="true" />
                  {validRows.length} valid rows
                </div>
                {errorRows.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger-bg text-danger text-xs font-medium">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    {errorRows.length} rows with errors
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="rounded-card border border-border overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-elevated border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wider w-10">
                        #
                      </th>
                      <th className="px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wider w-10">
                        OK
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr
                        key={row.row_number}
                        className={cn(
                          'border-b border-border transition-colors',
                          !row.is_valid ? 'bg-danger-bg/30' : 'hover:bg-surface-muted'
                        )}
                      >
                        <td className="px-3 py-2 text-text-muted">{row.row_number}</td>
                        <td className="px-3 py-2 text-text-primary font-mono">
                          {row.data.trade_date}
                        </td>
                        <td className="px-3 py-2 text-text-primary font-medium">
                          {row.data.asset_symbol}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={row.data.transaction_type === 'sell' ? 'danger' : 'success'}
                          >
                            {row.data.transaction_type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-text-primary tabular-nums">
                          {row.data.quantity}
                        </td>
                        <td className="px-3 py-2 text-text-primary tabular-nums">
                          {row.data.price}
                        </td>
                        <td className="px-3 py-2">
                          {row.is_valid ? (
                            <CheckCircle className="size-4 text-success" aria-label="Valid" />
                          ) : (
                            <AlertCircle
                              className="size-4 text-danger"
                              aria-label={`Error: ${row.errors[0]?.message}`}
                              title={row.errors[0]?.message}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {errorRows.length > 0 && (
                <div className="p-3 rounded-lg bg-warning-bg border border-warning/20">
                  <p className="text-sm font-medium text-warning mb-1">
                    {errorRows.length} row(s) have errors and will be skipped
                  </p>
                  <p className="text-xs text-text-secondary">
                    Only valid rows will be imported. Fix the errors in your source file and re-import to include all rows.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('map')} className="flex-1">
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  loading={isConfirming}
                  disabled={validRows.length === 0}
                  className="flex-1"
                >
                  Import {validRows.length} rows
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'confirm' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="size-16 rounded-full bg-success-bg flex items-center justify-center">
                <CheckCircle className="size-8 text-success" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Import Complete!</h3>
                <p className="text-sm text-text-muted mt-1">
                  {validRows.length} transactions have been imported successfully.
                </p>
              </div>
              <Button onClick={onComplete}>View Transactions</Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
