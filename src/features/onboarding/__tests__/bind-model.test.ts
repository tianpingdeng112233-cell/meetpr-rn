import { afterEach, describe, expect, jest, test } from '@jest/globals';

import { ApiError } from '@/api/client';
import { BindRequestSchema, type BindRequest } from '@/api/domains/bind';
import { type Locale, setLocaleOverride } from '@/i18n';

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
  ended_at: null,
  expired_at: '2026-07-27T10:00:00Z',
  skip_evaluation: true,
  skip_reason: null,
};

const stash = {
  code: 'XK7MPQ2RVT',
  displayName: '小明',
  savedAt: '2026-07-20T10:00:00Z',
};

afterEach(() => setLocaleOverride(null));

test.each<[Locale, string, string]>([
  ['zh', '王教练已与你解绑\n训练记录都还在，输入邀请码可重新绑定', '教练已与你解绑\n训练记录都还在，输入邀请码可重新绑定'],
  ['zh-Hant', '王教练已與你解綁\n訓練記錄都還在，輸入邀請碼可重新繫結', '教練已與你解綁\n訓練記錄都還在，輸入邀請碼可重新繫結'],
])('%s localizes the two-line notice without translating the coach name', (locale, named, fallback) => {
  setLocaleOverride(locale);
  const unlinked = { ...request, status: 'cancelled' as const, ended_at: '2026-11-02T10:00:00Z' };
  expect(resolveBindGateState(unlinked, false, true).notice).toBe(named);
  expect(resolveBindGateState({ ...unlinked, coach_display_name: null }, false, true).notice).toBe(fallback);
});

test.each([undefined, null, ''])('cancelled with ended_at %j shows no notice', ended_at => {
  const cancelled = BindRequestSchema.parse({ ...request, status: 'cancelled', ended_at });
  expect(resolveBindGateState(cancelled, false, true)).toEqual({ state: 'needsCode', notice: null });
});

test('a coach-ended cancelled request shows the coach name and retained-history notice', () => {
  setLocaleOverride('en');
  expect(resolveBindGateState({
    ...request, status: 'cancelled', ended_at: '2026-11-02T10:00:00Z', coach_display_name: 'Alex',
  }, false, true)).toEqual({
    state: 'needsCode',
    notice: 'Alex has unlinked you\nYour training history is kept. Enter an invite code to link again.',
  });
});

describe('BindGate state machine', () => {
  test.each([null, '', ' \t\n '])('an unlinked coach with name %j uses the fallback', coach_display_name => {
    setLocaleOverride('en');
    expect(resolveBindGateState({
      ...request, status: 'cancelled', ended_at: '2026-11-02T10:00:00Z', coach_display_name,
    }, false, true)).toEqual({
      state: 'needsCode',
      notice: 'Your coach has unlinked you\nYour training history is kept. Enter an invite code to link again.',
    });
  });

  const cases: [
    BindRequest['status'] | 'none',
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
      expect(resolveBindGateState(status === 'none' ? null : { ...request, status }, hasStash, completed)).toEqual({
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

const binding = { ...request, status: 'accepted' as const };
test('a new student welcomes from backend first_run without any plan reads', () => {
  const context = { request: { ...binding, first_run: { binding_plan_count: 0, has_settled_day: false, first_plan: null } }, welcomeSeen: false };
  expect(resolveBindGateState(binding, false, true, context).state).toBe('welcome');
  expect(resolveBindGateState(binding, false, true, { ...context, welcomeSeen: true }).state).toBe('bound');
});

test.each([undefined, null])('first_run %s never welcomes or guesses from client plans', first_run => {
  expect(resolveBindGateState(binding, false, true, { request: { ...binding, first_run }, welcomeSeen: false }).state).toBe('bound');
});

test('backend settlement keeps a student with a completed hidden plan out of welcome', () => {
  expect(resolveBindGateState(binding, false, true, { request: { ...binding, first_run: {
    binding_plan_count: 1, has_settled_day: true, first_plan: null,
  } }, welcomeSeen: false }).state).toBe('bound');
});
