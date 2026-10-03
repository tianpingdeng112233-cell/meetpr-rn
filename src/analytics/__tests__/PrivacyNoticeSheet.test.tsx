import { afterEach, expect, jest, test } from '@jest/globals';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { setLocaleOverride, t } from '@/i18n';

import { PrivacyNoticeSheet, PRIVACY_POLICY_URL } from '../PrivacyNoticeSheet';
import { isPrivacyNoticeConfirmed } from '..';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

afterEach(() => {
  setLocaleOverride(null);
  jest.restoreAllMocks();
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
