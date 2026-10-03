import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { InviteCodesModel, inviteCardState } from '../invite-card-state';
import type { InviteCode } from '@/api/domains/invite-codes';
import { inviteCodesRepository } from '@/api/domains/invite-codes';
import * as SecureStore from 'expo-secure-store';
import { resetSessionForTests } from '@/api/session';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { InviteDependencies } from '../use-invite-codes';
import { CoachMyProfileScreen } from '../CoachMyProfileScreen';
import { setLocaleOverride } from '@/i18n';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => (() => void)) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(callback, [callback]);
  },
}));

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const originalFetch = globalThis.fetch;
beforeEach(() => {
  resetSessionForTests();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => key === 'accessToken' ? 'test-access-token' : null);
});
afterEach(() => { globalThis.fetch = originalFetch; jest.clearAllMocks(); jest.useRealTimers(); setLocaleOverride(null); });
const response = (status: number, body?: unknown) => ({ ok: status < 400, status, text: async () => body === undefined ? '' : JSON.stringify(body) }) as Response;

const code: InviteCode = { id: '10000000-0000-4000-8000-000000000000', coach_id: '20000000-0000-4000-8000-000000000000',
  code: 'XK7MPQ2RVT', type: 'personal_permanent', used_count: 3, max_uses: null, revoked_at: null, expires_at: null, label: null, created_at: '2026-09-05T12:00:00Z' };

test('the mounted profile only loads, copies raw text and removes its toast after two seconds', async () => {
  jest.useFakeTimers();
  setLocaleOverride('en');
  const fetcher = jest.fn<typeof fetch>().mockResolvedValue(response(200, { invite_codes: [code] }));
  globalThis.fetch = fetcher;
  const clipboard = { setString: jest.fn(async (_value: string) => undefined) };
  let screen!: ReactTestRenderer;
  await act(async () => { screen = create(createElement<InviteDependencies>(CoachMyProfileScreen, { clipboard })); });
  try {
    expect(fetcher.mock.calls.map(call => call[1]?.method)).toEqual(['GET']);
    const button = screen.root.findByProps({ testID: 'coach.profile.copyInvite' });
    await act(async () => { button.props.onPress(); });
    expect(clipboard.setString).toHaveBeenCalledWith('XK7MPQ2RVT');
    expect(screen.root.findAllByProps({ testID: 'coach.profile.toast' }).length).toBeGreaterThan(0);
    act(() => jest.advanceTimersByTime(1999));
    expect(screen.root.findAllByProps({ testID: 'coach.profile.toast' }).length).toBeGreaterThan(0);
    // Repeated copies get a fresh two-second feedback window.
    await act(async () => { button.props.onPress(); });
    act(() => jest.advanceTimersByTime(1));
    expect(screen.root.findAllByProps({ testID: 'coach.profile.toast' }).length).toBeGreaterThan(0);
    act(() => jest.advanceTimersByTime(1999));
    expect(screen.root.findAllByProps({ testID: 'coach.profile.toast' })).toHaveLength(0);
  } finally { act(() => screen.unmount()); }
});

test('loading performs only GET; explicit generation reads the server list again and omits non-time expiry', async () => {
  const fetcher = jest.fn<typeof fetch>().mockResolvedValueOnce(response(200, { invite_codes: [] }))
    .mockResolvedValueOnce(response(201, code))
    .mockResolvedValueOnce(response(200, { invite_codes: [{ ...code, used_count: 4 }] }));
  globalThis.fetch = fetcher;
  const model = new InviteCodesModel(inviteCodesRepository);
  await model.reload();
  expect(fetcher.mock.calls.map(call => call[1]?.method)).toEqual(['GET']);
  await model.createCode({ type: 'personal_permanent' });
  expect(fetcher.mock.calls.map(call => call[1]?.method)).toEqual(['GET', 'POST', 'GET']);
  expect(fetcher.mock.calls[1][0]).toEqual(expect.stringContaining('/coach/invite-codes'));
  expect(JSON.parse(fetcher.mock.calls[1][1]!.body as string)).toEqual({ type: 'personal_permanent' });
  expect(inviteCardState(model.getSnapshot()).code?.used_count).toBe(4);
});

test('copy writes the raw code, and reports success only after the clipboard accepts it', async () => {
  const clipboard = { setString: jest.fn(async (_value: string) => undefined) };
  const repository = { listCodes: async () => [code], createCode: jest.fn(async () => code), revokeCode: jest.fn(async () => undefined) };
  const model = new InviteCodesModel(repository, clipboard);
  await model.reload();
  expect(inviteCardState(model.getSnapshot()).code?.used_count).toBe(3);
  await model.copyCode(code.id, Date.parse('2026-09-05T12:00:00Z'));
  expect(clipboard.setString).toHaveBeenCalledWith('XK7MPQ2RVT');
  expect(model.getSnapshot().copiedCodeID).toBe(code.id);
  model.clearCopied();
  clipboard.setString.mockRejectedValueOnce(new Error('unavailable'));
  await model.copyCode(code.id, Date.parse('2026-09-05T12:00:00Z'));
  expect(model.getSnapshot().copiedCodeID).toBeNull();
  expect(model.getSnapshot().actionError).toBe(true);
});

test('revoke accepts repeated 204 responses and re-lists; defunct codes cannot be copied', async () => {
  const inactive = { ...code, type: 'single_use', revoked_at: '2026-09-05T13:00:00Z' };
  const fetcher = jest.fn<typeof fetch>().mockResolvedValueOnce(response(204))
    .mockResolvedValueOnce(response(200, { invite_codes: [inactive] }))
    .mockResolvedValueOnce(response(204)).mockResolvedValueOnce(response(200, { invite_codes: [inactive] }));
  globalThis.fetch = fetcher;
  const clipboard = { setString: jest.fn(async () => undefined) };
  const model = new InviteCodesModel(inviteCodesRepository, clipboard);
  await model.revokeCode(code.id);
  await model.revokeCode(code.id);
  expect(fetcher.mock.calls.map(call => call[1]?.method)).toEqual(['DELETE', 'GET', 'DELETE', 'GET']);
  expect(fetcher.mock.calls[0][0]).toEqual(expect.stringContaining(`/coach/invite-codes/${code.id}`));
  await model.copyCode(code.id, Date.parse('2026-09-05T14:00:00Z'));
  expect(clipboard.setString).not.toHaveBeenCalled();
});

test('an empty permanent card distinguishes loading, failed and loaded-empty', async () => {
  let resolve!: (codes: never[]) => void;
  const listCodes = jest.fn(() => new Promise<never[]>(done => { resolve = done; }));
  const repository = { listCodes, createCode: jest.fn(async () => code), revokeCode: jest.fn(async () => undefined) };
  const model = new InviteCodesModel(repository);
  expect(inviteCardState(model.getSnapshot()).subtitle).toBe('coach.profile.inviteLoading');
  const pending = model.reload();
  expect(inviteCardState(model.getSnapshot()).subtitle).toBe('coach.profile.inviteLoading');
  resolve([]);
  await pending;
  expect(inviteCardState(model.getSnapshot()).subtitle).toBe('coach.profile.inviteEmpty');
  expect(repository.createCode).not.toHaveBeenCalled();
  const failed = new InviteCodesModel({ ...repository, listCodes: async () => { throw new Error('offline'); } });
  await failed.reload();
  expect(inviteCardState(failed.getSnapshot()).subtitle).toBe('coach.profile.inviteFailed');
});

test.each([1, 7, 30, 365])('time-limited generation sends %i days and a trimmed note, then reloads', async days => {
  const fetcher = jest.fn<typeof fetch>().mockResolvedValueOnce(response(201, code)).mockResolvedValueOnce(response(200, { invite_codes: [code] }));
  globalThis.fetch = fetcher;
  const model = new InviteCodesModel(inviteCodesRepository);
  await model.createCode({ type: 'time_limited', label: '  Alex  ', expires_in_days: days });
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ type: 'time_limited', label: 'Alex', expires_in_days: days });
  expect(fetcher.mock.calls.map(call => call[1]?.method)).toEqual(['POST', 'GET']);
});

test.each([0, 366, 1.5])('invalid custom duration %i never POSTs', async days => {
  const fetcher = jest.fn<typeof fetch>().mockResolvedValue(response(200, { invite_codes: [] }));
  globalThis.fetch = fetcher;
  const model = new InviteCodesModel(inviteCodesRepository);
  expect(await model.createCode({ type: 'time_limited', expires_in_days: days })).toBe(false);
  expect(model.getSnapshot().actionError).toBe(true);
  expect(fetcher.mock.calls.map(call => call[1]?.method)).toEqual(['GET']);
});

test('refresh failures retain the last good list and failed writes still re-list', async () => {
  const fetcher = jest.fn<typeof fetch>().mockResolvedValueOnce(response(200, { invite_codes: [code] }))
    .mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('lost POST response'))
    .mockResolvedValueOnce(response(200, { invite_codes: [] }));
  globalThis.fetch = fetcher;
  const model = new InviteCodesModel(inviteCodesRepository);
  await model.reload();
  await model.reload();
  expect(inviteCardState(model.getSnapshot()).code?.id).toBe(code.id);
  expect(model.getSnapshot().state).toBe('loaded');
  expect(await model.createCode({ type: 'single_use', label: '  ' })).toBe(false);
  expect(fetcher.mock.calls.map(call => call[1]?.method)).toEqual(['GET', 'GET', 'POST', 'GET']);
  expect(JSON.parse(fetcher.mock.calls[2][1]!.body as string)).toEqual({ type: 'single_use' });
  expect(model.getSnapshot().codes).toEqual([]);
  expect(model.getSnapshot().actionError).toBe(true);
});
