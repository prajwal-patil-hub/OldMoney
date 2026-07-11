'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Users,
  User,
  Shield,
  Palette,
  UserPlus,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { toast } from 'sonner'
import api, { orgApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { STALE_TIME } from '@/lib/constants'
import type { Role } from '@/types/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

// The backend uses a different role vocabulary (SUPERADMIN/ORG_ADMIN/ADVISOR/
// ANALYST/CLIENT/VIEWER) than the UI's owner/admin/member/viewer. Translate at
// the boundary in both directions.
const FROM_BACKEND_ROLE: Record<string, Role> = {
  SUPERADMIN: 'owner',
  ORG_ADMIN: 'admin',
  ADVISOR: 'member',
  ANALYST: 'member',
  CLIENT: 'viewer',
  VIEWER: 'viewer',
}

const TO_BACKEND_ROLE: Record<Role, string> = {
  owner: 'SUPERADMIN',
  admin: 'ORG_ADMIN',
  member: 'ANALYST',
  viewer: 'VIEWER',
}

type TabId = 'organization' | 'members' | 'account' | 'security' | 'appearance'

interface NavItem {
  id: TabId
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { id: 'organization', label: 'Organization', Icon: Building2 },
  { id: 'members', label: 'Members', Icon: Users },
  { id: 'account', label: 'Account', Icon: User },
  { id: 'security', label: 'Security', Icon: Shield },
  { id: 'appearance', label: 'Appearance', Icon: Palette },
]

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-xl text-text-primary tracking-tight">{title}</h2>
      {description && <p className="text-sm text-text-muted mt-0.5">{description}</p>}
      <div className="border-t border-border mt-4" />
    </div>
  )
}

// ─── Organization tab ─────────────────────────────────────────────────────────

function OrganizationTab() {
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const activeOrgId = useAuthStore((s) => s.activeOrgId)
  const [orgName, setOrgName] = useState(activeOrg?.name ?? '')
  const [displayName, setDisplayName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!activeOrgId) return
    setIsSaving(true)
    try {
      await orgApi.update(activeOrgId, { name: orgName })
      toast.success('Organization settings updated')
    } catch {
      toast.error('Failed to update organization settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <SectionHeading
        title="Organization Settings"
        description="Manage your organization's profile"
      />
      <div className="max-w-sm space-y-4">
        <div>
          <label htmlFor="org-name" className="block text-xs text-text-secondary mb-1.5 font-medium">
            Organization name
          </label>
          <Input
            id="org-name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Smith Family Office"
          />
        </div>

        <div>
          <label htmlFor="display-name" className="block text-xs text-text-secondary mb-1.5 font-medium">
            Display name{' '}
            <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Same as organization name"
          />
        </div>

        <div>
          <label htmlFor="org-slug" className="block text-xs text-text-secondary mb-1.5 font-medium">
            Slug
          </label>
          <Input
            id="org-slug"
            value={activeOrg?.slug ?? ''}
            disabled
            className="font-mono opacity-60"
            aria-label="Organization slug"
          />
          <p className="mt-1.5 text-xs text-text-muted">Cannot be changed after creation</p>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={handleSave} loading={isSaving}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const activeOrgId = useAuthStore((s) => s.activeOrgId)
  const activeOrgRole = useAuthStore((s) => s.activeOrgRole)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('member')
  const [isInviting, setIsInviting] = useState(false)

  const { data: members, isLoading } = useQuery({
    queryKey: ['org', activeOrgId, 'members'],
    queryFn: () =>
      orgApi.members(activeOrgId!).then((r) => {
        // Backend returns flat MemberOut ({user_id, email, full_name, role, ...});
        // the table renders the nested OrgMember shape.
        const rows = (r.data as unknown as Record<string, unknown>[]) ?? []
        return rows.map((m) => ({
          id: String(m.id ?? ''),
          org_id: String(m.org_id ?? ''),
          user: {
            id: String(m.user_id ?? ''),
            email: String(m.email ?? ''),
            full_name: String(m.full_name ?? ''),
            created_at: String(m.created_at ?? ''),
            updated_at: String(m.created_at ?? ''),
          },
          role: FROM_BACKEND_ROLE[String(m.role)] ?? 'viewer',
          invited_at: String(m.created_at ?? ''),
          joined_at: String(m.created_at ?? ''),
        }))
      }),
    staleTime: STALE_TIME.MEDIUM,
    enabled: !!activeOrgId,
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => orgApi.removeMember(activeOrgId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', activeOrgId, 'members'] })
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  const roleUpdateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      orgApi.updateMemberRole(activeOrgId!, userId, TO_BACKEND_ROLE[role] as Role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', activeOrgId, 'members'] })
    },
    onError: () => toast.error('Failed to update role'),
  })

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    try {
      await orgApi.inviteMember(activeOrgId!, inviteEmail.trim(), TO_BACKEND_ROLE[inviteRole] as Role)
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('member')
    } catch {
      toast.error('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const canManage = activeOrgRole === 'owner' || activeOrgRole === 'admin'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl text-text-primary tracking-tight">Members</h2>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-3.5" aria-hidden="true" />
            Invite Member
          </Button>
        )}
      </div>
      <div className="border-t border-border mb-4" />

      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-muted rounded animate-pulse" />
          ))}
        </div>
      ) : !members?.length ? (
        <p className="text-sm text-text-muted py-6 text-center">No members yet.</p>
      ) : (
        <table className="w-full text-sm" aria-label="Members">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-text-muted font-medium pb-2 pr-4">Member</th>
              <th className="text-left text-xs text-text-muted font-medium pb-2 pr-4">Role</th>
              <th className="text-left text-xs text-text-muted font-medium pb-2 pr-4">Joined</th>
              <th className="w-8 pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => {
              const initials = (
                member.user.full_name?.charAt(0) ?? member.user.email.charAt(0)
              ).toUpperCase()
              const isSelf = member.user.id === currentUser?.id

              return (
                <tr key={member.id} className="h-12 group">
                  <td className="pr-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-7 rounded-full bg-surface-muted text-text-secondary text-xs flex items-center justify-center shrink-0 font-medium"
                        aria-hidden="true"
                      >
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate leading-tight">
                          {member.user.full_name}
                        </p>
                        <p className="text-xs text-text-muted truncate">{member.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="pr-4">
                    {isSelf || !canManage ? (
                      <span className="text-sm text-text-secondary">{ROLE_LABELS[member.role]}</span>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          roleUpdateMutation.mutate({ userId: member.user.id, role: v as Role })
                        }
                        disabled={member.role === 'owner'}
                      >
                        <SelectTrigger className="h-7 w-28 border-transparent bg-transparent text-sm hover:bg-surface-muted focus:border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['admin', 'member', 'viewer'] as Role[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="pr-4 text-sm text-text-muted">
                    {member.joined_at
                      ? new Date(member.joined_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td>
                    {canManage && member.role !== 'owner' && !isSelf && (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 text-sm text-danger-text hover:underline transition-opacity duration-fast"
                        onClick={() => removeMutation.mutate(member.user.id)}
                        disabled={removeMutation.isPending}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <label htmlFor="invite-email" className="block text-xs text-text-secondary mb-1.5 font-medium">
                Email address
              </label>
              <Input
                id="invite-email"
                type="email"
                autoFocus
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="block text-xs text-text-secondary mb-1.5 font-medium">
                Role
              </label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      ['admin', 'Admin'],
                      ['member', 'Member'],
                      ['viewer', 'Viewer'],
                    ] as [Role, string][]
                  ).map(([r, label]) => (
                    <SelectItem key={r} value={r}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} loading={isInviting} disabled={!inviteEmail.trim()}>
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Account tab ──────────────────────────────────────────────────────────────

function getPasswordStrengthLabel(pwd: string): 'Weak' | 'Fair' | 'Good' | 'Strong' | null {
  if (!pwd) return null
  const hasLen = pwd.length >= 8
  const hasUpper = /[A-Z]/.test(pwd)
  const hasNum = /[0-9]/.test(pwd)
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
  if (!hasLen) return 'Weak'
  if (!hasUpper) return 'Fair'
  if (!hasNum) return 'Good'
  if (hasSpecial) return 'Strong'
  return 'Good'
}

const PWD_STRENGTH_COLOR: Record<string, string> = {
  Weak: 'bg-danger',
  Fair: 'bg-warning',
  Good: 'bg-warning',
  Strong: 'bg-success',
}

const PWD_STRENGTH_SCORE: Record<string, number> = {
  Weak: 1,
  Fair: 2,
  Good: 3,
  Strong: 4,
}

function AccountTab() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [isSavingPwd, setIsSavingPwd] = useState(false)

  const newPwdStrength = getPasswordStrengthLabel(newPwd)

  async function handleSaveProfile() {
    setIsSavingProfile(true)
    try {
      await api.patch('/auth/me', { full_name: fullName })
      updateUser({ full_name: fullName })
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault()
    setPwdError(null)
    if (!currentPwd) { setPwdError('Current password is required.'); return }
    if (!newPwd) { setPwdError('New password is required.'); return }
    if (newPwd === currentPwd) { setPwdError('New password must differ from current.'); return }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return }
    if (!newPwdStrength || ['Weak', 'Fair'].includes(newPwdStrength)) {
      setPwdError('Password must be at least "Good" strength.')
      return
    }
    setIsSavingPwd(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPwd,
        new_password: newPwd,
      })
      toast.success('Password changed')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch {
      toast.error('Failed to change password')
    } finally {
      setIsSavingPwd(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile section */}
      <div>
        <SectionHeading title="Profile" />
        <div className="max-w-sm space-y-4">
          <div>
            <label htmlFor="account-name" className="block text-xs text-text-secondary mb-1.5 font-medium">
              Full name
            </label>
            <Input
              id="account-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div>
            <label htmlFor="account-email" className="block text-xs text-text-secondary mb-1.5 font-medium">
              Email
            </label>
            <Input
              id="account-email"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="opacity-60"
              aria-label="Email address (read-only)"
            />
            <p className="mt-1.5 text-xs text-text-muted">Contact support to change your email</p>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleSaveProfile} loading={isSavingProfile}>
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Change password section */}
      <div>
        <SectionHeading title="Change Password" />
        <form onSubmit={handleChangePwd} className="max-w-sm space-y-4" noValidate>
          {pwdError && (
            <div
              role="alert"
              className="px-3 py-2 rounded bg-danger-bg border border-danger/20 text-sm text-danger-text"
            >
              {pwdError}
            </div>
          )}
          <div>
            <label htmlFor="current-pwd" className="block text-xs text-text-secondary mb-1.5 font-medium">
              Current password
            </label>
            <Input
              id="current-pwd"
              type="password"
              autoComplete="current-password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="new-pwd" className="block text-xs text-text-secondary mb-1.5 font-medium">
              New password
            </label>
            <Input
              id="new-pwd"
              type="password"
              autoComplete="new-password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
            {newPwd && newPwdStrength && (
              <div className="mt-2 flex items-center gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-normal',
                      n <= PWD_STRENGTH_SCORE[newPwdStrength]
                        ? PWD_STRENGTH_COLOR[newPwdStrength]
                        : 'bg-border'
                    )}
                    aria-hidden="true"
                  />
                ))}
                <span className="text-xs text-text-muted ml-1">{newPwdStrength}</span>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="confirm-pwd" className="block text-xs text-text-secondary mb-1.5 font-medium">
              Confirm new password
            </label>
            <Input
              id="confirm-pwd"
              type="password"
              autoComplete="new-password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={isSavingPwd}>
              Update password
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Security tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  return (
    <div>
      <SectionHeading title="Security" description="Manage your active sessions and access" />

      {/* Current session */}
      <div className="max-w-md space-y-4">
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-text-primary">Current session</p>
            <span className="text-xs bg-success-bg text-success-text px-2 py-0.5 rounded-sm font-medium">
              Active
            </span>
          </div>
          <p className="text-xs text-text-muted">
            {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-1)[0] : 'Browser'} ·{' '}
            {new Date().toLocaleDateString()}
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => toast.info('Sign out all sessions coming soon')}>
          Sign out all other devices
        </Button>

        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Coming soon</p>
          {['API Keys', 'Audit Log'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-border" aria-hidden="true" />
              <p className="text-sm text-text-muted">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Appearance tab ───────────────────────────────────────────────────────────

type ThemeOption = 'light' | 'dark' | 'system'

function AppearanceTab() {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  const [density, setDensityLocal] = useState<'comfortable' | 'compact'>(() => {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('ui.density') as 'comfortable' | 'compact') ?? 'comfortable'
    }
    return 'comfortable'
  })

  function handleDensity(d: 'comfortable' | 'compact') {
    setDensityLocal(d)
    localStorage.setItem('ui.density', d)
  }

  const [selectedThemeOption, setSelectedThemeOption] = useState<ThemeOption>(theme)

  const themeOptions: { value: ThemeOption; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ]

  function handleThemeChange(value: ThemeOption) {
    setSelectedThemeOption(value)
    if (value === 'system') {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    } else {
      setTheme(value)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading title="Appearance" description="Customize how OldMoney looks for you" />
        <div className="max-w-sm space-y-6">
          {/* Theme */}
          <div>
            <p className="text-xs text-text-secondary font-medium mb-3">Interface theme</p>
            <div className="flex gap-2">
              {themeOptions.map(({ value, label, Icon }) => {
                const isActive = value === selectedThemeOption
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleThemeChange(value)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2 px-3 py-3 rounded-lg border transition-colors duration-fast text-sm',
                      isActive
                        ? 'border-brand-primary bg-brand-subtle text-brand-primary'
                        : 'border-border bg-surface text-text-secondary hover:bg-surface-muted'
                    )}
                    aria-pressed={isActive}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Density */}
          <div>
            <p className="text-xs text-text-secondary font-medium mb-3">Table density</p>
            <div className="flex gap-2">
              {(['comfortable', 'compact'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDensity(d)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border transition-colors duration-fast text-sm capitalize',
                    density === d
                      ? 'border-brand-primary bg-brand-subtle text-brand-primary'
                      : 'border-border bg-surface text-text-secondary hover:bg-surface-muted'
                  )}
                  aria-pressed={density === d}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('organization')

  return (
    <div className="flex gap-8 min-h-0">
      {/* Left nav */}
      <nav className="w-48 shrink-0" aria-label="Settings navigation">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            return (
              <li key={id} className="relative">
                {isActive && (
                  <span
                    className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand-primary rounded-r"
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-2.5 w-full h-9 rounded px-3 text-sm transition-colors duration-fast',
                    isActive
                      ? 'text-brand-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeTab === 'organization' && <OrganizationTab />}
        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'appearance' && <AppearanceTab />}
      </div>
    </div>
  )
}
