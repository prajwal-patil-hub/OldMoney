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
  // accessToken lives in state (not a getter) so Zustand tracks it properly.
  // It is also mirrored to sessionStorage so it survives soft navigations.
  accessToken: string | null
  refreshToken: string | null

  setAuth: (data: AuthResponse) => void
  clearAuth: () => void
  updateTokens: (accessToken: string, refreshToken?: string) => void
  setActiveOrg: (orgId: string, role: Role, org?: Organization) => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      activeOrgId: null,
      activeOrgRole: null,
      activeOrg: null,
      // Initialise from sessionStorage so a page refresh in the same tab keeps
      // the user logged in even though accessToken is excluded from localStorage.
      accessToken: _getStoredToken(),
      refreshToken: null,

      setAuth: (data: AuthResponse) => {
        _setStoredToken(data.access_token)
        set({
          accessToken: data.access_token,
          user: data.user ?? null,
          activeOrgId: data.org?.id ?? null,
          activeOrg: data.org ?? null,
          // Real role from the membership; server enforcement is still the
          // true boundary, but the UI must not assume owner for everyone.
          activeOrgRole: data.role ?? 'viewer',
          refreshToken: data.refresh_token ?? null,
        })
      },

      clearAuth: () => {
        _setStoredToken(null)
        set({
          accessToken: null,
          user: null,
          activeOrgId: null,
          activeOrgRole: null,
          activeOrg: null,
          refreshToken: null,
        })
      },

      updateTokens: (accessToken: string, refreshToken?: string) => {
        _setStoredToken(accessToken)
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        }))
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
      // Exclude accessToken from localStorage — it lives in sessionStorage only.
      // This means closing the tab clears the token (desired security behaviour).
      partialize: (state) => ({
        user: state.user,
        activeOrgId: state.activeOrgId,
        activeOrgRole: state.activeOrgRole,
        activeOrg: state.activeOrg,
      }),
    }
  )
)
