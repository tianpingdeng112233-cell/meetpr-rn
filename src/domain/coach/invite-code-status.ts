type StatusFields = {
  type: 'personal_permanent' | 'single_use' | 'time_limited';
  max_uses?: number | null;
  used_count: number;
  revoked_at?: string | null;
  expires_at?: string | null;
};

export type InviteCodeStatus = { kind: 'active' | 'used' | 'expired' | 'revoked' }
  | { kind: 'expiringIn'; days: number };

export function isDefunct(status: InviteCodeStatus): boolean {
  return status.kind === 'used' || status.kind === 'expired' || status.kind === 'revoked';
}

/** All callers supply the same screen clock; wire DTOs have no status field. */
export function inviteCodeStatus(code: StatusFields, now: number): InviteCodeStatus {
  if (code.revoked_at != null) return { kind: 'revoked' };
  if (code.type === 'single_use' && code.max_uses != null && code.used_count >= code.max_uses) return { kind: 'used' };
  if (code.expires_at != null) {
    const remaining = Date.parse(code.expires_at) - now;
    return remaining <= 0 ? { kind: 'expired' } : { kind: 'expiringIn', days: Math.max(1, Math.ceil(remaining / 86_400_000)) };
  }
  return { kind: 'active' };
}
