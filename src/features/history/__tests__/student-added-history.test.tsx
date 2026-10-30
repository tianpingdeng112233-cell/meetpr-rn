import { afterEach, expect, jest, test } from '@jest/globals';
import { StyleSheet, Text, View } from 'react-native';
import { act } from 'react-test-renderer';
import { render, renderer, button, texts, textOf } from '../test-support/progress-screen';
import { setsRepository, plansRepository, type SetLog } from '@/api/domains';
import { E1RMScreen } from '../E1RMScreen';
import { setLocaleOverride, t } from '@/i18n';
import { day, plan, set } from '@/domain/plan/test-fixtures';
import { TrainingHistoryScreen } from '../TrainingHistoryScreen';
import { GrowthSourceSheet } from '../GrowthSourceSheet';
import { GrowthE1RMCard } from '../GrowthE1RMCard';
import { videosRepository } from '@/api/domains/videos';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { VideoPlayback } from '@/features/training/video-upload/VideoPlayback';

import { EMPTY_VIDEO_UPLOAD } from '@/features/training/video-upload/model';
import { resetVideoUploadStoreForTests, useVideoUploadStore } from '@/features/training/video-upload/store';

afterEach(() => resetVideoUploadStoreForTests());

jest.mock('react-native-video', () => 'Video');

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
  expect(texts()).toContain('90kg × 5');
  expect(texts()).toContain('100kg × 1 @ RPE 10');
  // iOS HistorySetRow parity: the added tag sits beside the exercise name, not on its own line.
  const tag = renderer.root.findAllByType(Text).find(node => textOf(node) === t('student.added.added'))!;
  expect(tag.parent!.findAllByType(Text).map(textOf)).toEqual([expect.any(String), t('student.added.added')]);
  expect(texts()).toContain(t('student.historyEntriesView.copy004', [1, 2]));
});

test('legacy history responses without plan_day_id keep prescribed records visible when scope is ignored', async () => {
  jest.mocked(plansRepository.list).mockResolvedValue({ plans: [cycle] });
  jest.spyOn(plansRepository, 'detail').mockResolvedValue(cycle);
  jest.mocked(setsRepository.range).mockResolvedValue({ logs: [prescribedLog] });
  await render(<TrainingHistoryScreen />);
  expect(texts()).toContain('80kg × 5');
  expect(texts()).toContain('80kg x 5');
  expect(texts()).toContain(t('student.historyEntriesView.copy004', [1, 2]));
  expect(texts()).not.toContain(t('student.added.added'));
  expect(texts()).not.toContain(t('student.added.extra'));
});

test('history replays videos for prescribed, extra and student-added rows', async () => {
  const logs = [prescribedLog, { ...prescribedLog, id: 'extra-bench', set_index: 2, weight_kg: '90' }, addedLog];
  jest.mocked(plansRepository.list).mockResolvedValue({ plans: [cycle] });
  jest.spyOn(plansRepository, 'detail').mockResolvedValue(cycle);
  jest.mocked(setsRepository.range).mockResolvedValue({ logs });
  jest.spyOn(videosRepository, 'list').mockResolvedValue({ videos: logs.map((log, index) => ({ id: `video-${index}`, set_log_id: log.id, plan_exercise_id: log.plan_exercise_id, created_at: log.logged_at, logged_at: log.logged_at, exercise_name: null, set_index: log.set_index, weight_kg: log.weight_kg, reps: log.reps, content_type: 'video/mp4', size_bytes: 100, filename: null })) });
  await render(<TrainingHistoryScreen />);
  const playButtons = renderer.root.findAllByType(FeedbackPressable).filter(node => node.props.accessibilityLabel === t('chat.playVideo'));
  expect(playButtons).toHaveLength(3);
  for (const button of playButtons) {
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({ width: 22, height: 22 });
    expect(button.props.hitSlop).toBe(11);
    let slot = button.parent!;
    while (slot.type !== View) slot = slot.parent!;
    expect(StyleSheet.flatten(slot.props.style)).toMatchObject({ position: 'absolute', width: 44, height: 44 });
    const column = slot.parent!;
    expect(StyleSheet.flatten(column.props.style)).toEqual({ width: 22, alignSelf: 'stretch' });
  }
  await act(async () => playButtons[2].props.onPress());
  expect(renderer.root.findByType(VideoPlayback).props.readOnly).toBe(true);
});


test.each([
  { videoLogId: 'bench-log', pending: null }, { videoLogId: 'extra-bench', pending: null },
  { videoLogId: 'added-squat', pending: null }, { videoLogId: null, pending: null },
  { videoLogId: 'bench-log', pending: 'uploading' }, { videoLogId: 'bench-log', pending: 'failed' },
] as const)('history reserves a video column only within the exercise with playable video: $videoLogId / $pending', async ({ videoLogId, pending }) => {
  if (pending) useVideoUploadStore.setState({ hydrated: true, records: { 'student:extra:bench-plan:2': {
    ...EMPTY_VIDEO_UPLOAD, status: pending, setLogId: 'extra-bench',
  } } });
  const logs = [prescribedLog, { ...prescribedLog, id: 'extra-bench', set_index: 2, weight_kg: '90' }, addedLog,
    { ...addedLog, id: 'second-added', set_index: 1, weight_kg: '110' }];
  jest.mocked(plansRepository.list).mockResolvedValue({ plans: [cycle] });
  jest.spyOn(plansRepository, 'detail').mockResolvedValue(cycle);
  jest.mocked(setsRepository.range).mockResolvedValue({ logs });
  jest.spyOn(videosRepository, 'list').mockResolvedValue({ videos: videoLogId ? [{ id: 'video', set_log_id: videoLogId,
    plan_exercise_id: null, created_at: addedLog.logged_at, logged_at: addedLog.logged_at, exercise_name: null,
    set_index: 0, weight_kg: '80', reps: 5, content_type: 'video/mp4', size_bytes: 100, filename: null }] : [] });
  await render(<TrainingHistoryScreen />);
  const rows = ['90kg × 5', '100kg × 1 @ RPE 10'].flatMap(label => {
    let row = renderer.root.findAllByType(Text).find(node => node.props.children === label)!.parent!;
    while (row.type !== View) row = row.parent!;
    let block = row.parent!;
    while (block.type !== View) block = block.parent!;
    return block.findAllByType(View).filter(node => StyleSheet.flatten(node.props.style)?.minHeight === 32);
  });
  expect(rows).toHaveLength(5);
  rows.forEach((row, index) => {
    const reserved = videoLogId !== null && (index < 3 ? videoLogId !== 'added-squat' : videoLogId === 'added-squat');
    const slots = row.findAllByType(View).filter(node => StyleSheet.flatten(node.props.style)?.width === 22 && StyleSheet.flatten(node.props.style)?.alignSelf === 'stretch');
    expect(slots).toHaveLength(reserved ? 1 : 0);
    const value = row.findAllByType(Text)[1];
    const valueStyle = StyleSheet.flatten(value.props.style);
    expect(valueStyle.flex).toBe(reserved ? 1 : undefined);
    expect(valueStyle.textAlign).toBe(reserved ? 'right' : undefined);
    expect(valueStyle.marginRight).toBe(reserved ? 8 : undefined);
    expect(StyleSheet.flatten(row.props.style)).toEqual({ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 32 });
  });
});


test.each(['bodyweight', 'free_weight'] as const)('056 history uses %s independent intensity, never the legacy projection', async load_mode => {
  setLocaleOverride('zh');
  const projected = { ...cycle, days: cycle.days.map(day => ({ ...day, exercises: day.exercises.map(exercise => ({ ...exercise,
    sets: exercise.sets.map(set => ({ ...set, load_mode, intensity_mode: 'rpe' as const, target_value: '10.00' })),
  })) })) };
  jest.mocked(plansRepository.list).mockResolvedValue({ plans: [projected] });
  jest.spyOn(plansRepository, 'detail').mockResolvedValue(projected);
  jest.mocked(setsRepository.range).mockResolvedValue({ logs: [prescribedLog] });
  await render(<TrainingHistoryScreen />);
  expect(texts()).toContain('80kg × 5'); // Actual records still win over a prescription.
  expect(texts().join(' ')).not.toContain('RPE 10');
  expect(texts()).toContain(load_mode === 'bodyweight' ? '5 · 自重' : '5 · 自选重量');
});
