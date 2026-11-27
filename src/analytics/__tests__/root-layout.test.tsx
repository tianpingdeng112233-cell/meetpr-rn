import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  configure,
  isPrivacyNoticeConfirmed,
  track,
} from '@/analytics';
import RootLayout from '@/app/_layout';

jest.mock('@/features/notifications/PlanNotificationSession', () => ({ PlanNotificationSession: () => null }));
jest.mock('@/analytics', () => {
  // Jest hoists this factory before React imports are initialized.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    AnalyticsEvent: { AppOpen: 'app_open' },
    configure: jest.fn(),
    isPrivacyNoticeConfirmed: jest.fn(),
    PrivacyNoticeSheet: (props: { visible: boolean; onConfirmed?: () => void }) =>
      React.createElement('privacy-notice-sheet', { ...props, testID: 'privacy-notice-sheet' },
        React.createElement(jest.requireActual<typeof import('../PrivacyNoticeSheet')>('../PrivacyNoticeSheet').PrivacyNoticeSheet, props)),
    track: jest.fn(),
  };
});
jest.mock('@/api/query', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/api/session', () => {
  const bootstrap = jest.fn();
  const state = {
    bootstrap,
    bootstrapped: true,
    status: 'anonymous',
    user: null,
  };
  return {
    useSessionStore: Object.assign((selector: (value: typeof state) => unknown) => selector(state), {
      getState: () => state,
      subscribe: () => () => {},
    }),
  };
});
jest.mock('expo-router', () => {
  // Jest hoists this factory before React imports are initialized.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const Stack = ({ children }: { children: React.ReactNode }) =>
    React.createElement('stack', null, children);
  function Screen() {
    return null;
  }
  function Protected({ children }: { children: React.ReactNode }) {
    return children;
  }
  function ThemeProvider({ children }: { children: React.ReactNode }) {
    return children;
  }
  Stack.Screen = Screen;
  Stack.Protected = Protected;
  return {
    useRouter: () => ({ navigate: jest.fn() }),
    DarkTheme: { colors: {} },
    DefaultTheme: { colors: {} },
    Stack,
    ThemeProvider,
  };
});
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

const mockedConfigure = jest.mocked(configure);
const mockedIsPrivacyNoticeConfirmed = jest.mocked(isPrivacyNoticeConfirmed);
const mockedTrack = jest.mocked(track);

beforeEach(async () => {
  await AsyncStorage.clear();
  mockedIsPrivacyNoticeConfirmed.mockImplementation(
    jest.requireActual<typeof import('../storage')>('../storage').isPrivacyNoticeConfirmed,
  );
  mockedConfigure.mockResolvedValue({ anonId: 'test', privacyNoticeConfirmed: false, enabled: true });
  mockedTrack.mockResolvedValue();
});

afterEach(() => {
  jest.clearAllMocks();
});

test('the privacy sheet is not blocked by a pending analytics config request', async () => {
  let resolveConfigure:
    | ((value: Awaited<ReturnType<typeof configure>>) => void)
    | undefined;
  mockedConfigure.mockReturnValue(
    new Promise((resolve) => {
      resolveConfigure = resolve;
    }),
  );
  mockedIsPrivacyNoticeConfirmed.mockResolvedValue(false);
  mockedTrack.mockResolvedValue();
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(<RootLayout />);
    await Promise.resolve();
  });

  const sheet = renderer?.root.find(
    (node) => node.props.testID === 'privacy-notice-sheet',
  );
  expect(sheet?.props.visible).toBe(true);
  expect(mockedTrack).not.toHaveBeenCalled();

  await act(async () => {
    resolveConfigure?.({
      anonId: 'anon-id',
      privacyNoticeConfirmed: false,
      enabled: true,
    });
    await Promise.resolve();
    renderer?.unmount();
  });
});

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The card fixes this version; keep fixtures independent from the implementation.
test.each([
  ['fresh install', null, null, true],
  ['legacy confirmation', 'true', null, true],
  ['current version', null, '2026-12-01', false],
  ['outdated version', 'true', '2026-01-01', true],
] satisfies [string, string | null, string | null, boolean][])('%s checks the accepted policy version at startup', async (_name, legacy, version, visible) => {
  if (legacy) await AsyncStorage.setItem('meetpr.analytics.privacy_notice_confirmed', legacy);
  if (version) await AsyncStorage.setItem('meetpr.legal.accepted_version', version);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<RootLayout />); });
    expect(renderer.root.findByProps({ testID: 'privacy-notice-sheet' }).props.visible).toBe(visible);
  } finally { act(() => renderer?.unmount()); }
});

test('fresh install accepts the current version and dismisses the sheet', async () => {
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<RootLayout />); });
    expect(renderer.root.findByProps({ testID: 'privacy-notice-sheet' }).props.visible).toBe(true);
    const agree = renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'Agree and continue')[0];
    expect(agree).toBeDefined();
    await act(async () => { await agree.props.onPress(); });
    expect(await AsyncStorage.getItem('meetpr.legal.accepted_version')).toBe('2026-12-01');
    expect(renderer.root.findByProps({ testID: 'privacy-notice-sheet' }).props.visible).toBe(false);
  } finally { act(() => renderer?.unmount()); }
});


test('demo mode skips the consent sheet without saving acceptance', async () => {
  const original = process.env.EXPO_PUBLIC_DEMO_MODE;
  process.env.EXPO_PUBLIC_DEMO_MODE = '1';
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<RootLayout />); });
    expect(renderer.root.findByProps({ testID: 'privacy-notice-sheet' }).props.visible).toBe(false);
    expect(await AsyncStorage.getItem('meetpr.legal.accepted_version')).toBeNull();
  } finally {
    act(() => renderer?.unmount());
    if (original === undefined) delete process.env.EXPO_PUBLIC_DEMO_MODE;
    else process.env.EXPO_PUBLIC_DEMO_MODE = original;
  }
});
