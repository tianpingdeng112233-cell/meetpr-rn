import { describe, expect, jest, test } from '@jest/globals';

import { ApiError } from '@/api/client';
import type { BindRequest } from '@/api/domains/bind';

import {
  BIND_NOTICES,
  resubmitInviteStash,
  resolveBindGateState,
} from '../bind-model';

const request: BindRequest = {
  id: '10000000-0000-4000-8000-000000000001',
  student_id: '10000000-0000-4000-8000-000000000002',
  coach_id: '10000000-0000-4000-8000-000000000003',
  coach_display_name: '王教练',
  invite_code_id: null,
  status: 'pending',
  submitted_at: '2026-07-20T10:00:00Z',
  responded_at: null,
  expired_at: '2026-07-27T10:00:00Z',
  skip_evaluation: true,
  skip_reason: null,
};

const stash = {
  code: 'XK7MPQ2RVT',
  displayName: '小明',
  savedAt: '2026-07-20T10:00:00Z',
};

describe('BindGate state machine', () => {
  const cases: [
    Parameters<typeof resolveBindGateState>[0],
    boolean,
    boolean,
    ReturnType<typeof resolveBindGateState>['state'],
    string | null,
  ][] = [
    ['accepted', false, false, 'bound', null],
    ['pending', false, false, 'pendingAcceptance', null],
    ['none', false, false, 'needsCode', null],
    ['cancelled', false, false, 'needsCode', null],
    ['rejected', false, false, 'needsCode', BIND_NOTICES.rejected],
    ['expired', false, false, 'needsCode', BIND_NOTICES.expired],
    ['none', true, false, 'needsOnboarding', null],
    ['none', true, true, 'handoffSubmitting', null],
  ];
  test.each(cases)(
    '%s with stash=%s completed=%s resolves to %s',
    (status, hasStash, completed, expectedState, expectedNotice) => {
      expect(resolveBindGateState(status, hasStash, completed)).toEqual({
        state: expectedState,
        notice: expectedNotice,
      });
    },
  );
});

describe('stashed invite auto-resubmission', () => {
  test('posts the exact stashed values and clears after success', async () => {
    const create = jest.fn(async () => request);
    const clear = jest.fn(async () => undefined);
    await expect(resubmitInviteStash(stash, create, clear)).resolves.toEqual({
      kind: 'requestSent',
      request,
    });
    expect(create).toHaveBeenCalledWith({ code: 'XK7MPQ2RVT', display_name: '小明' });
    expect(clear).toHaveBeenCalledTimes(1);
  });

  test('invalid code clears stash and returns to code entry', async () => {
    const clear = jest.fn(async () => undefined);
    await expect(
      resubmitInviteStash(
        stash,
        async () => {
          throw new ApiError('backend', 'INVITE_CODE_INVALID', {
            status: 400,
            code: 'INVITE_CODE_INVALID',
          });
        },
        clear,
      ),
    ).resolves.toEqual({ kind: 'invalidCode' });
    expect(clear).toHaveBeenCalledTimes(1);
  });

  test.each(['BIND_REQUEST_ALREADY_PENDING', 'BIND_ALREADY_BOUND'] as const)(
    '%s asks the gate to reload without clearing the stash',
    async (code) => {
      const clear = jest.fn(async () => undefined);
      await expect(
        resubmitInviteStash(
          stash,
          async () => {
            throw new ApiError('backend', code, { status: 409, code });
          },
          clear,
        ),
      ).resolves.toEqual({ kind: 'needsReload' });
      expect(clear).not.toHaveBeenCalled();
    },
  );

  test('transport failure retains stash for retry', async () => {
    const clear = jest.fn(async () => undefined);
    await expect(
      resubmitInviteStash(stash, async () => Promise.reject(new Error('offline')), clear),
    ).resolves.toEqual({ kind: 'handoffFailed' });
    expect(clear).not.toHaveBeenCalled();
  });
});
