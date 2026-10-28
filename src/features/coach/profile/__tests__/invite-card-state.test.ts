import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { InviteCodesModel, inviteCardState } from '../invite-card-state';
import type { InviteCode } from '@/api/domains/invite-codes';
import { inviteCodesRepository } from '@/api/domains/invite-codes';
import * as SecureStore from 'expo-secure-store';
import { resetSessionForTests, useSessionStore } from '@/api/session';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { InviteDependencies } from '../use-invite-codes';
import { CoachMyProfileScreen } from '../CoachMyProfileScreen';
import { InviteCodesScreen } from '../InviteCodesScreen';
import { inviteCopyText } from '../invite-message';
import { setLocaleOverride, t } from '@/i18n';
import { Share, Text } from 'react-native';
import { AppButton } from '@/design';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { router } from 'expo-router';
import * as buildTrack from '@/config/build-track';

jest.mock('@/config/build-track', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('@/config/build-track')>('@/config/build-track'),
  BUILD_TRACK: 'global',
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false), navigate: jest.fn() },
  useRouter: () => jest.requireMock<typeof import('expo-router')>('expo-router').router,
  useFocusEffect: (callback: () => (() => void)) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(callback, [callback]);
  },
}));

jest.mock('expo-secure-store');
// Swipe gestures are a native boundary; these tests exercise the permanent-code actions.
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: jest.requireActual<typeof import('react-native')>('react-native').View }));
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => jest.requireActual<typeof import('react-native')>('react-native').View);
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const originalFetch = globalThis.fetch;
beforeEach(() => {
  resetSessionForTests();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => key === 'accessToken' ? 'test-access-token' : null);
});
afterEach(() => { globalThis.fetch = originalFetch; jest.clearAllMocks(); jest.restoreAllMocks(); jest.useRealTimers(); setLocaleOverride(null); });
const response = (status: number, body?: unknown) => ({ ok: status < 400, status, text: async () => body === undefined ? '' : JSON.stringify(body) }) as Response;

const code: InviteCode = { id: '10000000-0000-4000-8000-000000000000', coach_id: '20000000-0000-4000-8000-000000000000',
  code: 'XK7MPQ2RVT', type: 'personal_permanent', used_count: 3, max_uses: null, revoked_at: null, expires_at: null, label: null, created_at: '2026-09-05T12:00:00Z' };

const inviteScreens = [CoachMyProfileScreen, InviteCodesScreen];

test.each(inviteScreens)('CN %p shows share then copy, shares title/message and confirms copying', async Component => {
  jest.replaceProperty(buildTrack, 'BUILD_TRACK', 'china');
  setLocaleOverride('zh');
  useSessionStore.setState({ user: { id: code.coach_id, name: ' 王教练 ', role: 'coach', phone: null, created_at: code.created_at } });
  const repository = { listCodes: async () => [code], createCode: jest.fn(async () => code), revokeCode: jest.fn(async () => undefined) };
  const clipboard = { setString: jest.fn(async (_value: string) => undefined) };
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  let screen!: ReactTestRenderer;
  await act(async () => { screen = create(createElement<InviteDependencies>(Component, { repository, clipboard })); });
  try {
    const buttons = screen.root.findAllByType(AppButton);
    expect(buttons.slice(0, 2).map(button => button.props.label)).toEqual(['分享给学员', '复制邀请语']);
    expect(buttons[0].props.variant ?? 'primary').toBe('primary');
    expect(buttons[1].props.variant).toBe('secondary');
    expect(buttons.slice(0, 2).every(button => button.props.fullWidth !== false)).toBe(true);
    const message = inviteCopyText(code.code, '王教练');
    await act(async () => { buttons[0].props.onPress(); });
    expect(share.mock.calls).toEqual([[{ title: '王教练 教练邀请你在 MeetPR 跟练训练计划', message }]]);
    await act(async () => { buttons[1].props.onPress(); });
    expect(clipboard.setString).toHaveBeenCalledWith(message);
    expect(screen.root.findAllByType(AppButton)[1].props.label).toBe('已复制');
    if (Component === CoachMyProfileScreen) {
      expect(screen.root.findAllByType(FeedbackPressable).some(button => button.props.testID === 'coach.profile.inviteCard')).toBe(false);
      expect(screen.root.findAllByProps({ testID: 'coach.profile.copyInvite' })).toHaveLength(0);
      const manage = screen.root.findAllByType(FeedbackPressable).find(button => button.props.accessibilityLabel === '管理');
      expect(manage).toBeDefined();
      await act(async () => { manage!.props.onPress(); });
      expect(router.push).toHaveBeenCalledWith('/(coach)/invite-codes');
    }
  } finally { act(() => screen.unmount()); }
});

test.each(inviteScreens)('Global %p preserves raw-code copying without share or overflow buttons', async Component => {
  setLocaleOverride('en');
  const repository = { listCodes: async () => [code], createCode: jest.fn(async () => code), revokeCode: jest.fn(async () => undefined) };
  const clipboard = { setString: jest.fn(async (_value: string) => undefined) };
  let screen!: ReactTestRenderer;
  await act(async () => { screen = create(createElement<InviteDependencies>(Component, { repository, clipboard })); });
  try {
    const buttons = screen.root.findAllByType(FeedbackPressable);
    expect(buttons.some(button => /share/i.test(button.props.accessibilityLabel ?? ''))).toBe(false);
    expect(screen.root.findAllByProps({ testID: 'coach.invites.more' })).toHaveLength(0);
    const copy = Component === CoachMyProfileScreen
      ? screen.root.findByProps({ testID: 'coach.profile.copyInvite' })
      : buttons.find(button => button.props.accessibilityLabel === t('coach.invites.copy'))!;
    await act(async () => { copy.props.onPress(); });
    expect(clipboard.setString).toHaveBeenCalledWith(code.code);
    if (Component === CoachMyProfileScreen) {
      await act(async () => { screen.root.findByProps({ testID: 'coach.profile.inviteCard' }).props.onPress(); });
      expect(router.push).toHaveBeenCalledWith('/(coach)/invite-codes');
    } else {
      expect(buttons.some(button => button.props.accessibilityLabel === t('coach.invites.regenerate'))).toBe(true);
    }
  } finally { act(() => screen.unmount()); }
});

test('CN overflow opens regeneration confirmation; cancellation never mutates and confirmation does', async () => {
  jest.replaceProperty(buildTrack, 'BUILD_TRACK', 'china');
  setLocaleOverride('zh');
  const repository = { listCodes: async () => [code], createCode: jest.fn(async () => code), revokeCode: jest.fn(async () => undefined) };
  let screen!: ReactTestRenderer;
  await act(async () => { screen = create(createElement<InviteDependencies>(InviteCodesScreen, { repository })); });
  try {
    const openRegenerate = async () => {
      expect(screen.root.findAllByType(FeedbackPressable).some(button => button.props.accessibilityLabel === t('coach.invites.regenerate'))).toBe(false);
      await act(async () => { screen.root.findByProps({ testID: 'coach.invites.more' }).props.onPress(); });
      const regenerate = screen.root.findAllByType(FeedbackPressable).find(button => button.props.accessibilityLabel === t('coach.invites.regenerate'))!;
      await act(async () => { regenerate.props.onPress(); });
      expect(screen.root.findAllByType(Text).map(node => node.props.children)).toContain(t('coach.invites.regenerateMessage'));
      expect(repository.createCode).not.toHaveBeenCalled();
    };
    await openRegenerate();
    await act(async () => { screen.root.findByProps({ testID: 'coach.invites.regenerate.cancel' }).props.onPress(); });
    await openRegenerate();
    await act(async () => { screen.root.findByProps({ testID: 'coach.invites.regenerate.confirm' }).props.onPress(); });
    expect(repository.createCode).toHaveBeenCalledWith({ type: 'personal_permanent', label: undefined });
  } finally { act(() => screen.unmount()); }
});

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

test.each<['china' | 'global', 'en' | 'zh', string]>([
  ['china', 'en', "You'll need to sign in again."],
  ['china', 'zh', '退出后需要重新登录。'],
  ['global', 'en', 'You will need to sign in again to access your account.'],
  ['global', 'zh', '退出后需重新登录才能访问账号。'],
])('the %s profile logout confirmation uses neutral %s copy', async (track, locale, message) => {
  jest.replaceProperty(buildTrack, 'BUILD_TRACK', track);
  setLocaleOverride(locale);
  globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(200, { invite_codes: [] }));
  let screen!: ReactTestRenderer;
  await act(async () => { screen = create(createElement(CoachMyProfileScreen)); });
  try {
    await act(async () => { screen.root.findByProps({ testID: 'coach.profile.logout' }).props.onPress(); });
    expect(screen.root.findAllByType(Text).map(node => node.props.children)).toContain(message);
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

test('copy writes the text the screen formats for the code', async () => {
  const clipboard = { setString: jest.fn(async (_value: string) => undefined) };
  const repository = { listCodes: async () => [code], createCode: jest.fn(async () => code), revokeCode: jest.fn(async () => undefined) };
  const model = new InviteCodesModel(repository, clipboard);
  await model.reload();
  await model.copyCode(code.id, Date.parse('2026-09-05T12:00:00Z'), value => `invite ${value}`);
  expect(clipboard.setString).toHaveBeenCalledWith('invite XK7MPQ2RVT');
  expect(model.getSnapshot().copiedCodeID).toBe(code.id);
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
