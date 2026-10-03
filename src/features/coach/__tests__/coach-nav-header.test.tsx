import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { setLocaleOverride, t } from '@/i18n';
import { CoachNavHeader } from '../CoachNavHeader';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(() => true), navigate: jest.fn() } }));
let renderer: ReactTestRenderer;
const backButton = () => renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('coach.videoFeedback.back'));
beforeEach(() => { jest.clearAllMocks(); setLocaleOverride('en'); jest.mocked(router.canGoBack).mockReturnValue(true); });
afterEach(() => { act(() => renderer?.unmount()); setLocaleOverride(null); });

test('renders a centered title and optional subtitle', async () => {
  await act(async () => { renderer = create(<CoachNavHeader title="Sam" subtitle="Active student" />); });
  const title = renderer.root.findAllByType(Text).find(node => node.props.children === 'Sam');
  const subtitle = renderer.root.findAllByType(Text).find(node => node.props.children === 'Active student');
  expect(title?.props).toMatchObject({ numberOfLines: 1, style: { fontSize: 16, textAlign: 'center' } });
  expect(subtitle?.props.style).toMatchObject({ fontSize: 11, textAlign: 'center' });
  act(() => { renderer.update(<CoachNavHeader title="Sam" />); });
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).not.toContain('Active student');
});

test('default back navigates to today when there is no history', async () => {
  jest.mocked(router.canGoBack).mockReturnValue(false);
  await act(async () => { renderer = create(<CoachNavHeader title="Sam" />); });
  act(() => backButton().props.onPress());
  expect(router.navigate).toHaveBeenCalledWith('/(coach)/(tabs)/today');
  expect(router.back).not.toHaveBeenCalled();
});
test('accessible back control invokes the supplied action', async () => {
  const onBack = jest.fn();
  await act(async () => { renderer = create(<CoachNavHeader title="Sam" onBack={onBack} />); });
  expect(backButton().props).toMatchObject({ accessibilityRole: 'button', style: { width: 44, height: 44 } });
  act(() => backButton().props.onPress());
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(router.back).not.toHaveBeenCalled();
});

test('default back pops existing history', async () => {
  await act(async () => { renderer = create(<CoachNavHeader title="Sam" />); });
  act(() => backButton().props.onPress());
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.navigate).not.toHaveBeenCalled();
});

test('renders supplied trailing content', async () => {
  await act(async () => { renderer = create(<CoachNavHeader title="Sam" trailing={<Text>Details</Text>} />); });
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain('Details');
});
