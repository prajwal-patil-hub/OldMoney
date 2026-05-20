import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL } from './constants'

// Lazy store import to avoid circular deps
let getStore: () => {
  accessToken: string | null
  refreshToken: string | null
  setAuth: (data: import('@/types/api').AuthResponse) => void
  clearAuth: () => void
  updateTokens: (accessToken: string, refreshToken?: string) => void
} | null = () => null

export function initApiStore(
  getter: () => {
    accessToken: string | null
    refreshToken: string | null
    setAuth: (data: import('@/types/api').AuthResponse) => void
    clearAuth: () => void
    updateTokens: (accessToken: string, refreshToken?: string) => void
  }
) {
  getStore = getter
}

function redirectToLogin() {
  const store = getStore()
  store?.clearAuth()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

// Unwrap the backend envelope { data: ..., errors: [], meta: ... } → inner data
function unwrapEnvelope(body: unknown): unknown {
  if (
    body !== null &&
    typeof body === 'object' &&
    'data' in (body as object) &&
    'errors' in (body as object)
  ) {
    return (body as Record<string, unknown>)['data']
  }
  return body
}

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const store = getStore()
    if (store?.accessToken) {
      config.headers.Authorization = `Bearer ${store.accessToken}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    // Unwrap backend envelope on every successful response
    response.data = unwrapEnvelope(response.data)
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const store = getStore()

      if (!store?.refreshToken) {
        redirectToLogin()
        return Promise.reject(error)
      }

      try {
        // Use raw axios (bypasses our interceptors) then unwrap manually
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: store.refreshToken }
        )
        const tokenData = unwrapEnvelope(response.data) as { access_token: string; refresh_token?: string }
        store.updateTokens(tokenData.access_token, tokenData.refresh_token)
        originalRequest.headers.Authorization = `Bearer ${tokenData.access_token}`
        return api(originalRequest)
      } catch {
        redirectToLogin()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post<import('@/types/api').LoginApiResponse>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post<{ id: string; email: string; full_name: string }>('/auth/register', data),
  refresh: (refreshToken: string) =>
    api.post<{ access_token: string; refresh_token: string; token_type: string }>('/auth/refresh', { refresh_token: refreshToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<import('@/types/api').User>('/auth/me'),
}

// Portfolio endpoints
export const portfoliosApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<import('@/types/api').PaginatedResponse<import('@/types/portfolio').Portfolio>>(
      '/portfolios',
      { params }
    ),
  get: (id: string) => api.get<import('@/types/portfolio').Portfolio>(`/portfolios/${id}`),
  create: (data: import('@/types/portfolio').CreatePortfolioInput) =>
    api.post<import('@/types/portfolio').Portfolio>('/portfolios', data),
  update: (id: string, data: Partial<import('@/types/portfolio').CreatePortfolioInput>) =>
    api.patch<import('@/types/portfolio').Portfolio>(`/portfolios/${id}`, data),
  delete: (id: string) => api.delete(`/portfolios/${id}`),
  holdings: (id: string) =>
    api.get<import('@/types/portfolio').Holding[]>(`/portfolios/${id}/holdings`),
  performance: (id: string, params?: { start?: string; end?: string }) =>
    api.get<import('@/types/portfolio').PortfolioPerformance[]>(`/portfolios/${id}/performance`, {
      params,
    }),
  allocation: (id: string) =>
    api.get<import('@/types/portfolio').AllocationBreakdown[]>(`/portfolios/${id}/allocation`),
}

// Asset endpoints
export const assetsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; asset_type?: string }) =>
    api.get<import('@/types/api').PaginatedResponse<import('@/types/asset').Asset>>('/assets', {
      params,
    }),
  get: (id: string) => api.get<import('@/types/asset').Asset>(`/assets/${id}`),
  create: (data: import('@/types/asset').CreateAssetInput) =>
    api.post<import('@/types/asset').Asset>('/assets', data),
  update: (id: string, data: Partial<import('@/types/asset').CreateAssetInput>) =>
    api.patch<import('@/types/asset').Asset>(`/assets/${id}`, data),
  delete: (id: string) => api.delete(`/assets/${id}`),
  prices: (id: string, params?: { start?: string; end?: string }) =>
    api.get<import('@/types/asset').AssetPrice[]>(`/assets/${id}/prices`, { params }),
}

// Transaction endpoints
export const transactionsApi = {
  list: (params?: {
    page?: number
    page_size?: number
    portfolio_id?: string
    asset_id?: string
    transaction_type?: string
    start_date?: string
    end_date?: string
  }) =>
    api.get<import('@/types/api').PaginatedResponse<import('@/types/transaction').Transaction>>(
      '/transactions',
      { params }
    ),
  get: (id: string) => api.get<import('@/types/transaction').Transaction>(`/transactions/${id}`),
  create: (data: import('@/types/transaction').CreateTransactionInput) =>
    api.post<import('@/types/transaction').Transaction>('/transactions', data),
  update: (id: string, data: Partial<import('@/types/transaction').CreateTransactionInput>) =>
    api.patch<import('@/types/transaction').Transaction>(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
}

// Dashboard endpoints
export const dashboardApi = {
  metrics: () => api.get<import('@/types/api').DashboardMetrics>('/dashboard/metrics'),
  performance: (params?: { days?: number }) =>
    api.get<import('@/types/api').TimeSeriesPoint[]>('/dashboard/performance', { params }),
  allocation: () =>
    api.get<import('@/types/portfolio').AllocationBreakdown[]>('/dashboard/allocation'),
  topHoldings: (limit = 10) =>
    api.get<import('@/types/portfolio').Holding[]>('/dashboard/top-holdings', {
      params: { limit },
    }),
  recentTransactions: (limit = 10) =>
    api.get<import('@/types/transaction').Transaction[]>('/dashboard/recent-transactions', {
      params: { limit },
    }),
}

// Import endpoints
export const importsApi = {
  list: () =>
    api.get<import('@/types/api').PaginatedResponse<import('@/types/transaction').ImportJob>>(
      '/imports'
    ),
  get: (id: string) => api.get<import('@/types/transaction').ImportJob>(`/imports/${id}`),
  upload: (file: File, portfolioId: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('portfolio_id', portfolioId)
    return api.post<import('@/types/transaction').ImportJob>('/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  preview: (jobId: string, columnMappings: Record<string, string>) =>
    api.post<import('@/types/transaction').ImportPreviewRow[]>(`/imports/${jobId}/preview`, {
      column_mappings: columnMappings,
    }),
  confirm: (jobId: string, columnMappings: Record<string, string>) =>
    api.post<import('@/types/transaction').ImportJob>(`/imports/${jobId}/confirm`, {
      column_mappings: columnMappings,
    }),
}

// AI Copilot endpoints
export const aiApi = {
  chat: (message: string, conversationId?: string) =>
    api.post('/ai/chat', { message, conversation_id: conversationId }),
  chatStream: (message: string, conversationId?: string) => {
    const store = getStore()
    const url = `${API_BASE_URL}/api/v1/ai/chat/stream`
    return new EventSource(
      `${url}?message=${encodeURIComponent(message)}&conversation_id=${conversationId || ''}&token=${store?.accessToken || ''}`
    )
  },
  conversations: () => api.get('/ai/conversations'),
  conversation: (id: string) => api.get(`/ai/conversations/${id}`),
}

// Org endpoints
export const orgApi = {
  list: () => api.get<import('@/types/api').OrgApiResponse[]>('/orgs'),
  get: (id: string) => api.get<import('@/types/api').OrgApiResponse>(`/orgs/${id}`),
  update: (id: string, data: Partial<import('@/types/api').OrgApiResponse>) =>
    api.patch<import('@/types/api').OrgApiResponse>(`/orgs/${id}`, data),
  switch: (id: string) =>
    api.post<{ access_token: string; token_type: string }>(`/orgs/${id}/switch`),
  members: (orgId: string) => api.get<import('@/types/api').OrgMember[]>(`/orgs/${orgId}/members`),
  inviteMember: (orgId: string, email: string, role: import('@/types/api').Role) =>
    api.post(`/orgs/${orgId}/members`, { email, role }),
  removeMember: (orgId: string, userId: string) => api.delete(`/orgs/${orgId}/members/${userId}`),
  updateMemberRole: (orgId: string, userId: string, role: import('@/types/api').Role) =>
    api.patch(`/orgs/${orgId}/members/${userId}`, { role }),
}

export default api
