import { afterEach, expect, jest, test } from '@jest/globals';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { type Locale, setLocaleOverride, t } from '@/i18n';
import * as buildTrack from '@/config/build-track';
import AppShell from '@/i18n/catalog/AppShell.json';

import { PrivacyNoticeSheet, PRIVACY_POLICY_URL } from '../PrivacyNoticeSheet';
import { isPrivacyNoticeConfirmed } from '..';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/config/build-track', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('@/config/build-track')>('@/config/build-track'),
  BUILD_TRACK: 'global',
}));

afterEach(() => {
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
    const body = renderer.root.findByType(ScrollView).findByType(Text).props.children;
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
    const body = renderer.root.findByType(ScrollView).findByType(Text).props.children;
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
    const link = renderer.root.findByProps({ accessibilityRole: 'link' });
    await act(async () => link.props.onPress());
    expect(openURL).toHaveBeenCalledWith('https://meetpr.app/privacy');
  } finally {
    act(() => renderer?.unmount());
  }
});

test('privacy notice scrolls the full body while keeping the policy link and confirmation outside the scroll area', async () => {
  setLocaleOverride('en');
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const onConfirmed = jest.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<PrivacyNoticeSheet visible onConfirmed={onConfirmed} />);
    });
    const scroll = renderer.root.findByType(ScrollView);
    const body = scroll.findByType(Text);
    expect(body.props.children).toBe(t('appShell.privacy.analytics.body'));
    expect(body.props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(scroll.props.style)).toMatchObject({ flexShrink: 1, flexGrow: 0 });
    expect(StyleSheet.flatten(scroll.parent?.props.style).maxHeight).toBe('90%');
    expect(scroll.findAllByProps({ accessibilityRole: 'button' })).toHaveLength(0);
    expect(scroll.findAllByProps({ accessibilityRole: 'link' })).toHaveLength(0);

    const link = renderer.root.findByProps({ accessibilityRole: 'link' });
    await act(async () => link.props.onPress());
    expect(openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);

    const button = renderer.root.findByProps({ accessibilityRole: 'button' });
    expect(button.props.accessibilityLabel).toBe('Got it');
    await act(async () => button.props.onPress());
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    await expect(isPrivacyNoticeConfirmed()).resolves.toBe(true);
  } finally {
    act(() => renderer?.unmount());
  }
});
