import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, TextInput } from 'react-native';
import { colors } from '@/design';
import { setLocaleOverride } from '@/i18n';
import { day, set } from '@/domain/plan/test-fixtures';
import type { SetLog } from '@/api/domains/sets';
import type { PlanSet } from '@/api/domains/plans';
import { synthesizeDrafts } from '../drafts';
import { AccessoryLogCard } from '../AccessoryLogCard';
import { WorkoutBody } from '../WorkoutBody';
import { createExerciseMetadataResolver } from '../exercise-metadata';

jest.mock('react-native-compressor', () => ({}));
jest.mock('expo-media-library', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
let renderer: ReactTestRenderer;
beforeEach(() => setLocaleOverride('zh'));
afterEach(() => { act(() => renderer?.unmount()); setLocaleOverride(null); });
const input = (label: string) => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
const complete = () => renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === '完成第 1 组')[0];
const text = () => renderer.root.findAllByType(Text).map(node => node.props.children).join(' ');
async function mount(prescription: Partial<PlanSet>, onInputFocus?: (input: TextInput | null) => void, previousLogs: SetLog[] = []) {
  const drafts = synthesizeDrafts(day('day', { exercises: [{ id: 'exercise', exercise_id: 'row', plan_day_id: 'day', is_main_lift: false, sort_order: 0, notes: null,
    sets: [set({ intensity_mode: null, target_value: null, ...prescription })] }] }), []);
  const save = jest.fn(async () => {});
  await act(async () => { renderer = create(<AccessoryLogCard studentId="student" drafts={drafts} previousLogs={previousLogs} unit="kg" onRecord={() => {}} onSave={save} onInputFocus={onInputFocus} />); });
  return save;
}

test('056 tapping complete with no chosen weight marks the input and gives the exact set error, then saves the entered weight', async () => {
  const save = await mount({ load_mode: 'free_weight' });
  expect(input('重量 kg · 必填').props.placeholder).toBe('填实际重量');
  expect(complete().props.disabled).toBe(false);
  await act(async () => complete().props.onPress());
  expect(save).not.toHaveBeenCalled();
  expect(StyleSheet.flatten(input('重量 kg · 必填').props.style).borderColor).toBe(colors.danger);
  expect(text()).toContain('第 1 组还没填重量——自选重量的组要填实际用的重量才能完成。');
  await act(async () => input('重量 kg · 必填').props.onChangeText('22.5'));
  await act(async () => complete().props.onPress());
  expect(save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ weight_kg: '22.5', completed: true }), 'single');
});

test.each([{ load_mode: 'bodyweight' as const }, { intensity_mode: 'rpe' as const, target_value: '10.00', coach_note: '自重 Slow down' }])('056 bodyweight shows an optional editable weight and retains other notes: %j', async prescription => {
  const save = await mount(prescription);
  expect(input('第 1 组重量').props.value).toBe('0');
  expect(save).not.toHaveBeenCalled();
  expect(text()).not.toContain('不加就空着');
  await act(async () => complete().props.onPress());
  expect(save).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ weight_kg: '0', completed: true }), 'single');
  await act(async () => input('第 1 组重量').props.onChangeText('10'));
  await act(async () => complete().props.onPress());
  expect(save).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ weight_kg: '10' }), 'single');
  expect(text()).not.toContain('自重 Slow down');
  if ('coach_note' in prescription) expect(text()).toContain('Slow down');
});


test.each(['free_weight', 'bodyweight'] as const)('056 workout shows approved %s structure even for a main lift', async load_mode => {
  const planDay = day('day', { exercises: [{ id: 'exercise', exercise_id: 'row', plan_day_id: 'day', is_main_lift: true, sort_order: 0, notes: null,
    sets: [1, 2, 3].map(n => set({ id: `set-${n}`, set_number: n, load_mode, target_reps: load_mode === 'bodyweight' ? 0 : 15, intensity_mode: null, target_value: null, target_rpe: load_mode === 'free_weight' ? '8' : null })) }] });
  await act(async () => { renderer = create(<WorkoutBody exercises={planDay.exercises} drafts={synthesizeDrafts(planDay, [])} editable recording startLoading={false} onStart={() => {}}
    suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[]} onAccessorySave={async () => {}} studentId="student" onRecord={() => {}} onVideo={() => {}} onToggleComplete={() => {}}
    resolveExerciseMetadata={createExerciseMetadataResolver([], null)} />); });
  expect(text()).toContain(load_mode === 'free_weight' ? '3 × 15 · 目标 RPE 8' : '3 × 力竭');
  expect(text()).toContain(load_mode === 'free_weight' ? '自选重量' : '自重');
  if (load_mode === 'free_weight') expect(text()).toContain('教练没定重量，按今天状态自己选，记下实际用了多少。');
  else {
    expect(text()).not.toContain('不加负重做到力竭');
    expect(renderer.root.findAllByType(Text).filter(node => node.props.children === '额外负重 kg')).toHaveLength(1);
    expect(input('第 1 组重量').props.value).toBe('0');
  }
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(load_mode === 'bodyweight' ? 9 : 6);
});


test('056 load-type fields retain the keyboard avoidance focus/blur contract', async () => {
  const focus = jest.fn();
  await mount({ load_mode: 'bodyweight' }, focus);
  for (const label of ['第 1 组重量', '第 1 组次数']) {
    await act(async () => input(label).props.onFocus());
    expect(focus).toHaveBeenCalledTimes(1);
    await act(async () => input(label).props.onBlur());
    expect(focus).toHaveBeenLastCalledWith(null);
    focus.mockClear();
  }
});

test('056 expanded non-current accessories retain their load mode, explanation and intensity', async () => {
  const exercises = [0, 1].map(i => ({ id: `exercise-${i}`, exercise_id: `catalog-${i}`, plan_day_id: 'day', is_main_lift: false, sort_order: i, notes: null,
    sets: [set({ id: `set-${i}`, load_mode: i ? 'bodyweight' as const : 'free_weight' as const, intensity_mode: null, target_value: null, rir_target: i ? 2 : null })] }));
  const planDay = day('day', { exercises });
  await act(async () => { renderer = create(<WorkoutBody exercises={exercises} drafts={synthesizeDrafts(planDay, [])} editable recording startLoading={false} onStart={() => {}}
    suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[]} onAccessorySave={async () => {}} studentId="student" onRecord={() => {}} onVideo={() => {}} onToggleComplete={() => {}}
    resolveExerciseMetadata={() => ({ name: 'Accessory', exerciseType: 'accessory', rawFamily: null, competitionFamily: null })} />); });
  expect(text()).toContain('目标 RIR 2');
  expect(text()).toContain('额外负重 kg');
});


const projectedSet = (load_mode: 'bodyweight' | 'free_weight', target_rpe?: string) => day('day', { exercises: [{
  id: 'exercise', exercise_id: 'row', plan_day_id: 'day', is_main_lift: true, sort_order: 0, notes: null,
  sets: [set({ load_mode, target_reps: 1, intensity_mode: 'rpe', target_value: '10.00', target_rpe })],
}] });
async function mountProjectedWorkout(load_mode: 'bodyweight' | 'free_weight', surface: 'list' | 'header' | 'history', target_rpe?: string) {
  const planDay = projectedSet(load_mode, target_rpe);
  await act(async () => { renderer = create(<WorkoutBody exercises={planDay.exercises} drafts={synthesizeDrafts(planDay, [])}
    editable={surface !== 'history'} recording={surface !== 'list'} startLoading={false} onStart={() => {}}
    suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[]} onAccessorySave={async () => {}}
    studentId="student" onRecord={() => {}} onVideo={() => {}} onToggleComplete={() => {}}
    resolveExerciseMetadata={createExerciseMetadataResolver([], null)} />); });
}

test.each<['bodyweight' | 'free_weight', 'list' | 'header' | 'history']>([
  ['bodyweight', 'list'], ['free_weight', 'list'],
  ['bodyweight', 'header'], ['free_weight', 'header'],
  ['bodyweight', 'history'], ['free_weight', 'history'],
])('056 %s %s never renders projected RPE 10', async (load_mode, surface) => {
  await mountProjectedWorkout(load_mode, surface);
  const copy = renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(text()).not.toContain('RPE 10');
  expect(copy).not.toContain('10');
  if (surface === 'list') expect(copy).toContain(load_mode === 'bodyweight' ? '1 · 自重 · 1 组' : '1 · 自选重量 · 1 组');
  if (surface === 'header') expect(copy).toContain('1 × 1');
  if (surface === 'history') {
    expect(copy).toContain('RPE'); // The table remains visible, with no fabricated value in its column.
    expect(copy.filter(value => value === '—').length).toBeGreaterThanOrEqual(2);
  }
});

test.each(['bodyweight', 'free_weight'] as const)('056 %s drafts never prefill RPE from the legacy projection', load_mode => {
  expect(synthesizeDrafts(projectedSet(load_mode), [])[0].rpeText).toBe('');
});

test('056 an independent free-weight target still renders 目标 RPE 8 despite the old-client projection', async () => {
  await mountProjectedWorkout('free_weight', 'header', '8');
  expect(text()).toContain('1 × 1 · 目标 RPE 8');
  expect(text()).not.toContain('RPE 10');
});

test('056 bodyweight previous weight stays visible and copies the displayed value', async () => {
  const previous: SetLog = { id: 'previous', student_id: 'student', plan_exercise_id: 'exercise', exercise_id: 'row', set_index: 0,
    weight_kg: '20', reps: 10, rpe: null, completed: true, failed: false, assumed: false, adhoc: false,
    logged_date: '2026-10-08', logged_at: '2026-10-08T12:00:00Z' };
  const save = await mount({ load_mode: 'bodyweight' }, undefined, [previous]);
  expect(text()).toContain('20 × 10');
  const useLast = renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === '第 1 组填入上次数值')[0];
  await act(async () => useLast.props.onPress());
  expect(input('第 1 组重量').props.value).toBe('20');
  expect(save).not.toHaveBeenCalled();
  await act(async () => complete().props.onPress());
  expect(save).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ weight_kg: '20' }), 'single');
});
