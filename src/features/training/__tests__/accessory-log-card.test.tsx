import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { enterNumber, numericCell } from '../accessory-pad.test-helpers';
import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, TextInput, Vibration } from 'react-native';
import { Card, colors } from '@/design';
import { NumberPad } from '@/design/NumberPad';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { setLocaleOverride, t } from '@/i18n';
import { day, set } from '@/domain/plan/test-fixtures';
import type { Exercise } from '@/api/domains/exercises';
import type { SetLog } from '@/api/domains/sets';
import { synthesizeDrafts, addStudentExercise } from '../drafts';
import { AccessoryLogCard, column, type AccessoryEdits } from '../AccessoryLogCard';
import { EffortToggleLabel } from '../EffortToggleLabel';
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
const input = (label: string) => numericCell(renderer, label);
const button = (label: string) => renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label)[0];
const heroText = () => renderer.root.findAllByType(Card)[0].findAllByType(Text).map(n => n.props.children);

test('effort and reps share a column width without the two-target minimum', () => {
  expect(column(4)).toEqual(column(3));
  expect(column(4).minWidth).toBe(0);
});

test('accessory header keeps the bordered effort toggle label', async () => {
  await mount('accessory');
  expect(button(t('training.effort.switch')).findAllByType(EffortToggleLabel)).toHaveLength(1);
});

test('accessory header keeps both RPE and RIR toggle text on one line', async () => {
  await mount('accessory');
  const label = () => button(t('training.effort.switch')).findByType(EffortToggleLabel).findByType(Text);
  expect(label().props.children).toBe('RPE');
  expect(label().props.numberOfLines).toBe(1);
  await act(async () => button(t('training.effort.switch')).props.onPress());
  expect(label().props.children).toBe('RIR');
  expect(label().props.numberOfLines).toBe(1);
});

test('accessory header help borrows the gap without taking toggle width or overlapping its target', async () => {
  await mount('accessory');
  const helpStyle = StyleSheet.flatten(button(t('training.explainer.rpe.help')).props.style);
  expect(helpStyle).toMatchObject({ position: 'absolute', left: '100%', top: 0, width: 14 });
  expect(helpStyle.height).toBeGreaterThanOrEqual(44);
  const toggle = button(t('training.effort.switch'));
  expect(StyleSheet.flatten(toggle.props.style).flex).toBeUndefined();
  expect(StyleSheet.flatten(toggle.parent!.props.style)).toMatchObject({ flexShrink: 0 });
});

test('previous text automatically fits its column without shrinking below 10', async () => {
  await mount('accessory');
  const previousText = () => button('Use last time for set 1').findByType(Text);
  const fontSize = () => StyleSheet.flatten(previousText().props.style).fontSize;
  act(() => previousText().props.onLayout({ nativeEvent: { layout: { width: 1 } } }));
  expect(fontSize()).toBe(10);
  act(() => previousText().props.onLayout({ nativeEvent: { layout: { width: 200 } } }));
  expect(fontSize()).toBe(11);
});

test('105 opens an in-app pad with exercise, set, field and unit, without editable system inputs', async () => {
  await mount('accessory');
  await act(async () => button('Set 1 weight').props.onPress());
  expect(renderer.root.findByType(NumberPad).props).toMatchObject({ contextText: 'Leg press · Set 1 · Weight', initialValue: '80', unit: 'kg' });
  expect(renderer.root.findAllByType(TextInput).filter(node => node.props.editable !== false)).toHaveLength(0);
});

test('105 Next commits in weight, reps, effort order across sets and the final commit closes', async () => {
  await mount('accessory');
  await act(async () => button('Set 1 weight').props.onPress());
  const pad = () => renderer.root.findByType(NumberPad);
  for (const [value, context] of [
    [7.5, 'Set 1 · Reps'], [12, 'Set 1 · RPE'], [9.5, 'Set 2 · Weight'],
    [0, 'Set 2 · Reps'], [8, 'Set 2 · RPE'], [null, 'Set 3 · Weight'],
    [0, 'Set 3 · Reps'], [10, 'Set 3 · RPE'],
  ] as const) {
    await act(async () => pad().props.onNext(value));
    expect(pad().props.contextText).toBe(`Leg press · ${context}`);
  }
  expect(pad().props.onNext).toBeUndefined();
  await act(async () => pad().props.onCommit(7));
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
  expect(button('Set 1 weight').props.accessibilityValue.text).toBe('7.5');
  expect(button('Set 1 RPE').props.accessibilityValue.text).toBe('9.5');
});

test('catalog accessories render editable prescription rows, same-session history, explicit RIR and video details; other hero states stay unchanged', async () => {
  useVideoUploadStore.setState({ records: { 'student:one': { ...EMPTY_VIDEO_UPLOAD, status: 'uploading', localUri: 'file:///synthetic.mp4' } } });
  await mount('accessory');
  expect(input('Set 1 weight').props.accessibilityValue.text).toBe('80');
  expect(input('Set 2 weight').props.accessibilityValue.text).toBe('');
  expect(input('Set 2 weight').props.accessibilityHint).toBe('60');
  expect(input('Set 2 RPE').props.accessibilityHint).toBe('8');
  expect(input('Set 2 RPE').props.accessibilityValue.text).toBe('');
  expect(button('Complete set 2').props.disabled).toBe(true);
  expect(input('Set 3 weight').props.accessibilityValue.text).toBe('');
  expect(input('Set 3 RIR').props.accessibilityHint).toBe('2');
  expect(button('Use last time for set 3').props.disabled).toBe(true);
  expect(button('Set 1 details').findAll(n => n.props.name === 'video-outline').length).toBeGreaterThan(0);
  expect(button('Set 1 details').findAll(n => n.props.name === 'video-outline')[0].props.color).toBe(colors.success);
  expect(heroText()).toContain('Tap a set number to record video or mark it failed');
  expect(heroText()).toContain('Slow down.');
  expect(heroText()).toContain('Pause');
  expect(heroText()).not.toContain('Log this set');
  await act(async () => button('Use last time for set 2').props.onPress());
  expect(input('Set 2 weight').props.accessibilityValue.text).toBe('60');
  expect(input('Set 2 reps').props.accessibilityValue.text).toBe('10');
  expect(input('Set 2 RPE').props.accessibilityValue.text).toBe('');
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
      onAccessorySave={async (draft, request) => { setLogs([{ ...prior(draft.setIndex, request.weight_kg ?? '', '2026-10-10'), plan_exercise_id: draft.exercise.id, reps: request.reps, rpe: request.rpe ?? null }]); }} />;
  }
  await act(async () => { renderer = create(<TrainingSession />); });
  const lastText = () => [1, 2, 3].map(index => button(`Use last time for set ${index}`).findByType(Text).props.children);
  expect(lastText()).toEqual(['70×10@7', '60×10@7', '50×10@7']);
  expect(input('Set 2 weight').props.accessibilityHint).toBe('60');
  await act(async () => button('Complete set 1').props.onPress());
  expect(button('Undo set 1')).toBeDefined();
  expect(lastText()).toEqual(['70×10@7', '60×10@7', '50×10@7']);
  expect(input('Set 2 weight').props.accessibilityHint).toBe('60');
});


test('missing weight shows an error only after editing weight or being skipped by complete all', async () => {
  await mount('accessory');
  const weightHasError = () => StyleSheet.flatten(input('Set 2 weight').props.style).borderColor === colors.danger;
  expect(weightHasError()).toBe(false);
  expect(button('Complete set 2').props.disabled).toBe(true);
  await enterNumber(renderer, 'Set 2 reps', '8');
  await act(async () => input('Set 2 weight').props.onPress());
  await act(async () => renderer.root.findByType(NumberPad).props.onCancel());
  expect(weightHasError()).toBe(false);
  await act(async () => button('Complete all as planned').props.onPress());
  expect(weightHasError()).toBe(true);
  await enterNumber(renderer, 'Set 2 weight', '60');
  expect(weightHasError()).toBe(false);
  expect(button('Complete set 2').props.disabled).toBe(false);
  // Explicitly clearing required weight keeps the previously committed value (spec 105).
  act(() => renderer.unmount());
  renderer = undefined!;
  await mount('accessory');
  await enterNumber(renderer, 'Set 2 weight', '60');
  await enterNumber(renderer, 'Set 2 weight', '');
  expect(weightHasError()).toBe(false);
  expect(input('Set 2 weight').props.accessibilityValue.text).toBe('60');
  expect(button('Complete set 2').props.disabled).toBe(false);
});

test.each([2, 3])('completed set %s without recorded RPE has no coach placeholder; pending sets retain it', async index => {
  const saved = { ...prior(index - 1, '60', '2026-10-10'), plan_exercise_id: 'exercise', rpe: null };
  await mount('accessory', true, true, [saved]);
  expect(button(`Undo set ${index}`)).toBeDefined();
  expect(input(`Set ${index} RPE`).props.accessibilityValue.text).toBe('');
  expect(input(`Set ${index} RPE`).props.accessibilityHint).toBeUndefined();
  await mount('accessory', true, true, [{ ...saved, completed: false }]);
  expect(input(`Set ${index} RPE`).props.accessibilityHint).toBe(index === 2 ? '8' : undefined);
  await mount('accessory', true, true, [{ ...saved, rpe: '7.5' }]);
  expect(input(`Set ${index} RPE`).props.accessibilityValue.text).toBe('7.5');
});


test.each(['en', 'zh'] as const)('explicit RIR takes precedence over the legacy marker and Last copies weight in %s', async locale => {
  setLocaleOverride(locale);
  for (const historicalWeight of ['0', '90']) {
    const history = [{ ...prior(2, historicalWeight, '2026-09-01'), reps: 8 }, { ...prior(0, '0', '2026-09-01'), reps: 8 }];
    await mount('accessory', true, true, [], history);
    const rirLast = () => button(t('student.accessory.useLast', [3]));
    expect(rirLast().findByType(Text).props.children).toBe(`${historicalWeight}×8@7`);
    await act(async () => rirLast().props.onPress());
    expect(input(t('student.accessory.repsLabel', [3])).props.accessibilityValue.text).toBe('8');
    expect(input(t('student.accessory.weightLabel', [3])).props.accessibilityValue.text).toBe(historicalWeight);
    const weightedLast = button(t('student.accessory.useLast', [1]));
    expect(weightedLast.findByType(Text).props.children).toBe('0×8@7');
    await act(async () => weightedLast.props.onPress());
    expect(input(t('student.accessory.weightLabel', [1])).props.accessibilityValue.text).toBe('0');
    expect(input(t('student.accessory.repsLabel', [1])).props.accessibilityValue.text).toBe('8');
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
  await enterNumber(renderer, 'Set 1 weight', '12.5');
  await enterNumber(renderer, 'Set 1 reps', '12');
  await act(async () => button('Complete set 1').props.onPress());
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ kind: 'added' }), expect.objectContaining({ exercise_id: 'curl', plan_day_id: 'day', logged_date: expect.any(String), weight_kg: '12.5', reps: 12, completed: true }), 'single');
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).not.toContain('Complete all as planned');
});


test('busy duplicate does not add tick vibration; batch retains button feedback without a 15ms tick and failures keep input', async () => {
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {}).mockClear();
  let reject!: (reason: Error) => void;
  const save = jest.fn(() => new Promise<void>((_resolve, rejectSave) => { reject = rejectSave; }));
  await act(async () => { renderer = create(<AccessoryLogCard drafts={synthesizeDrafts(planDay, [])} previousLogs={[]} unit="kg" studentId="student" onRecord={() => {}} onSave={save} />); });
  await enterNumber(renderer, 'Set 1 weight', '95');
  await act(async () => { button('Complete set 1').props.onPress(); button('Complete set 1').props.onPress(); });
  expect(save).toHaveBeenCalledTimes(1);
  expect(vibrate).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('Offline')));
  expect(input('Set 1 weight').props.accessibilityValue.text).toBe('95');
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
  await enterNumber(renderer, 'Set 1 weight', '12.5');
  await act(async () => switchDay('b'));
  await enterNumber(renderer, 'Set 1 weight', '20');
  await act(async () => switchDay('a'));
  expect(input('Set 1 weight').props.accessibilityValue.text).toBe('12.5');
  await act(async () => switchDay('b'));
  expect(input('Set 1 weight').props.accessibilityValue.text).toBe('20');
});


test.each(['done', 'backdrop'] as const)('105 %s retains the current field and earlier Next commits', async action => {
  await mount('accessory');
  await act(async () => button('Set 1 weight').props.onPress());
  await act(async () => renderer.root.findByType(NumberPad).props.onNext(7.5));
  const pad = renderer.root.findByType(NumberPad);
  const keys = pad.findAllByType(FeedbackPressable);
  await act(async () => keys.find(node => node.props.accessibilityLabel === '9')!.props.onPress!({} as never));
  await act(async () => (action === 'done' ? keys.at(-2)! : keys[0]).props.onPress!({} as never));
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
  expect(input('Set 1 weight').props.accessibilityValue.text).toBe('7.5');
  expect(input('Set 1 reps').props.accessibilityValue.text).toBe('9');
});

test.each(['RPE', 'RIR'] as const)('105 deleting optional %s clears it while required fields retain committed values', async effort => {
  await mount('accessory');
  if (effort === 'RIR') await act(async () => button(t('training.effort.switch')).props.onPress());
  const label = `Set ${effort === 'RPE' ? 1 : 3} ${effort}`;
  await enterNumber(renderer, label, effort === 'RPE' ? '9.5' : '2');
  await enterNumber(renderer, label, '');
  expect(input(label).props.accessibilityValue.text).toBe('');
  await enterNumber(renderer, 'Set 1 weight', '');
  await enterNumber(renderer, 'Set 1 reps', '');
  expect(input('Set 1 weight').props.accessibilityValue.text).toBe('80');
  expect(input('Set 1 reps').props.accessibilityValue.text).toBe('5');
});

test('105 the keypad blocks invalid RPE commits and disables the decimal key for RIR', async () => {
  await mount('accessory');
  await act(async () => input('Set 1 RPE').props.onPress());
  const pad = () => renderer.root.findByType(NumberPad);
  for (const key of ['1', '0', t('designSystem.numberPad.decimalPoint'), '5']) {
    await act(async () => pad().findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === key)!.props.onPress!({} as never));
  }
  expect(pad().findAllByType(FeedbackPressable).at(-1)!.props.disabled).toBe(true);
  await act(async () => pad().props.onCancel());
  await act(async () => button(t('training.effort.switch')).props.onPress());
  await act(async () => input('Set 3 RIR').props.onPress());
  expect(pad().findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === t('designSystem.numberPad.decimalPoint'))!.props.disabled).toBe(true);
});

test('105 accessory reps reject 100 without advancing or committing and accept 99', async () => {
  await mount('accessory');
  await act(async () => input('Set 1 reps').props.onPress());
  const pad = () => renderer.root.findByType(NumberPad);
  for (const key of ['1', '0', '0']) {
    await act(async () => pad().findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === key)!.props.onPress!({} as never));
  }
  const confirm = pad().findAllByType(FeedbackPressable).at(-1)!;
  expect(confirm.props.disabled).toBe(true);
  await act(async () => confirm.props.onPress!({} as never));
  expect(pad().props.contextText).toBe('Leg press · Set 1 · Reps');
  expect(input('Set 1 reps').props.accessibilityValue.text).toBe('100');
  await act(async () => pad().props.onCancel());
  expect(input('Set 1 reps').props.accessibilityValue.text).toBe('5');
  await enterNumber(renderer, 'Set 1 reps', '99');
  expect(input('Set 1 reps').props.accessibilityValue.text).toBe('99');
});

test.each<['en' | 'zh' | 'zh-Hant', string, string]>([
  ['en', 'Leg press · Set 1 · Weight', 'Next · Reps'],
  ['zh', 'Leg press · 第 1 组 · 重量', '下一项 · 次数'],
  ['zh-Hant', 'Leg press · 第 1 組 · 重量', '下一項 · 次數'],
])('105 context, next label and pound unit render in %s', async (locale, context, next) => {
  setLocaleOverride(locale);
  await act(async () => { renderer = create(<AccessoryLogCard exerciseName="Leg press" drafts={synthesizeDrafts(planDay, [])} previousLogs={[]} unit="lb" studentId="student" onRecord={() => {}} />); });
  await act(async () => input(t('student.accessory.weightLabel', [1])).props.onPress());
  const pad = renderer.root.findByType(NumberPad);
  expect(pad.props.contextText).toBe(context);
  expect(pad.props.nextTitle).toBe(next);
  expect(pad.findAllByType(Text).map(node => node.props.children)).toContain(locale === 'en' ? 'Done' : '收起');
  expect(pad.findAllByType(Text).map(node => node.props.children)).toContain('LB');
  const cell = input(t('student.accessory.weightLabel', [1]));
  expect(StyleSheet.flatten(cell.props.style)).toMatchObject({ borderWidth: 2, borderColor: colors.gold500 });
  expect(StyleSheet.flatten(cell.findByType(Text).props.style).color).toBe(colors.textPrimary);
});

test('105 Next skips the absent effort field on choose-your-weight rows', async () => {
  const freeDay = day('free', { exercises: [{ ...planDay.exercises[0], sets: [1, 2].map(n => set({ id: `free-${n}`, set_number: n, load_mode: 'free_weight' })) }] });
  await act(async () => { renderer = create(<AccessoryLogCard exerciseName="Press" drafts={synthesizeDrafts(freeDay, [])} previousLogs={[]} unit="kg" studentId="student" onRecord={() => {}} />); });
  await act(async () => input('Set 1 reps').props.onPress());
  await act(async () => renderer.root.findByType(NumberPad).props.onNext(12));
  expect(renderer.root.findByType(NumberPad).props.contextText).toBe('Press · Set 2 · Weight');
  await act(async () => renderer.root.findByType(NumberPad).props.onNext(7.5));
  expect(renderer.root.findByType(NumberPad).props.onNext).toBeUndefined();
  await act(async () => renderer.root.findByType(NumberPad).props.onCommit(8));
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
});
