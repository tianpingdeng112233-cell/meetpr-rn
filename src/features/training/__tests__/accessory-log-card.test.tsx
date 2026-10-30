import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, TextInput, Vibration } from 'react-native';
import { Card, colors } from '@/design';
import { setLocaleOverride, t } from '@/i18n';
import { day, set } from '@/domain/plan/test-fixtures';
import type { Exercise } from '@/api/domains/exercises';
import type { SetLog } from '@/api/domains/sets';
import { synthesizeDrafts, addStudentExercise } from '../drafts';
import { AccessoryLogCard, type AccessoryEdits } from '../AccessoryLogCard';
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

test('catalog accessories render editable prescription rows, same-session history, explicit RIR and video details; other hero states stay unchanged', async () => {
  useVideoUploadStore.setState({ records: { 'student:one': { ...EMPTY_VIDEO_UPLOAD, status: 'uploading', localUri: 'file:///synthetic.mp4' } } });
  await mount('accessory');
  expect(input('Set 1 weight').props.value).toBe('80');
  expect(input('Set 2 weight').props.value).toBe('');
  expect(input('Set 2 weight').props.placeholder).toBe('60');
  expect(input('Set 2 RPE').props.placeholder).toBe('8');
  expect(input('Set 2 RPE').props.value).toBe('');
  expect(button('Complete set 2').props.disabled).toBe(true);
  expect(input('Set 3 weight').props.value).toBe('');
  expect(input('Set 3 RIR').props.placeholder).toBe('2');
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
  expect(lastText()).toEqual(['70 × 10', '60 × 10', '50 × 10']);
  expect(input('Set 2 weight').props.placeholder).toBe('60');
  await act(async () => button('Complete set 1').props.onPress());
  expect(button('Undo set 1')).toBeDefined();
  expect(lastText()).toEqual(['70 × 10', '60 × 10', '50 × 10']);
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
  expect(input(`Set ${index} RPE`).props.placeholder).toBe(index === 2 ? '8' : '');
  await mount('accessory', true, true, [{ ...saved, rpe: '7.5' }]);
  expect(input(`Set ${index} RPE`).props.value).toBe('7.5');
});


test.each(['en', 'zh'] as const)('explicit RIR takes precedence over the legacy marker and Last copies weight in %s', async locale => {
  setLocaleOverride(locale);
  for (const historicalWeight of ['0', '90']) {
    const history = [{ ...prior(2, historicalWeight, '2026-09-01'), reps: 8 }, { ...prior(0, '0', '2026-09-01'), reps: 8 }];
    await mount('accessory', true, true, [], history);
    const rirLast = () => button(t('student.accessory.useLast', [3]));
    expect(rirLast().findByType(Text).props.children).toBe(`${historicalWeight} × 8`);
    await act(async () => rirLast().props.onPress());
    expect(input(t('student.accessory.repsLabel', [3])).props.value).toBe('8');
    expect(input(t('student.accessory.weightLabel', [3])).props.value).toBe(historicalWeight);
    const weightedLast = button(t('student.accessory.useLast', [1]));
    expect(weightedLast.findByType(Text).props.children).toBe('0 × 8');
    await act(async () => weightedLast.props.onPress());
    expect(input(t('student.accessory.weightLabel', [1])).props.value).toBe('0');
    expect(input(t('student.accessory.repsLabel', [1])).props.value).toBe('8');
    const saved = { ...prior(2, '0', '2026-10-10'), plan_exercise_id: 'exercise', reps: 8, rpe: null };
    await mount('accessory', true, true, [saved], history);
    await act(async () => rirLast().props.onPress());
    // A different actual weight edits the saved row instead of cancelling it.
    expect(button(t(historicalWeight === '0' ? 'student.accessory.undo' : 'student.accessory.complete', [3]))).toBeDefined();
  }
});


test('inline completion vibrates once immediately; cancellation and disabled rows do not vibrate', async () => {
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {}).mockClear();
  await mount('accessory');
  await act(async () => button('Complete set 1').props.onPress());
  expect(vibrate).toHaveBeenCalledTimes(1);
  expect(vibrate).toHaveBeenCalledWith(15);
  await act(async () => button('Complete set 2').props.onPress());
  expect(vibrate).toHaveBeenCalledTimes(1);
  await mount('accessory', true, true, [{ ...prior(0, '80', '2026-10-14'), plan_exercise_id: 'exercise' }]);
  await act(async () => button('Undo set 1').props.onPress());
  expect(vibrate).toHaveBeenCalledTimes(1);
  vibrate.mockRestore();
});

test('student-added card records inline with a day-bound adhoc request and offers no video or complete-all', async () => {
  const save = jest.fn(async () => {});
  const draft = addStudentExercise(planDay, 'curl', [])!;
  await act(async () => { renderer = create(<WorkoutBody exercises={[]} drafts={[draft]} editable recording startLoading={false} onStart={() => {}}
    suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[]} onAccessorySave={save}
    studentId="student" onRecord={onRecord} onVideo={() => {}} onToggleComplete={() => {}} resolveExerciseMetadata={() => ({ name: 'Curl', rawFamily: null, competitionFamily: null, exerciseType: 'accessory' })} />); });
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain('Added by you');
  expect(button('Set 1 details')?.props.disabled).toBe(true);
  await act(async () => input('Set 1 weight').props.onChangeText('12.5'));
  await act(async () => input('Set 1 reps').props.onChangeText('12'));
  await act(async () => button('Complete set 1').props.onPress());
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ kind: 'added' }), expect.objectContaining({ exercise_id: 'curl', plan_day_id: 'day', logged_date: expect.any(String), weight_kg: '12.5', reps: 12, completed: true }), 'single');
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain('Complete all as planned');
});


test('busy duplicate does not add tick vibration; batch retains button feedback without a 15ms tick and failures keep input', async () => {
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {}).mockClear();
  let reject!: (reason: Error) => void;
  const save = jest.fn(() => new Promise<void>((_resolve, rejectSave) => { reject = rejectSave; }));
  await act(async () => { renderer = create(<AccessoryLogCard drafts={synthesizeDrafts(planDay, [])} previousLogs={[]} unit="kg" studentId="student" onRecord={() => {}} onSave={save} />); });
  await act(async () => input('Set 1 weight').props.onChangeText('95'));
  await act(async () => { button('Complete set 1').props.onPress(); button('Complete set 1').props.onPress(); });
  expect(save).toHaveBeenCalledTimes(1);
  expect(vibrate).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('Offline')));
  expect(input('Set 1 weight').props.value).toBe('95');
  save.mockImplementation(async () => {});
  const batch = renderer.root.findAll(node => node.props.accessibilityLabel === 'Complete all as planned' && typeof node.props.onPress === 'function').at(-1)!;
  vibrate.mockClear();
  await act(async () => batch.props.onPress());
  expect(vibrate).not.toHaveBeenCalledWith(15);
  expect(vibrate).toHaveBeenCalledTimes(1);
  expect(vibrate).toHaveBeenCalledWith(10);
  vibrate.mockRestore();
});

test('inline drafts survive switching cards and preserve values in both days', async () => {
  let switchDay!: (day: string) => void;
  function Cards() {
    const [selected, select] = useState('a'); switchDay = select;
    const [values, setValues] = useState<AccessoryEdits>({});
    const draft = addStudentExercise(day(selected), 'curl', [])!;
    return <AccessoryLogCard key={selected} drafts={[draft]} previousLogs={[]} unit="kg" studentId="student" onRecord={() => {}} inlineEdits={{ values, onChange: (id, value) => setValues(current => ({ ...current, [id]: value })) }} />;
  }
  await act(async () => { renderer = create(<Cards />); });
  await act(async () => input('Set 1 weight').props.onChangeText('12.5'));
  await act(async () => switchDay('b'));
  await act(async () => input('Set 1 weight').props.onChangeText('20'));
  await act(async () => switchDay('a'));
  expect(input('Set 1 weight').props.value).toBe('12.5');
  await act(async () => switchDay('b'));
  expect(input('Set 1 weight').props.value).toBe('20');
});
