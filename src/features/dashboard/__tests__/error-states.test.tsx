import { expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import {
  DashboardAsyncSection,
  ProfileMetrics,
  TrainingCTA,
  WeekGrid,
} from '../DashboardScreen';
import type { DashboardWeekDay } from '../types';

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
  expect(copy).toContain('加载失败');
  expect(copy).toContain('点击重试');
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

test('an unresolved catalog family keeps the week cell and training CTA usable', () => {
  const selectDate = jest.fn();
  const openTraining = jest.fn();
  const unresolvedDay: DashboardWeekDay = {
    date: '2026-07-20',
    day: {
      id: '30000000-0000-4000-8000-000000000001',
      plan_id: '30000000-0000-4000-8000-000000000002',
      day_of_week: 1,
      week_number: 1,
      sort_order: 1,
      shifted_to_date: null,
      exercises: [],
    },
    lift: null,
    completion: 0.5,
    status: 'partial',
  };
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <>
        <WeekGrid
          days={[unresolvedDay]}
          onSelect={selectDate}
          selectedDate={unresolvedDay.date}
        />
        <TrainingCTA
          cta={{ interactive: true, label: '继续 W1D1 · 锻炼' }}
          onPress={openTraining}
        />
      </>,
    );
  });

  const weekCell = renderer?.root.find(
    (node) => node.props?.accessibilityLabel === '周一 训练',
  );
  const cta = renderer?.root.find(
    (node) =>
      node.props?.accessibilityRole === 'button' &&
      node.findAllByType(Text).some((text) => text.props.children === '继续 W1D1 · 锻炼'),
  );
  expect(weekCell).toBeDefined();
  expect(cta).toBeDefined();

  act(() => weekCell?.props.onPress());
  act(() => cta?.props.onPress());
  expect(selectDate).toHaveBeenCalledWith('2026-07-20');
  expect(openTraining).toHaveBeenCalledTimes(1);
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
  expect(copy).toContain('加载失败');
  expect(copy).toContain('点击重试');
  expect(copy).not.toContain('—');

  const retryButton = renderer?.root.find(
    (node) => node.props.accessibilityRole === 'button',
  );
  act(() => retryButton?.props.onPress());
  expect(retry).toHaveBeenCalledTimes(1);
  act(() => renderer?.unmount());
});
