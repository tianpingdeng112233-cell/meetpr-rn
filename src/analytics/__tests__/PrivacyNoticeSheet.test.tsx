import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler, Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { type Locale, setLocaleOverride, t } from '@/i18n';
import * as buildTrack from '@/config/build-track';
import AppShell from '@/i18n/catalog/AppShell.json';
import { colors } from '@/design/tokens';

import { PrivacyNoticeSheet, PRIVACY_POLICY_URL, TERMS_URL } from '../PrivacyNoticeSheet';
import { AnalyticsEvent, configure, flushNow, isPrivacyNoticeConfirmed, resetAnalyticsForTests, track } from '..';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/config/build-track', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('@/config/build-track')>('@/config/build-track'),
  BUILD_TRACK: 'global',
}));

jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  resetAnalyticsForTests();
  setLocaleOverride(null);
  jest.restoreAllMocks();
});

test.each(['en', 'zh'] as const)('China notice uses the China body in %s', async (locale) => {
  jest.replaceProperty(buildTrack, 'BUILD_TRACK', 'china');
  setLocaleOverride(locale);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<PrivacyNoticeSheet visible />);
    });
    const body = renderer.root.findByType(ScrollView).findAllByType(Text).find(node => node.props.children === t(buildTrack.BUILD_TRACK === 'china' ? 'appShell.privacy.analytics.bodyChina' : 'appShell.privacy.analytics.body'))?.props.children;
    expect(body).not.toMatch(/DigitalOcean|\u7f8e\u56fd/);
    expect(body).toBe(t('appShell.privacy.analytics.bodyChina'));
    expect(body).not.toBe('appShell.privacy.analytics.bodyChina');
  } finally {
    act(() => renderer?.unmount());
  }
});

test.each(['en', 'zh'] as const)('Global notice keeps its existing body verbatim in %s', async (locale) => {
  setLocaleOverride(locale);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<PrivacyNoticeSheet visible />);
    });
    const body = renderer.root.findByType(ScrollView).findAllByType(Text).find(node => node.props.children === t(buildTrack.BUILD_TRACK === 'china' ? 'appShell.privacy.analytics.bodyChina' : 'appShell.privacy.analytics.body'))?.props.children;
    expect(body).toBe(AppShell['appShell.privacy.analytics.body'][locale]);
  } finally {
    act(() => renderer?.unmount());
  }
});

test.each([
  ['china', 'en'],
  ['china', 'zh'],
  ['global', 'en'],
  ['global', 'zh'],
] satisfies [typeof buildTrack.BUILD_TRACK, Locale][])('%s notice opens the existing policy URL in %s', async (track, locale) => {
  jest.replaceProperty(buildTrack, 'BUILD_TRACK', track);
  setLocaleOverride(locale);
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<PrivacyNoticeSheet visible />);
    });
    const link = renderer.root.findAllByProps({ accessibilityRole: 'link' }).find(node => node.props.accessibilityLabel === t('appShell.privacy.policy'))!;
    await act(async () => link.props.onPress());
    expect(openURL).toHaveBeenCalledWith('https://meetpr.app/privacy');
  } finally {
    act(() => renderer?.unmount());
  }
});

test('privacy notice scrolls the full body while keeping confirmation outside the scroll area', async () => {
  setLocaleOverride('en');
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const onConfirmed = jest.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<PrivacyNoticeSheet visible onConfirmed={onConfirmed} />);
    });
    const scroll = renderer.root.findByType(ScrollView);
    const body = scroll.findAllByType(Text).find(node => node.props.children === t('appShell.privacy.analytics.body'))!;
    expect(body.props.children).toBe(t('appShell.privacy.analytics.body'));
    expect(body.props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(scroll.props.style)).toMatchObject({ flexShrink: 1, flexGrow: 0 });
    expect(StyleSheet.flatten(scroll.parent?.props.style).maxHeight).toBe('90%');
    expect(scroll.findAllByProps({ accessibilityRole: 'button' })).toHaveLength(0);

    const link = renderer.root.findAllByProps({ accessibilityRole: 'link' }).find(node => node.props.accessibilityLabel === t('appShell.privacy.policy'))!;
    await act(async () => link.props.onPress());
    expect(openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);

    const button = renderer.root.findAllByProps({ accessibilityRole: 'button' }).find(node => node.props.accessibilityLabel === 'Agree and continue')!;
    expect(button.props.accessibilityLabel).toBe('Agree and continue');
    await act(async () => button.props.onPress());
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    await expect(isPrivacyNoticeConfirmed()).resolves.toBe(true);
  } finally {
    act(() => renderer?.unmount());
  }
});

async function analyticsPosts() {
  const fetcher = jest.fn<typeof fetch>(async input => ({
    status: String(input).endsWith('/events/config') ? 200 : 204,
    json: async () => ({ enabled: true, sample_rate: 1 }),
  }) as Response);
  await configure({ fetch: fetcher, accessTokenProvider: async () => null });
  await track(AnalyticsEvent.AppOpen, { cold: true });
  await flushNow();
  return () => fetcher.mock.calls.filter(([, options]) => options?.method === 'POST');
}

function button(renderer: ReactTestRenderer, label: string) {
  const result = renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label)[0];
  expect(result).toBeDefined();
  return result;
}

test.each(['zh', 'en'] as const)('reviewing after declining remounts the primary button and preserves its label color in %s', async locale => {
  setLocaleOverride(locale);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PrivacyNoticeSheet visible />); });
    const initialAgreeButton = button(renderer, t('appShell.privacy.agree'));
    const agreeLabelColor = () => StyleSheet.flatten(
      button(renderer, t('appShell.privacy.agree')).findByType(Text).props.style,
    ).color;
    expect(agreeLabelColor()).toBe(colors.ctaText);
    await act(async () => { button(renderer, t('appShell.privacy.disagree')).props.onPress(); });
    const reviewButton = button(renderer, t('appShell.privacy.review'));
    await act(async () => { reviewButton.props.onPress(); });
    const returnedAgreeButton = button(renderer, t('appShell.privacy.agree'));
    expect(returnedAgreeButton).not.toBe(reviewButton);
    expect(returnedAgreeButton).not.toBe(initialAgreeButton);
    expect(agreeLabelColor()).toBe(colors.ctaText);
  } finally { act(() => renderer?.unmount()); }
});

test('agree persists the current version before opening the analytics gate', async () => {
  setLocaleOverride('en');
  const posts = await analyticsPosts();
  expect(posts()).toHaveLength(0);
  const onConfirmed = jest.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PrivacyNoticeSheet visible onConfirmed={onConfirmed} />); });
    await act(async () => { button(renderer, 'Agree and continue').props.onPress(); });
    await flushNow();
    expect(await AsyncStorage.getItem('meetpr.legal.accepted_version')).toBe('2026-12-01');
    expect(posts()).toHaveLength(1);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  } finally { act(() => renderer?.unmount()); }
});

test('declining offers review or exit without consent or analytics reporting', async () => {
  setLocaleOverride('zh');
  // Legacy consent must not reopen the gate when the updated terms are declined.
  await AsyncStorage.setItem('meetpr.analytics.privacy_notice_confirmed', 'true');
  const posts = await analyticsPosts();
  const exitApp = jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => {});
  const onConfirmed = jest.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PrivacyNoticeSheet visible onConfirmed={onConfirmed} />); });
    await act(async () => { button(renderer, '不同意').props.onPress(); });
    expect(renderer.root.findAllByType(Text).some(node => node.props.children === '需要同意后才能使用 MeetPR')).toBe(true);
    await act(async () => { button(renderer, '再看看').props.onPress(); });
    expect(button(renderer, '同意并继续')).toBeDefined();
    await act(async () => { button(renderer, '不同意').props.onPress(); });
    await act(async () => { button(renderer, '退出').props.onPress(); });
    expect(exitApp).toHaveBeenCalledTimes(1);
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('meetpr.legal.accepted_version')).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('meetpr.legal.accepted_version', expect.anything());
    await flushNow();
    expect(posts()).toHaveLength(0);
    // A new launch starts at the agreement, with no automatic retry while mounted.
    act(() => renderer.unmount());
    await act(async () => { renderer = create(<PrivacyNoticeSheet visible />); });
    expect(button(renderer, '同意并继续')).toBeDefined();
  } finally { act(() => renderer?.unmount()); }
});

test.each(['en', 'zh', 'zh-Hant'] as const)('both agreement links open their separate documents in %s', async locale => {
  setLocaleOverride(locale);
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PrivacyNoticeSheet visible />); });
    const links = renderer.root.findAllByType(Text).filter(node => node.props.accessibilityRole === 'link');
    expect(links).toHaveLength(2);
    await act(async () => { links[0].props.onPress(); });
    await act(async () => { links[1].props.onPress(); });
    expect(openURL.mock.calls).toEqual([[TERMS_URL], [PRIVACY_POLICY_URL]]);
    expect(openURL.mock.calls).toEqual([['https://meetpr.app/terms'], ['https://meetpr.app/privacy']]);
    expect(links.map(node => node.props.children)).not.toContain('appShell.privacy.terms');
  } finally { act(() => renderer?.unmount()); }
});
