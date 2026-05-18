export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ApiError {
  detail: string
  code?: string
  field?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
  org: Organization
}

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
}

export interface OrgMember {
  id: string
  user: User
  org_id: string
  role: Role
  invited_at: string
  joined_at?: string
}

export type Role = 'owner' | 'admin' | 'member' | 'viewer'

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface DashboardMetrics {
  total_aum: number
  total_aum_change: number
  today_pnl: number
  today_pnl_pct: number
  ytd_return: number
  ytd_return_pct: number
  portfolio_count: number
}
