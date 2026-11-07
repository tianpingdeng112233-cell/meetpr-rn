import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { setLocaleOverride } from '@/i18n';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import type { WorkoutSetDraft } from '../model';
import { WorkoutBody } from '../WorkoutBody';

jest.mock('react-native-compressor', () => ({}));
jest.mock('expo-media-library', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const planDay = day('day', { exercises: [{
  id: 'squat', exercise_id: 'squat', plan_day_id: 'day', sort_order: 0, is_main_lift: true, notes: null,
  sets: [
    set({ id: 'squat-1', target_value: '100' }),
    set({ id: 'squat-2', set_number: 2, target_value: '120' }),
    set({ id: 'squat-3', set_number: 3, load_mode: 'pct', target_pct: '80', pct_anchor: 'registered_1rm' }),
  ],
}] });
const prescribedDrafts = synthesizeDrafts(planDay, []);
const rows: WorkoutSetDraft[] = [
  prescribedDrafts[0],
  { ...prescribedDrafts[0], kind: 'extra', stableSetId: 'extra', setIndex: 3, planSet: set({ target_value: '999' }) },
  prescribedDrafts[1],
  { ...prescribedDrafts[0], kind: 'added', stableSetId: 'added', setIndex: 4, planSet: set({ target_value: '888' }) },
  prescribedDrafts[2],
];
let renderer: ReactTestRenderer;
const copy = (node: ReactTestInstance) => node.findAllByType(Text).map(text => [text.props.children].flat().join(''));
const exerciseButton = () => renderer.root.findAllByType(FeedbackPressable)
  .find(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'Squat');

afterEach(() => {
  act(() => renderer?.unmount());
  setLocaleOverride(null);
});

test.each(['today', 'preview'] as const)('%s hero toggles per-set prescriptions and excludes student-added sets', async mode => {
  setLocaleOverride('en');
  await act(async () => {
    renderer = create(<WorkoutBody exercises={planDay.exercises} drafts={rows} editable={mode === 'today'} recording={false}
      preview={mode === 'preview' ? { title: 'Preview' } : undefined} startLoading={false} onStart={() => {}}
      suggestionForDraft={() => ({ suggestion: null, reason: null, percentage: { resolvedKg: 160, source: 'registered_1rm', anchorKg: 200 } })}
      historyLogs={[]} studentId="student" onVideo={() => {}} onRecord={() => {}} onToggleComplete={() => {}}
      resolveExerciseMetadata={() => ({ name: 'Squat', exerciseType: 'main_lift', rawFamily: 'squat', competitionFamily: 'squat' })} />);
  });
  const prescriptions = ['100kg x 5', '120kg x 5', '≈ 160 kg · 80% · 1RM × 5'];
  for (const text of prescriptions) expect(copy(renderer.root)).not.toContain(text);
  expect(exerciseButton()).toBeDefined();
  expect(exerciseButton()!.props.accessibilityState).toEqual({ expanded: false });
  expect(copy(exerciseButton()!)).toContain('›');
  const summary = copy(exerciseButton()!);

  await act(async () => exerciseButton()!.props.onPress());
  expect(exerciseButton()!.props.accessibilityState).toEqual({ expanded: true });
  expect(copy(exerciseButton()!)).toEqual(summary.map(text => text === '›' ? '⌄' : text));
  for (const [index, text] of prescriptions.entries()) {
    const prescription = renderer.root.findAllByType(Text).find(node => node.props.children === text);
    expect(prescription).toBeDefined();
    expect(copy(prescription!.parent!)).toEqual([String(index + 1), text]);
  }
  expect(copy(renderer.root)).not.toContain('999kg x 5');
  expect(copy(renderer.root)).not.toContain('888kg x 5');

  await act(async () => exerciseButton()!.props.onPress());
  expect(exerciseButton()!.props.accessibilityState).toEqual({ expanded: false });
  expect(copy(exerciseButton()!)).toEqual(summary);
  for (const text of prescriptions) expect(copy(renderer.root)).not.toContain(text);
});
