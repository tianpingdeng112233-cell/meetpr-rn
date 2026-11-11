import { afterEach, expect, jest, test } from '@jest/globals';
import { type ReactElement } from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import StudentTabs from '@/app/(student)/_layout';
import { useSessionStore } from '@/api/session';
import Index from '@/app/index';
import { t } from '@/i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/navigation/BindGate', () => ({ BindGate: ({ children }: { children: unknown }) => children }));
let mockCount = 4;
let mockSelected = 'training';
let mockInitial = '';
const mockNavigate = jest.fn();
jest.mock('@/features/chat/open-coach-chat', () => ({ useOpenCoachChat: () => ({ totalUnread: mockCount }) }));
jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Tabs = ({ children, tabBar, initialRouteName }: { initialRouteName: string; children: ReactElement[]; tabBar: (props: object) => ReactElement }) => {
    const screens = React.Children.toArray(children) as ReactElement<{ name: string; options: object }>[];
    mockInitial = initialRouteName;
    return tabBar({
      state: { index: screens.findIndex(s => s.props.name === mockSelected), routes: screens.map(screen => ({ key: screen.props.name, name: screen.props.name })) },
      descriptors: Object.fromEntries(screens.map(screen => [screen.props.name, { options: screen.props.options }])),
      insets: { bottom: 0, left: 0, right: 0, top: 0 }, navigation: { emit: () => ({ defaultPrevented: false }), navigate: mockNavigate },
    });
  };
  Tabs.Screen = function Screen() { return null; };
  return { Tabs, Redirect: (props: object) => React.createElement('Redirect', props) };
});
let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });

test('cold start lands on training and coached tabs keep one unread badge, hidden while reading', async () => {
  useSessionStore.setState({ bootstrapped: true, status: 'authenticated', user: { id: 'student', role: 'coached_student', phone: '', created_at: '' } });
  await act(async () => { renderer = create(<Index />); });
  expect(renderer.root.findByType('Redirect' as never).props.href).toBe('/(student)/training');
  await act(async () => { renderer.update(<StudentTabs />); });
  expect(mockInitial).toBe('training');
  const labels = () => renderer.root.findAll(node => node.props.accessibilityRole === 'tab', { deep: false }).map(n => n.props.accessibilityLabel);
  expect(labels()).toEqual([t('student.studentRootView.copy002'), t('student.coachTab.title'), t('student.studentRootView.copy003'), t('student.studentRootView.copy004')]);
  expect(renderer.root.findAllByType(Text).filter(n => n.props.children === 4)).toHaveLength(1);
  mockSelected = 'chat';
  await act(async () => { renderer.update(<StudentTabs />); });
  expect(renderer.root.findAllByType(Text).filter(n => n.props.children === 4)).toHaveLength(0);
  mockSelected = 'training';
  await act(async () => { useSessionStore.setState({ user: { id: 'self', role: 'self_train_student', phone: '', created_at: '' } }); });
  expect(labels()).toEqual([t('student.studentRootView.copy002'), t('student.studentRootView.copy003'), t('student.studentRootView.copy004')]);
});

test('the highlighted Growth tab returns from body weight to its menu', async () => {
  useSessionStore.setState({ user: { id: 'student', role: 'coached_student', phone: '', created_at: '' } });
  mockSelected = 'body-weight';
  await act(async () => { renderer = create(<StudentTabs />); });
  const tab = renderer.root.find(node => node.props.accessibilityRole === 'tab' && node.props.accessibilityLabel === t('student.studentRootView.copy003') && typeof node.props.onPress === 'function');
  expect(tab.props.accessibilityState.selected).toBe(true);
  act(() => tab.props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('growth', undefined);
  mockSelected = 'training';
});
