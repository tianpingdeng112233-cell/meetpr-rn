import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, TextInput } from 'react-native';
import { Card, colors } from '@/design';
import { setLocaleOverride, t } from '@/i18n';
import { day, set } from '@/domain/plan/test-fixtures';
import type { Exercise } from '@/api/domains/exercises';
import type { SetLog } from '@/api/domains/sets';
import { synthesizeDrafts } from '../drafts';
import { WorkoutBody } from '../WorkoutBody';
import { createExerciseMetadataResolver } from '../exercise-metadata';
import { EMPTY_VIDEO_UPLOAD } from '../video-upload/model';
import { useVideoUploadStore, resetVideoUploadStoreForTests } from '../video-upload/store';

jest.mock('react-native-compressor', () => ({}));
jest.mock('expo-media-library', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
let renderer: ReactTestRenderer;
beforeEach(() => setLocaleOverride('en'));
afterEach(() => { act(() => renderer?.unmount()); renderer = undefined!; resetVideoUploadStoreForTests(); setLocaleOverride(null); });
const planDay = day('day', { exercises: [{ id: 'exercise', plan_day_id: 'day', exercise_id: 'press', sort_order: 0, is_main_lift: true, notes: 'Slow down.', sets: [
  set({ id: 'one', target_value: '80' }),
  set({ id: 'two', set_number: 2, intensity_mode: 'rpe', target_value: '8', coach_note: 'Pause' }),
  set({ id: 'three', set_number: 3, load_mode: 'rir', rir_target: 2, coach_note: 'Bodyweight' }),
] }] });
const prior = (index: number, weight: string, date: string): SetLog => ({ id: `prior-${date}-${index}`, student_id: 'student', exercise_id: 'press', plan_exercise_id: 'old-exercise', set_index: index, weight_kg: weight, reps: 10, rpe: '7', completed: true, failed: false, assumed: false, adhoc: false, logged_date: date, logged_at: `${date}T10:00:00Z` });
const onRecord = jest.fn();
async function mount(type: string | null, editable = true, recording = true, logs: SetLog[] = [], historyLogs = [prior(0, '70', '2026-09-01'), prior(1, '60', '2026-09-01'), prior(2, '99', '2026-08-01')]) {
  const catalog = type === null ? [] : [{ id: 'press', name: 'Leg press', name_en: 'Leg press', exercise_type: type, main_lift_family: null, is_competition_lift: false, competition_stance: null } as Exercise];
  const body = <WorkoutBody exercises={planDay.exercises} drafts={synthesizeDrafts(planDay, logs)} editable={editable} recording={recording} startLoading={false} onStart={() => {}}
    suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={historyLogs} onAccessorySave={async () => {}}
    studentId="student" onRecord={onRecord} onVideo={() => {}} onToggleComplete={() => {}} resolveExerciseMetadata={createExerciseMetadataResolver(catalog, null)} />;
  await act(async () => { if (renderer) renderer.update(body); else renderer = create(body); });
}
const input = (label: string) => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
const button = (label: string) => renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label)[0];
const heroText = () => renderer.root.findAllByType(Card)[0].findAllByType(Text).map(n => n.props.children);

test('catalog accessories render editable prescription rows, same-session history, BW and video details; other hero states stay unchanged', async () => {
  useVideoUploadStore.setState({ records: { 'student:one': { ...EMPTY_VIDEO_UPLOAD, status: 'uploading', localUri: 'file:///synthetic.mp4' } } });
  await mount('accessory');
  expect(input('Set 1 weight').props.value).toBe('80');
  expect(input('Set 2 weight').props.value).toBe('');
  expect(input('Set 2 weight').props.placeholder).toBe('60');
  expect(input('Set 2 RPE').props.placeholder).toBe('8');
  expect(input('Set 2 RPE').props.value).toBe('');
  expect(button('Complete set 2').props.disabled).toBe(true);
  expect(heroText()).toContain('BW');
  expect(input('Set 3 RPE').props.placeholder).toBe('RIR 2');
  expect(button('Use last time for set 3').props.disabled).toBe(true);
  expect(button('Set 1 details').findAll(n => n.props.name === 'video-outline').length).toBeGreaterThan(0);
  expect(heroText()).toContain('Tap a set number to record video or mark it failed');
  expect(heroText()).toContain('Slow down.');
  expect(heroText()).toContain('Pause');
  expect(heroText()).not.toContain('Log this set');
  await act(async () => button('Use last time for set 2').props.onPress());
  expect(input('Set 2 weight').props.value).toBe('60');
  expect(input('Set 2 reps').props.value).toBe('10');
  expect(button('Complete set 2').props.disabled).toBe(false);
  await act(async () => button('Set 2 details').props.onPress());
  expect(onRecord).toHaveBeenLastCalledWith(expect.objectContaining({ stableSetId: 'two' }));
  for (const type of ['main_lift', 'main_lift_variation', 'unknown', null]) {
    await mount(type);
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
    expect(heroText()).toContain('Log this set');
  }
  await mount('accessory', false);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  await mount('accessory', true, false);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});


test('saving a set keeps every Last cell and unprescribed weight placeholder from the previous session', async () => {
  const history = [prior(0, '70', '2026-09-01'), prior(1, '60', '2026-09-01'), prior(2, '50', '2026-09-01')];
  const catalog = [{ id: 'press', name: 'Leg press', name_en: 'Leg press', exercise_type: 'accessory' } as Exercise];
  function TrainingSession() {
    const [logs, setLogs] = useState<SetLog[]>([]);
    return <WorkoutBody exercises={planDay.exercises} drafts={synthesizeDrafts(planDay, logs)} editable recording startLoading={false} onStart={() => {}}
      suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[...history, ...logs]}
      studentId="student" onRecord={onRecord} onVideo={() => {}} onToggleComplete={() => {}} resolveExerciseMetadata={createExerciseMetadataResolver(catalog, null)}
      onAccessorySave={async (draft, request) => { setLogs([{ ...prior(draft.setIndex, request.weight_kg, '2026-10-10'), plan_exercise_id: draft.exercise.id, reps: request.reps, rpe: request.rpe ?? null }]); }} />;
  }
  await act(async () => { renderer = create(<TrainingSession />); });
  const lastText = () => [1, 2, 3].map(index => button(`Use last time for set ${index}`).findByType(Text).props.children);
  expect(lastText()).toEqual(['70 × 10', '60 × 10', 'BW × 10']);
  expect(input('Set 2 weight').props.placeholder).toBe('60');
  await act(async () => button('Complete set 1').props.onPress());
  expect(button('Undo set 1')).toBeDefined();
  expect(lastText()).toEqual(['70 × 10', '60 × 10', 'BW × 10']);
  expect(input('Set 2 weight').props.placeholder).toBe('60');
});


test('missing weight shows an error only after editing weight or being skipped by complete all', async () => {
  await mount('accessory');
  const weightHasError = () => StyleSheet.flatten(input('Set 2 weight').props.style).borderColor === colors.danger;
  expect(weightHasError()).toBe(false);
  expect(button('Complete set 2').props.disabled).toBe(true);
  await act(async () => input('Set 2 reps').props.onChangeText('8'));
  await act(async () => input('Set 2 weight').props.onFocus());
  await act(async () => input('Set 2 weight').props.onBlur());
  expect(weightHasError()).toBe(false);
  await act(async () => button('Complete all as planned').props.onPress());
  expect(weightHasError()).toBe(true);
  await act(async () => input('Set 2 weight').props.onChangeText('60'));
  expect(weightHasError()).toBe(false);
  expect(button('Complete set 2').props.disabled).toBe(false);
  // A fresh card has no prior batch attempt: deleting an entered weight is itself invalid input.
  act(() => renderer.unmount());
  renderer = undefined!;
  await mount('accessory');
  await act(async () => input('Set 2 weight').props.onChangeText('60'));
  await act(async () => input('Set 2 weight').props.onChangeText(''));
  expect(weightHasError()).toBe(true);
  expect(button('Complete set 2').props.disabled).toBe(true);
});

test.each([2, 3])('completed set %s without recorded RPE has no coach placeholder; pending sets retain it', async index => {
  const saved = { ...prior(index - 1, '60', '2026-10-10'), plan_exercise_id: 'exercise', rpe: null };
  await mount('accessory', true, true, [saved]);
  expect(button(`Undo set ${index}`)).toBeDefined();
  expect(input(`Set ${index} RPE`).props.value).toBe('');
  expect(input(`Set ${index} RPE`).props.placeholder).toBe('');
  await mount('accessory', true, true, [{ ...saved, completed: false }]);
  expect(input(`Set ${index} RPE`).props.placeholder).toBe(index === 2 ? '8' : 'RIR 2');
  await mount('accessory', true, true, [{ ...saved, rpe: '7.5' }]);
  expect(input(`Set ${index} RPE`).props.value).toBe('7.5');
});


test.each(['en', 'zh'] as const)('Last uses the current bodyweight flag and copies only reps in %s', async locale => {
  setLocaleOverride(locale);
  for (const historicalWeight of ['0', '90']) {
    const history = [{ ...prior(2, historicalWeight, '2026-09-01'), reps: 8 }, { ...prior(0, '0', '2026-09-01'), reps: 8 }];
    await mount('accessory', true, true, [], history);
    const bodyweightLast = () => button(t('student.accessory.useLast', [3]));
    expect(bodyweightLast().findByType(Text).props.children).toBe(locale === 'en' ? 'BW × 8' : '自重 × 8');
    await act(async () => bodyweightLast().props.onPress());
    expect(input(t('student.accessory.repsLabel', [3])).props.value).toBe('8');
    expect(input(t('student.accessory.weightLabel', [3]))).toBeUndefined();
    const weightedLast = button(t('student.accessory.useLast', [1]));
    expect(weightedLast.findByType(Text).props.children).toBe('0 × 8');
    await act(async () => weightedLast.props.onPress());
    expect(input(t('student.accessory.weightLabel', [1])).props.value).toBe('0');
    expect(input(t('student.accessory.repsLabel', [1])).props.value).toBe('8');
    const saved = { ...prior(2, '0', '2026-10-10'), plan_exercise_id: 'exercise', reps: 8, rpe: null };
    await mount('accessory', true, true, [saved], history);
    await act(async () => bodyweightLast().props.onPress());
    // Copying the same reps must not dirty a completed BW row with the history's weight.
    expect(button(t('student.accessory.undo', [3]))).toBeDefined();
  }
});
