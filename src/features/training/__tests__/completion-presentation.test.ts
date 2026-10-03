import { afterEach, beforeEach, expect, test } from '@jest/globals';
import { day, set } from '@/domain/plan/test-fixtures';
import { setLocaleOverride, t } from '@/i18n';
import { synthesizeDrafts } from '../drafts';
import { workoutCompletionPresentation } from '../completion-presentation';

const main = { id: 'main', plan_day_id: 'day', exercise_id: 'squat', is_main_lift: true, sort_order: 0, notes: null, sets: [1, 2].map(n => set({ id: `main-${n}`, set_number: n, intensity_mode: 'rpe', target_value: '8' })) };
const accessory = { ...main, id: 'accessory', exercise_id: 'bench', sort_order: 1, sets: [set({ id: 'accessory-1', intensity_mode: 'rpe', target_value: '8' })] };
const planDay = day('day', { exercises: [main, accessory] });
const drafts = synthesizeDrafts(planDay, []).map((draft, i) => ({ ...draft, status: i === 2 ? 'failed' as const : 'complete' as const, weightText: ['100', '90', '20'][i], repsText: '5', rpeText: ['8', '8.5', '9'][i] }));
const input = { planDay, drafts, weekCode: 'W1D3', coachName: null, references: new Map(), previousVolumeChangePercent: null, date: '2026-09-09', exerciseNames: new Map([['squat', 'Squat'], ['bench', 'Bench']]) };
beforeEach(() => setLocaleOverride('en'));
afterEach(() => setLocaleOverride(null));

test('completed session counts failed sets in work, but not in successful sets', () => {
  expect(workoutCompletionPresentation(input)).toMatchObject({
    completedSuccessfulSets: 2, totalPlannedSets: 3,
    setCompletionLabel: t('student.workoutCompletionPresentation.copy005', [1]),
    totalReps: 15, mainRPEText: '8.3', totalVolumeText: '1,050',
    averageRPEText: '8.5', exerciseCount: 2, completedSetCount: 3,
    planComparisonText: t('student.workoutCompletionPresentation.copy010'),
  });
});

test('exercise performance chooses weight then reps and compares with historical best', () => {
  const result = workoutCompletionPresentation({ ...input, references: new Map([['squat', { weightKg: 95, reps: 8 }], ['bench', { weightKg: 20, reps: 4 }]]) });
  expect(result.exercises).toEqual([
    { id: 'main', name: 'Squat', bestSetText: '100kg × 5 @8', isPersonalRecord: true, completedSetCount: 2, failedSetCount: 0, statusText: t('student.workoutCompletionPresentation.copy002', [2]) },
    { id: 'accessory', name: 'Bench', bestSetText: '20kg × 5 @9', isPersonalRecord: true, completedSetCount: 1, failedSetCount: 1, statusText: t('student.workoutCompletionPresentation.copy001', [1, 1]) },
  ]);
  expect(result.hasPersonalRecord).toBe(true);
  expect(result.personalRecordText).toBe(t('student.workoutCompletionPresentation.copy004', ['Squat, Bench']));
  expect(workoutCompletionPresentation(input).hasPersonalRecord).toBe(false);
  expect(workoutCompletionPresentation(input).personalRecordText).toBe('');
  const tied = workoutCompletionPresentation({ ...input, drafts: [drafts[0], { ...drafts[1], weightText: '100', repsText: '6' }], references: new Map([['squat', { weightKg: 100, reps: 6 }]]) });
  expect(tied.exercises[0].bestSetText).toBe('100kg × 6 @8.5');
  expect(tied.exercises[0].isPersonalRecord).toBe(false);
});

test('receipt, weekday, volume comparison and metadata use canonical localized copy', () => {
  expect(workoutCompletionPresentation({ ...input, coachName: '  Alex  ', previousVolumeChangePercent: 12 })).toMatchObject({
    weekCode: 'W1D3', weekDayLabel: t('student.workoutCompletionPresentation.copy014', [3]),
    coachReceiptText: t('student.workoutCompletionPresentation.copy016', ['Alex']),
    dateSubtitle: '9/9 · Wed · W1D3',
    volumeComparisonText: t('student.workoutCompletionPresentation.copy007', ['+', 12]),
    metaText: t('student.workoutCompletionPresentation.copy003', [15, '8.3', t('student.workoutCompletionPresentation.copy010')]),
  });
  expect(workoutCompletionPresentation({ ...input, weekCode: 'unknown', coachName: ' ' })).toMatchObject({
    weekDayLabel: t('student.workoutCompletionPresentation.copy013'),
    coachReceiptText: t('student.workoutCompletionPresentation.copy015'),
    volumeComparisonText: t('student.workoutCompletionPresentation.copy008'),
  });
  expect(workoutCompletionPresentation(input).coachReceiptText).toBe(t('student.workoutCompletionPresentation.copy015'));
  expect(workoutCompletionPresentation({ ...input, previousVolumeChangePercent: -5 }).volumeComparisonText).toBe(t('student.workoutCompletionPresentation.copy007', ['', -5]));
  setLocaleOverride('zh');
  expect(workoutCompletionPresentation({ ...input, references: new Map([['squat', { weightKg: 90, reps: 5 }], ['bench', { weightKg: 10, reps: 5 }]]) }).personalRecordText).toBe(t('student.workoutCompletionPresentation.copy004', ['Squat、Bench']));
});

test.each<[string, string, 'copy010' | 'copy011' | 'copy012']>([
  ['8', '8', 'copy010'], ['8.5', '8.5', 'copy010'], ['7.5', '7.5', 'copy010'],
  ['9', '9', 'copy011'], ['7', '7', 'copy012'], ['8.96', '9.0', 'copy011'],
])('main RPE %s compares raw average and formats as %s', (rpeText, mainRPEText, key) => {
  expect(workoutCompletionPresentation({ ...input, drafts: drafts.map(draft => ({ ...draft, rpeText })) })).toMatchObject({ mainRPEText, planComparisonText: t(`student.workoutCompletionPresentation.${key}`) });
});

test('missing actuals fall back to prescription; pending sets and absent RPE stay absent', () => {
  const fallback = { ...drafts[0], weightText: '', repsText: '', rpeText: '', planSet: set({ load_mode: 'rpe', target_weight: '100.25', target_rpe: '8' }) };
  expect(workoutCompletionPresentation({ ...input, drafts: [fallback] })).toMatchObject({ totalVolumeText: '501.25', totalReps: 5, mainRPEText: '8', averageRPEText: '8.0', setCompletionLabel: t('student.workoutCompletionPresentation.copy006') });
  expect(workoutCompletionPresentation({ ...input, drafts: [{ ...fallback, planSet: set({ target_value: '100' }) }] })).toMatchObject({ mainRPEText: '—', averageRPEText: '—', planComparisonText: t('student.workoutCompletionPresentation.copy009') });
  const pending = workoutCompletionPresentation({ ...input, drafts: drafts.map(draft => ({ ...draft, status: 'pending' })) });
  expect(pending).toMatchObject({ completedSetCount: 0, totalVolumeText: '0', mainRPEText: '—', planComparisonText: t('student.workoutCompletionPresentation.copy009') });
  expect(pending.exercises[0].bestSetText).toBe('—');
});

test('rehydrated review uses precise recorded decimals before UI-rounded draft text', () => {
  const logs = [{ id: 'log', student_id: 'student', plan_exercise_id: 'main', exercise_id: 'squat', set_index: 0, weight_kg: '100.25', reps: 5, rpe: '8.25', completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-09-09', logged_at: '2026-09-09T12:00:00Z' }];
  expect(workoutCompletionPresentation({ ...input, drafts: synthesizeDrafts(planDay, logs) })).toMatchObject({ totalVolumeText: '501.25', mainRPEText: '8.3', exercises: [expect.objectContaining({ bestSetText: '100.25kg × 5 @8.25' }), expect.anything()] });
});

test('a recorded set without actual RPE falls back to the unrounded prescription', () => {
  const prescribedDay = { ...planDay, exercises: [{ ...main, sets: [set({ intensity_mode: 'rpe', target_value: '8.25' })] }] };
  const logs = [{ id: 'log', student_id: 'student', plan_exercise_id: 'main', exercise_id: 'squat', set_index: 0, weight_kg: '100', reps: 5, rpe: null, completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-09-09', logged_at: '2026-09-09T12:00:00Z' }];
  expect(workoutCompletionPresentation({ ...input, planDay: prescribedDay, drafts: synthesizeDrafts(prescribedDay, logs) }).exercises[0].bestSetText).toBe('100kg × 5 @8.25');
});
