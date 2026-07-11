'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { assetsApi } from '@/lib/api'
import { STALE_TIME } from '@/lib/constants'
import type { Asset, CreateAssetInput, AssetPrice } from '@/types/asset'
import type { AssetType } from '@/types/portfolio'

export const ASSETS_QUERY_KEY = ['assets'] as const

// The backend nests the most recent price as latest_price: { close, price_date, source };
// the UI reads flat current_price / price_updated_at. Normalize here, coercing
// Decimal-as-string to number.
function normalizeAsset(raw: Record<string, unknown>): Asset {
  const latest = raw.latest_price as { close?: unknown; price_date?: string; source?: string } | null
  return {
    ...(raw as unknown as Asset),
    current_price: latest?.close != null ? Number(latest.close) : undefined,
    price_updated_at: latest?.price_date,
    price_source: latest?.source,
  }
}

export interface AssetFilters {
  asset_type?: AssetType | 'all'
  search?: string
  page?: number
  page_size?: number
}

export function useAssets(filters?: AssetFilters) {
  const { asset_type, search, page = 1, page_size = 20 } = filters ?? {}
  return useQuery({
    queryKey: [...ASSETS_QUERY_KEY, { asset_type, search, page, page_size }],
    queryFn: () =>
      assetsApi
        .list({
          asset_type: asset_type && asset_type !== 'all' ? asset_type : undefined,
          search: search || undefined,
          page,
          page_size,
        })
        .then((r) => ({
          ...r.data,
          items: (r.data.items ?? []).map((a) => normalizeAsset(a as unknown as Record<string, unknown>)),
        })),
    staleTime: STALE_TIME.MEDIUM,
  })
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: [...ASSETS_QUERY_KEY, id],
    queryFn: () =>
      assetsApi.get(id).then((r) => normalizeAsset(r.data as unknown as Record<string, unknown>)),
    staleTime: STALE_TIME.MEDIUM,
    enabled: !!id,
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAssetInput) => assetsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY })
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateAssetInput>) =>
      assetsApi.update(id, data).then((r) => r.data),
    onSuccess: (data: Asset) => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY })
      queryClient.setQueryData([...ASSETS_QUERY_KEY, data.id], data)
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY })
    },
  })
}

export interface AddAssetPriceInput {
  date: string
  close: number
  open?: number
  high?: number
  low?: number
  volume?: number
}

export function useAddAssetPrice(assetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (priceData: AddAssetPriceInput) =>
      api.post<AssetPrice>(`/assets/${assetId}/prices`, priceData).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ASSETS_QUERY_KEY, assetId] })
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY })
    },
  })
}
