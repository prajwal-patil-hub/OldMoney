import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Organization, AuthResponse, Role } from '@/types/api'

const SESSION_TOKEN_KEY = 'om_at'

const _getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(SESSION_TOKEN_KEY)
}

const _setStoredToken = (token: string | null) => {
  if (typeof window === 'undefined') return
  if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token)
  else sessionStorage.removeItem(SESSION_TOKEN_KEY)
}

interface AuthState {
  user: User | null
  activeOrgId: string | null
  activeOrgRole: Role | null
  activeOrg: Organization | null
  readonly accessToken: string | null
  refreshToken: string | null

  setAuth: (data: AuthResponse) => void
  clearAuth: () => void
  updateTokens: (accessToken: string, refreshToken?: string) => void
  setActiveOrg: (orgId: string, role: Role, org?: Organization) => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      activeOrgId: null,
      activeOrgRole: null,
      activeOrg: null,

      get accessToken(): string | null {
        return _getStoredToken()
      },

      refreshToken: null,

      setAuth: (data: AuthResponse) => {
        _setStoredToken(data.access_token)
        set({
          user: data.user ?? null,
          activeOrgId: data.org?.id ?? null,
          activeOrg: data.org ?? null,
          activeOrgRole: 'owner',
          refreshToken: data.refresh_token ?? null,
        })
      },

      clearAuth: () => {
        _setStoredToken(null)
        set({
          user: null,
          activeOrgId: null,
          activeOrgRole: null,
          activeOrg: null,
          refreshToken: null,
        })
      },

      // Used by the token refresh interceptor — only updates tokens, preserves user/org
      updateTokens: (accessToken: string, refreshToken?: string) => {
        _setStoredToken(accessToken)
        if (refreshToken) {
          set({ refreshToken })
        }
      },

      setActiveOrg: (orgId: string, role: Role, org?: Organization) => {
        set({
          activeOrgId: orgId,
          activeOrgRole: role,
          ...(org ? { activeOrg: org } : {}),
        })
      },

      updateUser: (partial: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        }))
      },
    }),
    {
      name: 'oldmoney-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        user: state.user,
        activeOrgId: state.activeOrgId,
        activeOrgRole: state.activeOrgRole,
        activeOrg: state.activeOrg,
      }),
    }
  )
)
