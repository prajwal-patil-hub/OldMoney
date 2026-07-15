import type { Role } from '@/types/api'

// The backend role vocabulary differs from the UI's four-role model.
// Translate at the boundary so the rest of the app speaks one language.
const FROM_BACKEND: Record<string, Role> = {
  SUPERADMIN: 'owner',
  ORG_ADMIN: 'admin',
  ADVISOR: 'member',
  ANALYST: 'member',
  CLIENT: 'viewer',
  VIEWER: 'viewer',
  // tolerate already-mapped values
  owner: 'owner',
  admin: 'admin',
  member: 'member',
  viewer: 'viewer',
}

export const TO_BACKEND_ROLE: Record<Role, string> = {
  owner: 'SUPERADMIN',
  admin: 'ORG_ADMIN',
  member: 'ANALYST',
  viewer: 'VIEWER',
}

export function mapBackendRole(role: string | undefined | null): Role {
  if (!role) return 'viewer'
  return FROM_BACKEND[role] ?? 'viewer'
}

/** Resolve the user's role in a specific org from their membership list. */
export function roleForOrg(
  memberships: Array<{ org_id: string; role: string; is_active?: boolean }> | undefined,
  orgId: string
): Role {
  const m = (memberships ?? []).find((x) => x.org_id === orgId && x.is_active !== false)
  return mapBackendRole(m?.role)
}
