import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, View } from 'react-native';
import { setLocaleOverride } from '@/i18n';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { WorkoutBody } from '../WorkoutBody';
import { RollUpCard } from '@/design/TrainingRewardMotion';
import type { WorkoutSetDraft } from '../model';

jest.mock('react-native-compressor', () => ({}));
jest.mock('expo-media-library', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const planDay = day('day', { exercises: ['Squat', 'Bench', 'Row'].map((id, sort_order) => ({
  id, exercise_id: id, plan_day_id: 'day', sort_order, is_main_lift: sort_order < 2, notes: null,
  sets: [set({ id: `${id}-1`, target_value: '80' }), set({ id: `${id}-2`, set_number: 2, target_value: '80' })],
})) });
const drafts = synthesizeDrafts(planDay, []);
let renderer: ReactTestRenderer;
const onRecord = jest.fn();
const onToggleComplete = jest.fn();
const onExerciseCompleted = jest.fn();
async function render(rows: WorkoutSetDraft[], editable = true, recording = true, preview = false, exercises = planDay.exercises) {
  setLocaleOverride('en');
  const body = <View><WorkoutBody exercises={exercises} drafts={rows} editable={editable} recording={recording}
    preview={preview ? { title: 'Preview' } : undefined} startLoading={false} onStart={() => {}}
    suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[]}
    onExerciseCompleted={onExerciseCompleted} studentId="student" onVideo={() => {}} onRecord={onRecord} onToggleComplete={onToggleComplete}
    resolveExerciseMetadata={id => ({ name: id, exerciseType: id === 'Row' ? 'accessory' : 'main_lift', rawFamily: null, competitionFamily: null })} /></View>;
  await act(async () => { if (renderer) renderer.update(body); else renderer = create(body); });
}
const copy = () => renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));
afterEach(() => { act(() => renderer?.unmount()); renderer = undefined!; jest.clearAllMocks(); setLocaleOverride(null); });

test('an accessory hero appears once and the lower set-table cards start with the next unfinished exercise', async () => {
  const exercises = [planDay.exercises[2], planDay.exercises[0], planDay.exercises[1]]
    .map((exercise, sort_order) => ({ ...exercise, sort_order }));
  await render(synthesizeDrafts(day('day', { exercises }), []), true, true, false, exercises);
  const lowerCards = renderer.root.findAllByType(RollUpCard).filter(card => !card.props.completed);
  expect(lowerCards.map(card => card.findAllByType(Text)[0].props.children)).toEqual(['Squat', 'Bench']);
  expect(copy().filter(text => text === 'Row')).toHaveLength(1);
});

test('a main-lift hero keeps its own set-table card first below the hero', async () => {
  await render(drafts);
  const lowerCards = renderer.root.findAllByType(RollUpCard).filter(card => !card.props.completed);
  expect(lowerCards.map(card => card.findAllByType(Text)[0].props.children)).toEqual(['Squat', 'Bench', 'Row']);
  expect(copy().filter(text => text === 'Squat')).toHaveLength(2);
});

test('restored accessory progress stays deduplicated through completion, the next accessory hero, and undo', async () => {
  const row = planDay.exercises[2];
  const exercises = [row, { ...row, id: 'Row-next', sets: row.sets.map(set => ({ ...set, id: `${set.id}-next` })) }, planDay.exercises[1]]
    .map((exercise, sort_order) => ({ ...exercise, sort_order }));
  const restored = synthesizeDrafts(day('day', { exercises }), [])
    .map((draft, index) => index === 0 ? { ...draft, status: 'complete' as const } : draft);
  const lowerTitles = () => renderer.root.findAllByType(RollUpCard)
    .filter(card => !card.props.completed).map(card => card.findAllByType(Text)[0].props.children);
  await render(restored, true, true, false, exercises);
  expect(onExerciseCompleted).not.toHaveBeenCalled();
  // The later plan exercise uses the same library exercise and must remain visible.
  expect(lowerTitles()).toEqual(['Row', 'Bench']);

  const completed = restored.map(draft => draft.exercise.id === 'Row' ? { ...draft, status: 'complete' as const } : draft);
  await render(completed, true, true, false, exercises);
  expect(onExerciseCompleted).toHaveBeenCalledWith('Row');
  expect(copy().indexOf('Completed · 2 sets')).toBeLessThan(copy().lastIndexOf('Row'));
  expect(lowerTitles()).toEqual(['Bench']);

  await render(restored, true, true, false, exercises);
  expect(copy()).not.toContain('Completed · 2 sets');
  expect(lowerTitles()).toEqual(['Row', 'Bench']);
});

test('finishing the first exercise moves its completed row above the next hero and preserves editing', async () => {
  await render(drafts);
  expect(copy()).not.toContain('Completed · 2 sets');
  await render(drafts.map((draft, index) => index < 2 ? { ...draft, status: 'complete' } : draft));
  expect(copy().indexOf('Completed · 2 sets')).toBeGreaterThan(-1);
  expect(copy().indexOf('Completed · 2 sets')).toBeLessThan(copy().indexOf('Bench'));
  const completed = renderer.root.findAll(node => node.props.accessibilityLabel === 'Squat, completed, 2 sets' && node.props.onPress)[0];
  expect(completed.props.accessibilityState.expanded).toBe(false);
  await act(async () => completed.props.onPress());
  expect(completed.props.accessibilityState.expanded).toBe(true);
  const firstRow = renderer.root.findAll(node => node.props.onPress && node.findAllByType(Text).some(text => text.props.children === 1))[0];
  await act(async () => firstRow.props.onPress());
  expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({ stableSetId: 'Squat-1' }));
});

test('all done removes the hero; undo restores the first unfinished exercise below completed rows', async () => {
  const complete = drafts.map(draft => ({ ...draft, status: 'complete' as const }));
  await render(complete);
  expect(renderer.root.findAllByProps({ testID: 'workout-hero' })).toHaveLength(0);
  expect(copy().filter(text => text === 'Completed · 2 sets')).toHaveLength(3);
  await render(complete.map((draft, index) => index === 4 ? { ...draft, status: 'pending' } : draft));
  expect(renderer.root.findAllByProps({ testID: 'workout-hero' }).length).toBeGreaterThan(0);
  expect(copy().filter(text => text === 'Completed · 2 sets')).toHaveLength(2);
  expect(copy().indexOf('Completed · 2 sets')).toBeLessThan(copy().indexOf('Row'));
  expect(renderer.root.findAllByProps({ testID: 'set-progress' })).toHaveLength(0);
});

test('main lift progress is hidden from screen readers and excluded from summary and preview', async () => {
  await render(drafts);
  expect(renderer.root.findAllByProps({ testID: 'set-progress' })[0].props.importantForAccessibility).toBe('no-hide-descendants');
  for (const [editable, recording, preview] of [[true, false, false], [false, true, false], [false, false, true]]) {
    await render(drafts.map(draft => ({ ...draft, status: 'complete' })), editable, recording, preview);
    expect(copy()).not.toContain('Completed · 2 sets');
    expect(renderer.root.findAllByProps({ testID: 'set-progress' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'workout-hero' }).length).toBeGreaterThan(0);
  }
});


test('restored completed exercises start in place; only a new completion requests completed-row reveal', async () => {
  const restored = drafts.map((draft, index) => index < 2 ? { ...draft, status: 'complete' as const } : draft);
  await render(restored);
  expect(onExerciseCompleted).not.toHaveBeenCalled();
  expect(copy().indexOf('Completed · 2 sets')).toBeLessThan(copy().indexOf('Bench'));
  await render(restored.map((draft, index) => index < 4 ? { ...draft, status: 'complete' } : draft));
  expect(onExerciseCompleted).toHaveBeenCalledTimes(1);
  expect(onExerciseCompleted).toHaveBeenCalledWith('Bench');
});
