import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Organization, AuthResponse, Role } from '@/types/api'

// ─── sessionStorage-backed access token ───────────────────────────────────────
// Lives only in the current tab's JS heap + sessionStorage.
// sessionStorage is cleared on tab/browser close, preventing persistent XSS theft.

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

// ─── Store interface ───────────────────────────────────────────────────────────

interface AuthState {
  // Non-sensitive identity data — persisted in localStorage
  user: User | null
  activeOrgId: string | null
  activeOrgRole: Role | null
  activeOrg: Organization | null

  // accessToken is NOT kept in Zustand state — derived from sessionStorage on every read
  readonly accessToken: string | null

  // refreshToken is held only in memory (not persisted). It survives page refreshes
  // only within the same tab session; closing the tab/browser clears it.
  refreshToken: string | null

  setAuth: (data: AuthResponse) => void
  clearAuth: () => void
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

      // Derived getter — reads from sessionStorage every time it's accessed
      get accessToken(): string | null {
        return _getStoredToken()
      },

      // In-memory only; not in partialize → never written to localStorage
      refreshToken: null,

      setAuth: (data: AuthResponse) => {
        // Write access token to sessionStorage (not localStorage, not Zustand state)
        _setStoredToken(data.access_token)
        set({
          user: data.user,
          activeOrgId: data.org.id,
          activeOrg: data.org,
          activeOrgRole: 'owner', // default; would be returned by real API
          // Keep refresh token in memory only (not persisted via partialize)
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
      // Only persist non-sensitive identity data.
      // accessToken → sessionStorage (handled separately above)
      // refreshToken → memory-only (intentionally excluded)
      partialize: (state) => ({
        user: state.user,
        activeOrgId: state.activeOrgId,
        activeOrgRole: state.activeOrgRole,
        activeOrg: state.activeOrg,
      }),
    }
  )
)
