import { expect, jest, test } from '@jest/globals';
import { act } from 'react-test-renderer';
import { render, renderer, button, texts } from '../test-support/progress-screen';
import { setsRepository, plansRepository, type SetLog } from '@/api/domains';
import { E1RMScreen } from '../E1RMScreen';
import { setLocaleOverride, t } from '@/i18n';
import { day, plan, set } from '@/domain/plan/test-fixtures';
import { TrainingHistoryScreen } from '../TrainingHistoryScreen';
import { GrowthSourceSheet } from '../GrowthSourceSheet';
import { GrowthE1RMCard } from '../GrowthE1RMCard';

const addedLog: SetLog = {
  id: 'added-squat', student_id: 'student', plan_exercise_id: null, plan_day_id: 'day',
  exercise_id: 'squat', set_index: 0, weight_kg: '100', reps: 1, rpe: '10',
  completed: true, failed: false, assumed: false, adhoc: true,
  logged_date: '2026-09-09', logged_at: '2026-09-09T12:00:00Z',
};

test('progress explicitly requests all logs and includes student-added family records in e1RM and PR series', async () => {
  jest.mocked(setsRepository.range).mockImplementation(async (_student, range) => ({ logs: range.scope === 'all' ? [addedLog] : [] }));
  await render(<E1RMScreen />);
  await act(async () => button('Squat').props.onPress());
  const curve = renderer.root.findByType(GrowthE1RMCard).props.curve;
  expect(curve.series.currentKg).toBe(100);
  expect(curve.series.records).toHaveLength(1);
  await act(async () => renderer.root.findByType(GrowthE1RMCard).props.onSelect(curve.series.records[0]));
  expect(renderer.root.findByType(GrowthSourceSheet).props.detail.point.setLogId).toBe('added-squat');
  expect(setsRepository.range).toHaveBeenCalledWith('student', expect.objectContaining({ scope: 'all' }));
});

const cycle = plan([day('day', { exercises: [{ id: 'bench-plan', plan_day_id: 'day', exercise_id: 'bench',
  is_main_lift: true, sort_order: 0, notes: null, sets: [set({ target_value: '80' }), set({ id: 'second', set_number: 2, target_value: '80' })] }] })]);
const prescribedLog: SetLog = { ...addedLog, id: 'bench-log', plan_exercise_id: 'bench-plan', plan_day_id: undefined,
  exercise_id: 'bench', adhoc: false, weight_kg: '80', reps: 5, rpe: null };

test.each(['en', 'zh'] as const)('history renders student-added and extra records with localized markers in %s', async locale => {
  setLocaleOverride(locale);
  jest.mocked(plansRepository.list).mockResolvedValue({ plans: [cycle] });
  jest.spyOn(plansRepository, 'detail').mockResolvedValue(cycle);
  jest.mocked(setsRepository.range).mockImplementation(async (_student, range) => ({ logs: [prescribedLog,
    { ...prescribedLog, id: 'extra-bench', set_index: 2, weight_kg: '90' }, ...(range.scope === 'all' ? [addedLog] : [])] }));
  await render(<TrainingHistoryScreen />);
  expect(texts()).toContain(t('student.added.added'));
  expect(texts()).toContain(t('student.added.extra'));
  expect(texts()).toContain('90 kg × 5');
  expect(texts()).toContain('100 kg × 1 @ RPE 10.0');
  expect(texts()).toContain(t('student.historyEntriesView.copy004', [1, 2]));
});

test('legacy history responses without plan_day_id keep prescribed records visible when scope is ignored', async () => {
  jest.mocked(plansRepository.list).mockResolvedValue({ plans: [cycle] });
  jest.spyOn(plansRepository, 'detail').mockResolvedValue(cycle);
  jest.mocked(setsRepository.range).mockResolvedValue({ logs: [prescribedLog] });
  await render(<TrainingHistoryScreen />);
  expect(texts()).toContain('80 kg × 5');
  expect(texts()).toContain(t('student.historyEntriesView.copy004', [1, 2]));
  expect(texts()).not.toContain(t('student.added.added'));
  expect(texts()).not.toContain(t('student.added.extra'));
});
