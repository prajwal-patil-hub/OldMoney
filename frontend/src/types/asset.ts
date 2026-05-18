import type { AssetType } from './portfolio'

export interface Asset {
  id: string
  org_id: string
  name: string
  symbol: string
  asset_type: AssetType
  currency: string
  isin?: string
  cusip?: string
  exchange?: string
  sector?: string
  industry?: string
  country?: string
  description?: string
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Pricing
  current_price?: number
  price_updated_at?: string
  price_source?: string
}

export interface AssetPrice {
  asset_id: string
  date: string
  open?: number
  high?: number
  low?: number
  close: number
  volume?: number
  source: string
}

export interface CreateAssetInput {
  name: string
  symbol: string
  asset_type: AssetType
  currency: string
  isin?: string
  cusip?: string
  exchange?: string
  sector?: string
  industry?: string
  country?: string
  description?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface UpdateAssetInput extends Partial<CreateAssetInput> {
  id: string
}
