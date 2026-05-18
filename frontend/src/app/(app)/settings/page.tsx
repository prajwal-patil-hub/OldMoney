'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2, Users, Building2, Shield, Key, Mail, UserPlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { orgApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useAuth } from '@/lib/hooks/useAuth'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { STALE_TIME } from '@/lib/constants'
import type { Role } from '@/types/api'

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: 'Full access, can manage billing',
  admin: 'Can manage members and settings',
  member: 'Can view and edit data',
  viewer: 'Read-only access',
}

function OrganizationSettings() {
  const { activeOrg } = useAuthStore()
  const [orgName, setOrgName] = useState(activeOrg?.name ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await orgApi.update({ name: orgName })
      toast.success('Organization settings updated')
    } catch {
      toast.error('Failed to update organization settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization Details</CardTitle>
          <CardDescription>Update your organization name and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="org-name" className="text-sm font-medium text-text-primary">
              Organization Name
            </label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Slug</label>
            <Input
              value={activeOrg?.slug ?? ''}
              disabled
              className="opacity-60"
              aria-label="Organization slug (read-only)"
            />
            <p className="text-xs text-text-muted">Slug cannot be changed after creation.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Plan</label>
            <div className="flex items-center gap-2 py-2">
              <Badge variant={activeOrg?.plan === 'pro' ? 'gold' : 'secondary'}>
                {activeOrg?.plan ? ROLE_LABELS[activeOrg.plan as Role] ?? activeOrg.plan : 'Free'}
              </Badge>
              <Button variant="outline" size="sm">
                Upgrade Plan
              </Button>
            </div>
          </div>
          <Button onClick={handleSave} loading={isSaving}>
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-danger">
            <Shield className="size-4" aria-hidden="true" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3 border border-danger/20 rounded-lg px-4 bg-danger-bg/20">
            <div>
              <p className="text-sm font-medium text-text-primary">Delete Organization</p>
              <p className="text-xs text-text-muted">
                Permanently delete this organization and all its data.
              </p>
            </div>
            <Button variant="destructive" size="sm" disabled>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MembersSettings() {
  const queryClient = useQueryClient()
  const { activeOrgRole } = useAuthStore()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('member')
  const [isInviting, setIsInviting] = useState(false)

  const { data: members, isLoading } = useQuery({
    queryKey: ['org', 'members'],
    queryFn: () => orgApi.members().then((r) => r.data),
    staleTime: STALE_TIME.MEDIUM,
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => orgApi.removeMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'members'] })
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  const handleInvite = async () => {
    if (!inviteEmail) return
    setIsInviting(true)
    try {
      await orgApi.inviteMember(inviteEmail, inviteRole)
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteOpen(false)
      setInviteEmail('')
    } catch {
      toast.error('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const canManageMembers = activeOrgRole === 'owner' || activeOrgRole === 'admin'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Team Members</CardTitle>
              <CardDescription>Manage who has access to this organization</CardDescription>
            </div>
            {canManageMembers && (
              <Button onClick={() => setInviteOpen(true)} size="sm">
                <UserPlus className="size-4" aria-hidden="true" />
                Invite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : !members?.length ? (
            <p className="text-sm text-text-muted py-4 text-center">No members yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 py-3">
                  <div className="size-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-primary uppercase">
                      {member.user.full_name?.charAt(0) ?? member.user.email.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {member.user.full_name}
                    </p>
                    <p className="text-xs text-text-muted truncate">{member.user.email}</p>
                  </div>
                  <Badge
                    variant={
                      member.role === 'owner'
                        ? 'gold'
                        : member.role === 'admin'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {ROLE_LABELS[member.role]}
                  </Badge>
                  {canManageMembers && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeMutation.mutate(member.user.id)}
                      disabled={removeMutation.isPending}
                      className="text-text-muted hover:text-danger"
                      aria-label={`Remove ${member.user.full_name}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role descriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([role, label]) => (
              <div key={role} className="flex items-center gap-3">
                <Badge
                  variant={
                    role === 'owner' ? 'gold' : role === 'admin' ? 'default' : 'secondary'
                  }
                  className="w-16 justify-center"
                >
                  {label}
                </Badge>
                <p className="text-sm text-text-secondary">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium text-text-primary">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" aria-hidden="true" />
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium text-text-primary">
                Role
              </label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['admin', 'member', 'viewer'] as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      <div>
                        <p className="font-medium">{ROLE_LABELS[r]}</p>
                        <p className="text-xs text-text-muted">{ROLE_DESCRIPTIONS[r]}</p>
                      </div>
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
            <Button onClick={handleInvite} loading={isInviting} disabled={!inviteEmail}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProfileSettings() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Would call userApi.updateProfile({ full_name: fullName })
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-brand-primary flex items-center justify-center">
              <span className="text-xl font-bold text-text-inverse uppercase">
                {user?.full_name?.charAt(0) ?? user?.email?.charAt(0) ?? 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{user?.full_name}</p>
              <p className="text-xs text-text-muted">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="text-sm font-medium text-text-primary">
              Full Name
            </label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Email</label>
            <Input value={user?.email ?? ''} disabled className="opacity-60" aria-label="Email (read-only)" />
            <p className="text-xs text-text-muted">Email cannot be changed from here.</p>
          </div>
          <Button onClick={handleSave} loading={isSaving}>
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="size-4" aria-hidden="true" />
            API Access
          </CardTitle>
          <CardDescription>Manage API keys for programmatic access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3 rounded-lg bg-surface-muted border border-border px-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Personal API Key</p>
              <p className="text-xs text-text-muted mt-0.5 font-mono">om_live_**********************8f2a</p>
            </div>
            <Button variant="outline" size="sm">
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, organization, and preferences"
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <Settings2 className="size-4" aria-hidden="true" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="org">
            <Building2 className="size-4" aria-hidden="true" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="size-4" aria-hidden="true" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="org">
          <OrganizationSettings />
        </TabsContent>
        <TabsContent value="members">
          <MembersSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
