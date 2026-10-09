import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { Card } from '@/design';
import { setLocaleOverride } from '@/i18n';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { WorkoutBody } from '../WorkoutBody';
import type { PlanDay } from '@/api/domains/plans';
import type { WorkoutSetDraft } from '../model';

jest.mock('react-native-compressor', () => ({}));
jest.mock('expo-media-library', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

let renderer: ReactTestRenderer | undefined;
beforeEach(() => { renderer = undefined; setLocaleOverride('en'); });
afterEach(() => { act(() => renderer?.unmount()); setLocaleOverride(null); });

async function renderNotes(exerciseNote: string | null, setNote: string | null, editable = true) {
  const planDay = day('day', { exercises: [{ id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: exerciseNote, sets: [set({ coach_note: setNote, target_value: '80' })] }] });
  await renderWorkout(planDay, synthesizeDrafts(planDay, []), editable);
}
async function renderWorkout(planDay: PlanDay, drafts: WorkoutSetDraft[], editable = true) {
  const body = <WorkoutBody exercises={planDay.exercises} drafts={drafts}
    editable={editable} recording startLoading={false} onStart={() => {}}
    suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[]}
    studentId="student" onVideo={() => {}} onRecord={() => {}} onToggleComplete={() => {}}
    resolveExerciseMetadata={() => null} />;
  await act(async () => { if (renderer) renderer.update(body); else renderer = create(body); });
}
const heroCopy = () => renderer!.root.findAllByType(Card)[0].findAllByType(Text).map(node => [node.props.children].flat().join(''));

test.each<['en' | 'zh', string]>([['en', 'Coach note'], ['zh', '教练备注']])('the %s hero has one unsuffixed exercise note above the weight with full text', async (locale, title) => {
  setLocaleOverride(locale);
  const longNote = 'Keep the movement controlled. '.repeat(8).trim();
  await renderNotes(longNote, null);
  const copy = heroCopy();
  expect(copy).toContain(title);
  expect(copy).toContain(longNote);
  expect(copy.filter(text => text.includes(title))).toEqual([title]);
  expect(copy.indexOf(title)).toBeLessThan(copy.indexOf(longNote));
  expect(copy.indexOf(longNote)).toBeLessThan(copy.indexOf('80'));
});

test.each([true, false])('set text stays below the prescription; only read-only heroes fall back to exercise notes (editable=%s)', async editable => {
  await renderNotes('Pause on every rep.', ' Bodyweight ', editable);
  let copy = heroCopy();
  expect(copy).toContain('Bodyweight');
  expect(copy.indexOf('Bodyweight')).toBeGreaterThan(copy.indexOf('80kg x 5'));
  expect(copy.includes('Pause on every rep.')).toBe(editable);
  if (editable) expect(copy.indexOf('Bodyweight')).toBeLessThan(copy.indexOf('Log this set'));

  for (const empty of [null, '', ' \n\t ']) {
    await renderNotes(' Pause on every rep. \n', empty, editable);
    copy = heroCopy();
    expect(copy).not.toContain('Bodyweight');
    expect(copy.filter(text => text === 'Coach note')).toHaveLength(1);
    expect(copy).toContain('Pause on every rep.');
    if (!editable) {
      expect(copy.indexOf('Coach note')).toBeGreaterThan(copy.indexOf('80kg x 5'));
      expect(copy.indexOf('Pause on every rep.')).toBeGreaterThan(copy.indexOf('Coach note'));
    }
  }
  if (!editable) {
    for (const empty of [null, '', ' \n\t ']) {
      await renderNotes(empty, empty, false);
      expect(heroCopy()).not.toContain('Coach note');
    }
  }
});

test.each([null, '', ' \n\t '])('without an exercise note (%p), only the lower set note is shown', async exerciseNote => {
  await renderNotes(exerciseNote, 'Bodyweight');
  const copy = heroCopy();
  expect(copy.filter(text => text === 'Coach note')).toHaveLength(1);
  expect(copy.indexOf('Coach note')).toBeGreaterThan(copy.indexOf('80kg x 5'));
  expect(copy).toContain('Bodyweight');
  await renderNotes(exerciseNote, null);
  expect(heroCopy()).not.toContain('Coach note');
});

test('advancing sets keeps the exercise note until the next exercise and changes the lower set note independently', async () => {
  const planDay = day('day', { exercises: [
    { id: 'squat', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: 'Pause in the hole.',
      sets: [set({ id: 'first', coach_note: 'First system note' }), set({ id: 'second', coach_note: 'Second system note', set_number: 2 })] },
    { id: 'bench', plan_day_id: 'day', exercise_id: 'bench', sort_order: 1, is_main_lift: true, notes: 'Pause on the chest.',
      sets: [set({ id: 'third', coach_note: null })] },
  ] });
  const drafts = synthesizeDrafts(planDay, []);
  await renderWorkout(planDay, drafts);
  expect(heroCopy()).toContain('Pause in the hole.');
  expect(heroCopy()).toContain('First system note');
  await renderWorkout(planDay, drafts.map((draft, index) => index === 0 ? { ...draft, status: 'complete' } : draft));
  expect(heroCopy()).toContain('Pause in the hole.');
  expect(heroCopy()).toContain('Second system note');
  expect(heroCopy()).not.toContain('First system note');
  await renderWorkout(planDay, drafts.map((draft, index) => index < 2 ? { ...draft, status: 'complete' } : draft));
  expect(heroCopy()).toContain('Pause on the chest.');
  expect(heroCopy()).not.toContain('Pause in the hole.');
  expect(heroCopy()).not.toContain('Second system note');
  expect(heroCopy().filter(text => text === 'Coach note')).toHaveLength(1);
});
