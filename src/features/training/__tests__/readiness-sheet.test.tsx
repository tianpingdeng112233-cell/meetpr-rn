import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { useSubmitReadiness, type ReadinessSubmitRequest } from '@/api/domains/readiness';
import { setLocaleOverride, t } from '@/i18n';
import { ReadinessSheet } from '../ReadinessSheet';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/api/domains/readiness', () => ({ useSubmitReadiness: jest.fn() }));

const mutateAsync = jest.fn<(input: ReadinessSubmitRequest) => Promise<unknown>>();
const onComplete = jest.fn();
const onSkip = jest.fn();
let renderer: ReactTestRenderer;

beforeEach(() => {
  jest.clearAllMocks();
  setLocaleOverride('en');
  mutateAsync.mockResolvedValue({});
  jest.mocked(useSubmitReadiness).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useSubmitReadiness>);
  act(() => {
    renderer = create(<ReadinessSheet date="2026-09-05" studentId="student-1" onComplete={onComplete} onSkip={onSkip} />);
  });
});

afterEach(() => {
  act(() => renderer?.unmount());
  setLocaleOverride(null);
});

function button(label: string) {
  return renderer.root.findByProps({ accessibilityLabel: label });
}

function press(label: string) {
  const target = button(label);
  expect(target).toBeDefined();
  expect(target.props.disabled).not.toBe(true);
  act(() => target.props.onPress());
}

function chooseScores() {
  press(t('student.readinessCheckinSheet.copy012', [t('student.readinessCheckinSheet.copy003'), 3]));
  press(t('student.readinessCheckinSheet.copy012', [t('student.readinessCheckinSheet.copy006'), 4]));
  press(t('student.readinessCheckinSheet.copy012', [t('student.readinessCheckinSheet.copy009'), 5]));
}

test('Next stays disabled until all three scales are picked, then opens step two', () => {
  const next = t('student.readinessCheckinSheet.copy016');
  expect(button(next).props.disabled).toBe(true);
  press(t('student.readinessCheckinSheet.copy012', [t('student.readinessCheckinSheet.copy003'), 3]));
  press(t('student.readinessCheckinSheet.copy012', [t('student.readinessCheckinSheet.copy006'), 4]));
  expect(button(next).props.disabled).toBe(true);
  press(t('student.readinessCheckinSheet.copy012', [t('student.readinessCheckinSheet.copy009'), 5]));
  expect(button(next).props.disabled).toBe(false);
  press(next);
  expect(renderer.root.findAllByType(Text).map((node) => node.props.children))
    .toContain(t('student.readinessCheckinSheet.copy001', [2]));
});

test('a muscle chip cycles through three dots and clears on the fourth tap', () => {
  chooseScores();
  press(t('student.readinessCheckinSheet.copy016'));
  const name = t('student.readinessCheckinSheet.copy020');
  for (let level = 0; level < 3; level++) {
    press(t('student.readinessCheckinSheet.copy019', [name, level]));
  }
  expect(button(t('student.readinessCheckinSheet.copy019', [name, 3]))
    .findAllByType(Text).map((node) => node.props.children)).toEqual([name, '···']);
  press(t('student.readinessCheckinSheet.copy019', [name, 3]));
  expect(button(t('student.readinessCheckinSheet.copy019', [name, 0]))
    .findAllByType(Text).map((node) => node.props.children)).toEqual([name, ' ']);
});

test('Done submits the selected muscles using the eight canonical wire values and completes', async () => {
  chooseScores();
  press(t('student.readinessCheckinSheet.copy016'));
  for (const key of [
    'student.readinessCheckinSheet.copy020', 'student.readinessCheckinSheet.copy021',
    'student.readinessCheckinSheet.copy022', 'student.readinessCheckinSheet.copy023',
    'student.readinessCheckinSheet.copy024', 'student.readinessCheckinSheet.copy025',
    'student.readinessCheckinSheet.copy026', 'student.readinessCheckinSheet.copy027',
  ] as const) {
    press(t('student.readinessCheckinSheet.copy019', [t(key), 0]));
  }
  await act(async () => { press(t('student.readinessCheckinSheet.copy018')); });
  expect(mutateAsync).toHaveBeenCalledWith({
    checkin_date: '2026-09-05', sleep_quality: 3, mood: 4, stress: 5,
    muscle_fatigue: [
      { muscle_group: 'quad', severity: 1 }, { muscle_group: 'hamstring', severity: 1 },
      { muscle_group: 'glute', severity: 1 }, { muscle_group: 'back', severity: 1 },
      { muscle_group: 'chest', severity: 1 }, { muscle_group: 'shoulder', severity: 1 },
      { muscle_group: 'triceps', severity: 1 }, { muscle_group: 'core', severity: 1 },
    ],
  });
  expect(onComplete).toHaveBeenCalledTimes(1);
});

test('cleared muscles are omitted and submitting without fatigue is allowed', async () => {
  chooseScores();
  press(t('student.readinessCheckinSheet.copy016'));
  for (let level = 0; level < 4; level++) {
    press(t('student.readinessCheckinSheet.copy019', [t('student.readinessCheckinSheet.copy020'), level]));
  }
  await act(async () => { press(t('student.readinessCheckinSheet.copy018')); });
  expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ muscle_fatigue: [] }));
  expect(onComplete).toHaveBeenCalledTimes(1);
});

test('a failed submission shows an alert and can be retried with the same answers', async () => {
  mutateAsync.mockRejectedValueOnce(new Error('offline'));
  chooseScores();
  press(t('student.readinessCheckinSheet.copy016'));
  await act(async () => { press(t('student.readinessCheckinSheet.copy018')); });
  expect(renderer.root.findByProps({ accessibilityRole: 'alert' }).findAllByType(Text)
    .map((node) => node.props.children)).toContain(t('student.readinessCheckinViewModel.copy002'));
  expect(onComplete).not.toHaveBeenCalled();
  await act(async () => { press(t('student.readinessCheckinSheet.copy018')); });
  expect(mutateAsync.mock.calls[1]).toEqual(mutateAsync.mock.calls[0]);
  expect(onComplete).toHaveBeenCalledTimes(1);
});

test('a pending submission exposes the loading label and disables Done', () => {
  chooseScores();
  press(t('student.readinessCheckinSheet.copy016'));
  jest.mocked(useSubmitReadiness).mockReturnValue({ mutateAsync, isPending: true } as unknown as ReturnType<typeof useSubmitReadiness>);
  act(() => {
    renderer.update(<ReadinessSheet date="2026-09-05" studentId="student-1" onComplete={onComplete} onSkip={onSkip} />);
  });
  const submitting = button(t('student.readinessCheckinSheet.copy017'));
  expect(submitting.props.disabled).toBe(true);
  expect(submitting.props.accessibilityState.busy).toBe(true);
});
