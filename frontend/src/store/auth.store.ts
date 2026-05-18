import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Organization, AuthResponse, Role } from '@/types/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  activeOrgId: string | null
  activeOrgRole: Role | null
  activeOrg: Organization | null
  setAuth: (data: AuthResponse) => void
  clearAuth: () => void
  setActiveOrg: (orgId: string, role: Role, org?: Organization) => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeOrgId: null,
      activeOrgRole: null,
      activeOrg: null,

      setAuth: (data: AuthResponse) => {
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          activeOrgId: data.org.id,
          activeOrg: data.org,
          activeOrgRole: 'owner', // default, would be returned by real API
        })
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          activeOrgId: null,
          activeOrgRole: null,
          activeOrg: null,
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
        typeof window !== 'undefined' ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        activeOrgId: state.activeOrgId,
        activeOrgRole: state.activeOrgRole,
        user: state.user,
        activeOrg: state.activeOrg,
      }),
    }
  )
)
