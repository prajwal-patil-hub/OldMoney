'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { STALE_TIME } from '@/lib/constants'
import type { ImportTemplate } from '@/types/imports'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RowError {
  row: number
  field: string | null
  error: string
}

export interface ImportPreviewResponse {
  valid_count: number
  error_count: number
  total_rows: number
  preview: Record<string, string>[]
  errors: RowError[]
  file_type: string
}

export interface ImportCommitResponse {
  imported: number
  skipped: number
  errors: number
  error_details: RowError[]
}

export interface PreviewInput {
  file: File
  target: string
  date_format?: string
  skip_rows?: number
  portfolio_id?: string
}

export interface CommitInput {
  file: File
  target: string
  date_format?: string
  skip_rows?: number
  portfolio_id?: string
}

// ─── Query keys ─────────────────────────────────────────────────────────────

export const IMPORTS_QUERY_KEYS = {
  templates: ['imports', 'templates'] as const,
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useImportPreview() {
  return useMutation({
    mutationFn: async ({ file, target, date_format = '%Y-%m-%d', skip_rows = 0, portfolio_id }: PreviewInput) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('target', target)
      formData.append('date_format', date_format)
      formData.append('skip_rows', String(skip_rows))
      if (portfolio_id) formData.append('portfolio_id', portfolio_id)

      const res = await api.post<ImportPreviewResponse>('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
  })
}

export function useImportCommit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, target, date_format = '%Y-%m-%d', skip_rows = 0, portfolio_id }: CommitInput) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('target', target)
      formData.append('date_format', date_format)
      formData.append('skip_rows', String(skip_rows))
      if (portfolio_id) formData.append('portfolio_id', portfolio_id)

      const res = await api.post<ImportCommitResponse>('/imports/commit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      // An import writes transactions/holdings/prices server-side, which feeds
      // every list, dropdown, and dashboard widget. Invalidate them all so the
      // UI reflects the new data immediately instead of serving stale caches
      // ("no data yet") until the next hard refresh.
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useImportTemplates() {
  return useQuery({
    queryKey: IMPORTS_QUERY_KEYS.templates,
    queryFn: async () => {
      const res = await api.get<ImportTemplate[]>('/imports/templates')
      return res.data
    },
    staleTime: STALE_TIME.LONG,
  })
}
