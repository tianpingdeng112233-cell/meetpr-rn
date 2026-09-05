import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { setLocaleOverride } from '@/i18n';
import {
  useExerciseCatalog,
  useOnboardingProfile,
  usePlan,
  usePlans,
  useSetLogs,
  type PlanDetail,
} from '@/api/domains';

import { TrainingCTA, WeekGrid } from '../DashboardScreen';
import { useDashboardViewModel } from '../use-dashboard';
import { useWeekOverviewViewModel } from '../week-overview';

jest.mock('@/api/domains', () => ({
  buildExerciseIndex: () => new Map(),
  useExerciseCatalog: jest.fn(),
  useOnboardingProfile: jest.fn(),
  usePlan: jest.fn(),
  usePlans: jest.fn(),
  useSetLogs: jest.fn(),
}));
jest.mock('@/api/session', () => ({
  useSessionStore: (selector: (state: { user: { role: string } }) => unknown) =>
    selector({ user: { role: 'coached_student' } }),
}));
jest.mock('@/analytics', () => ({
  AnalyticsEvent: { PlanViewed: 'plan_viewed' },
  track: jest.fn(),
}));
jest.mock('@/features/student-tabs', () => ({
  useStudentTabsStore: (
    selector: (state: { planRevision: number; todayReloadToken: number }) => unknown,
  ) => selector({ planRevision: 0, todayReloadToken: 0 }),
}));
jest.mock('../feedback-inbox', () => ({
  useFeedbackInboxViewModel: () => ({
    items: [],
    latest: null,
    unreadCount: 0,
    isLoading: false,
    isError: false,
    reload: jest.fn(async () => undefined),
  }),
}));
jest.mock('../plan-seen', () => ({
  dashboardPlanSignature: () => ({
    planId: '30000000-0000-4000-8000-000000000000',
    publishedAt: '2026-07-01T00:00:00Z',
  }),
  dashboardPlanSignatureKey: () => 'plan-signature',
  hasSeenDashboardPlan: jest.fn(async () => true),
  markDashboardPlanSeen: jest.fn(async () => undefined),
}));
jest.mock('../week-overview', () => ({
  useWeekOverviewViewModel: jest.fn(),
}));

const STUDENT_ID = '10000000-0000-4000-8000-000000000000';
const PLAN_ID = '30000000-0000-4000-8000-000000000000';
const DAY_ID = '40000000-0000-4000-8000-000000000000';

afterEach(() => {
  jest.useRealTimers();
});

const plan: PlanDetail = {
  id: PLAN_ID,
  coach_id: '20000000-0000-4000-8000-000000000000',
  trainee_id: STUDENT_ID,
  name: '力量周期',
  start_date: '2026-07-13',
  end_date: '2026-08-09',
  plan_weeks: 4,
  source: 'coach',
  source_template_id: null,
  status: 'published',
  kind: 'regular',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  total_shift_days: 0,
  latest_shift_created_at: null,
  days: [],
};

test('a failed profile request surfaces an e1RM error instead of nil-profile family fallback', () => {
  const refetch = jest.fn(async () => undefined);
  const profileRefetch = jest.fn(async () => undefined);

  jest.mocked(usePlans).mockReturnValue({
    data: { plans: [plan] },
    isPending: false,
    isError: false,
    refetch,
  } as never);
  jest.mocked(usePlan).mockReturnValue({
    data: plan,
    isPending: false,
    isError: false,
    refetch,
  } as never);
  jest.mocked(useExerciseCatalog).mockReturnValue({
    data: {
      exercises: [
        {
          id: DAY_ID,
          name: '低杠深蹲',
          name_en: null,
          exercise_type: 'main',
          main_lift_family: 'squat',
          is_competition_lift: true,
          competition_stance: 'low_bar',
          muscle_groups: null,
          equipment: null,
          movement_pattern: null,
          created_by_coach_id: null,
          created_at: '2026-07-01T00:00:00Z',
        },
      ],
    },
    isPending: false,
    isError: false,
    refetch,
  } as never);
  // The profile REQUEST fails — this must not be read as "no profile".
  jest.mocked(useOnboardingProfile).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: true,
    refetch: profileRefetch,
  } as never);
  jest.mocked(useSetLogs).mockReturnValue({
    data: { logs: [] },
    isPending: false,
    isError: false,
    refetch,
  } as never);
  jest.mocked(useWeekOverviewViewModel).mockReturnValue({
    state: {
      status: 'loaded',
      plan,
      days: [],
      logs: [],
      weekIndex: 1,
      weekStart: '2026-07-13',
      weekEndExclusive: '2026-07-20',
    },
    reload: refetch,
  });

  function Harness() {
    const vm = useDashboardViewModel(STUDENT_ID);
    return (
      <>
        <Text>{vm.e1rm.isError ? 'e1RM区块错误' : 'e1RM区块正常'}</Text>
        <Text>{vm.e1rm.point === null ? '无展示点' : '有展示点'}</Text>
      </>
    );
  }

  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(<Harness />);
  });
  const copy = renderer?.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join(' ');
  expect(copy).toContain('e1RM区块错误');
  expect(copy).toContain('无展示点');
  act(() => renderer?.unmount());
});

test('a catalog failure does not hide the week grid or disable its CTA', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-07-19T12:00:00Z'));
  const refetch = jest.fn(async () => undefined);
  const selectDate = jest.fn();
  const openTraining = jest.fn();
  const unresolvedDay = {
    date: '2026-07-19',
    day: {
      id: DAY_ID,
      plan_id: PLAN_ID,
      day_of_week: 7,
      week_number: 1,
      sort_order: 1,
      shifted_to_date: null,
      exercises: [],
    },
    lift: null,
    completion: 0.5,
    status: 'partial' as const,
  };

  jest.mocked(usePlans).mockReturnValue({
    data: { plans: [plan] },
    isPending: false,
    isError: false,
    refetch,
  } as never);
  jest.mocked(usePlan).mockReturnValue({
    data: plan,
    isPending: false,
    isError: false,
    refetch,
  } as never);
  jest.mocked(useExerciseCatalog).mockReturnValue({
    data: undefined,
    isError: true,
    isSuccess: false,
    refetch,
  } as never);
  jest.mocked(useOnboardingProfile).mockReturnValue({
    data: null,
    isError: false,
    isSuccess: true,
    refetch,
  } as never);
  jest.mocked(useSetLogs).mockReturnValue({
    data: { logs: [] },
    isPending: false,
    isError: false,
    refetch,
  } as never);
  jest.mocked(useWeekOverviewViewModel).mockReturnValue({
    state: {
      status: 'loaded',
      plan,
      days: [unresolvedDay],
      logs: [],
      weekIndex: 1,
      weekStart: '2026-07-13',
      weekEndExclusive: '2026-07-20',
    },
    reload: refetch,
  });

  function Harness() {
    const vm = useDashboardViewModel(STUDENT_ID);
    return (
      <>
        <Text>{vm.plans.isError ? '计划失败' : '计划可用'}</Text>
        <WeekGrid
          days={vm.week.status === 'loaded' ? vm.week.days : []}
          onSelect={selectDate}
          selectedDate={vm.selectedDate}
        />
        <TrainingCTA cta={vm.cta} onPress={openTraining} />
      </>
    );
  }

  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(<Harness />);
  });

  const copy = renderer?.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join(' ');
  expect(copy).toContain('计划可用');
  expect(copy).toContain('继续 W1D1 · 锻炼');
  expect(
    renderer?.root.find(
      (node) => node.props?.accessibilityLabel === '周日 训练',
    ),
  ).toBeDefined();

  const cta = renderer?.root.find(
    (node) =>
      node.props?.accessibilityRole === 'button' &&
      node.findAllByType(Text).some((text) => text.props.children === '继续 W1D1 · 锻炼'),
  );
  act(() => cta?.props.onPress());
  expect(openTraining).toHaveBeenCalledTimes(1);
  act(() => renderer?.unmount());
});

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Existing copy assertions pin the original Chinese presentation.
beforeEach(() => setLocaleOverride('zh'));
afterEach(() => setLocaleOverride(null));
