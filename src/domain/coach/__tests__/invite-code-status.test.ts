import { expect, test } from '@jest/globals';
import { inviteCodeStatus, isDefunct, type InviteCodeStatus } from '../invite-code-status';
import { InviteCodeFormat } from '../invite-code-format';

const now = Date.parse('2026-09-05T12:00:00Z');
const code = { type: 'single_use' as const, max_uses: 1, used_count: 1,
  revoked_at: '2026-09-04T12:00:00Z', expires_at: '2026-09-05T11:00:00Z' };

test('only used, expired and revoked codes are defunct', () => {
  const statuses: InviteCodeStatus[] = [{ kind: 'used' }, { kind: 'expired' }, { kind: 'revoked' }, { kind: 'active' }, { kind: 'expiringIn', days: 1 }];
  expect(statuses.map(isDefunct)).toEqual([true, true, true, false, false]);
});

test('display groups ten characters 4-3-3 and leaves other lengths unchanged', () => {
  expect(InviteCodeFormat.grouped('XK7MPQ2RVT')).toBe('XK7M PQ2 RVT');
  expect(InviteCodeFormat.grouped('SHORT')).toBe('SHORT');
});

test('revocation takes precedence over exhaustion and expiry', () => {
  expect(inviteCodeStatus(code, now)).toEqual({ kind: 'revoked' });
});

test.each([
  ['2026-09-05T11:59:59Z', { kind: 'expired' }],
  ['2026-09-05T12:00:00Z', { kind: 'expired' }],
  ['2026-09-05T12:00:00.001Z', { kind: 'expiringIn', days: 1 }],
  ['2026-09-06T12:00:00Z', { kind: 'expiringIn', days: 1 }],
  ['2026-09-06T12:00:01Z', { kind: 'expiringIn', days: 2 }],
  [null, { kind: 'active' }],
])('expiry %s uses the injected instant and ceiling days', (expires_at, expected) => {
  expect(inviteCodeStatus({ ...code, type: 'time_limited', revoked_at: null, expires_at }, now)).toEqual(expected);
});

test('single-use exhaustion precedes expiry; missing limits and other types are not exhausted', () => {
  expect(inviteCodeStatus({ ...code, revoked_at: null }, now)).toEqual({ kind: 'used' });
  expect(inviteCodeStatus({ ...code, revoked_at: null, expires_at: null, max_uses: null }, now)).toEqual({ kind: 'active' });
  expect(inviteCodeStatus({ ...code, type: 'personal_permanent', revoked_at: null, expires_at: null }, now)).toEqual({ kind: 'active' });
});
