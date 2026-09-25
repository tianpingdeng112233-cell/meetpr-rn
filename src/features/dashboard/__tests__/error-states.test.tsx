import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import {
  DashboardAsyncSection,
  ProfileMetrics,
} from '../DashboardScreen';
import { setLocaleOverride } from '@/i18n';

jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});
jest.mock('@react-native-community/netinfo', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-community/netinfo/jest/netinfo-mock');
});

test('an error section renders retry copy without any supplied empty-state copy', () => {
  const retry = jest.fn();
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <DashboardAsyncSection isError onRetry={retry}>
        <Text>今日休息</Text>
        <Text>练几次就有趋势了</Text>
        <Text>暂无反馈</Text>
      </DashboardAsyncSection>,
    );
  });

  const copy = renderer?.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join(' ');
  expect(copy).toContain('数据加载失败');
  expect(copy).toContain('重试');
  expect(copy).not.toContain('今日休息');
  expect(copy).not.toContain('练几次就有趋势了');
  expect(copy).not.toContain('暂无反馈');

  const retryButton = renderer?.root.find(
    (node) => node.props.accessibilityRole === 'button',
  );
  act(() => retryButton?.props.onPress());
  expect(retry).toHaveBeenCalledTimes(1);
  act(() => renderer?.unmount());
});

test('a profile failure renders its own error row and retry action', () => {
  const retry = jest.fn();
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <ProfileMetrics
        now={new Date('2026-07-19T12:00:00Z')}
        onRetry={retry}
        profile={null}
        profileError
      />,
    );
  });

  const copy = renderer?.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join(' ');
  expect(copy).toContain('数据加载失败');
  expect(copy).toContain('重试');
  expect(copy).not.toContain('—');

  const retryButton = renderer?.root.find(
    (node) => node.props.accessibilityRole === 'button',
  );
  act(() => retryButton?.props.onPress());
  expect(retry).toHaveBeenCalledTimes(1);
  act(() => renderer?.unmount());
});

// Existing copy assertions pin the original Chinese presentation.
beforeEach(() => setLocaleOverride('zh'));
afterEach(() => setLocaleOverride(null));

test('missing profile values retain both metric placeholders like iOS', () => {
  setLocaleOverride('en');
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(<ProfileMetrics now={new Date('2026-09-25T12:00:00Z')} profile={null} profileError={false} onRetry={() => {}} />);
  });
  try {
    const copy = renderer!.root.findAllByType(Text).map(node => node.props.children).join(' ');
    expect(copy).toContain('Meet in');
    expect(copy).toContain('Not scheduled');
    expect(copy).toContain('Add a meet');
    expect(copy).toContain('Not entered');
    expect(copy).toContain('Add in Profile');
  } finally { act(() => renderer?.unmount()); }
});
