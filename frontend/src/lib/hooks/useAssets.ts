'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { assetsApi } from '@/lib/api'
import { STALE_TIME } from '@/lib/constants'
import type { Asset, CreateAssetInput, AssetPrice } from '@/types/asset'
import type { AssetType } from '@/types/portfolio'

export const ASSETS_QUERY_KEY = ['assets'] as const

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
        .then((r) => r.data),
    staleTime: STALE_TIME.MEDIUM,
  })
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: [...ASSETS_QUERY_KEY, id],
    queryFn: () => assetsApi.get(id).then((r) => r.data),
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
