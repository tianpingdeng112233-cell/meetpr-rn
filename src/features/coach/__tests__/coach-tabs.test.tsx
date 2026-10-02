import { afterEach, expect, jest, test } from '@jest/globals';
import { Children, type ReactElement } from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import CoachTabs from '@/app/(coach)/(tabs)/_layout';
import { t } from '@/i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/analytics', () => ({ AnalyticsEvent: { ScreenView: 'screen_view' }, track: jest.fn() }));
let mockCount = 0;
jest.mock('@/features/coach/CoachDataProvider', () => ({
  useCoachData: () => ({ applications: Array.from({ length: mockCount }, (_, id) => ({ id: String(id) })), videos: [], conversations: [] }),
}));
jest.mock('@/features/coach/receiving/use-coach-receiving', () => ({ useCoachMessagesBadge: () => mockCount }));
jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Tabs = ({ children, tabBar }: { children: ReactElement[]; tabBar: (props: object) => ReactElement }) => {
    const screens = React.Children.toArray(children) as ReactElement<{ name: string; options: object }>[];
    return tabBar({
      state: { index: 0, routes: screens.map(screen => ({ key: screen.props.name, name: screen.props.name })) },
      descriptors: Object.fromEntries(screens.map(screen => [screen.props.name, { options: screen.props.options }])),
      insets: { bottom: 0, left: 0, right: 0, top: 0 }, navigation: { emit: jest.fn(), navigate: jest.fn() },
    });
  };
  Tabs.Screen = function Screen() { return null; };
  return { Tabs };
});
let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });

test.each([0, 1, 42, 120])('coach tabs display numeric badges for count %s', async (count) => {
  mockCount = count;
  await act(async () => { renderer = create(<CoachTabs />); });
  for (const label of [t('coach.chat.messages'), t('coach.shell.students')]) {
    const tab = renderer.root.findAll(node => node.props.accessibilityRole === 'tab' && node.props.accessibilityLabel === label)[0];
    const text = tab.findAllByType(Text).flatMap(node => Children.toArray(node.props.children).map(String));
    expect(text).toEqual(count === 0 ? [label] : [count > 99 ? '99+' : String(count), label]);
  }
});
