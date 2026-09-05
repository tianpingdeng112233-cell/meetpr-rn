import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  configure,
  isPrivacyNoticeConfirmed,
  track,
} from '@/analytics';
import RootLayout from '@/app/_layout';

jest.mock('@/analytics', () => {
  // Jest hoists this factory before React imports are initialized.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    AnalyticsEvent: { AppOpen: 'app_open' },
    configure: jest.fn(),
    isPrivacyNoticeConfirmed: jest.fn(),
    PrivacyNoticeSheet: (props: { visible: boolean }) =>
      React.createElement('privacy-notice-sheet', {
        ...props,
        testID: 'privacy-notice-sheet',
      }),
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
