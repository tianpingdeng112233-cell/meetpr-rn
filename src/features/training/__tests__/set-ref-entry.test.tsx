import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { SetRefEntryVisibility } from '@/features/chat/set-ref';
import { WorkoutBody } from '../WorkoutBody';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { t } from '@/i18n';
jest.mock('react-native-compressor', () => ({}));
jest.mock('expo-media-library', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const cases = [
  [false, false, false, false, false], [false, false, false, true, false],
  [false, false, true, false, false], [false, false, true, true, false],
  [false, true, false, false, false], [false, true, false, true, false],
  [false, true, true, false, false], [false, true, true, true, false],
  [true, false, false, false, false], [true, false, false, true, false],
  [true, false, true, false, false], [true, false, true, true, false],
  [true, true, false, false, false], [true, true, false, true, false],
  [true, true, true, false, false], [true, true, true, true, true],
];
test.each(cases)('entry visibility editable=%s sets=%s coach=%s context=%s => %s', (isEditable, hasAvailableSet, hasActiveCoach, hasSharingContext, expected) => {
  expect(SetRefEntryVisibility.shouldShow({ isEditable, hasAvailableSet, hasActiveCoach, hasSharingContext })).toBe(expected);
});
let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });
test.each([true, false])('hero Ask coach obeys editable=%s', async editable => {
  const planDay = day('day', { exercises: [{ id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: null, sets: [set()] }] });
  await act(async () => { renderer = create(<WorkoutBody exercises={planDay.exercises} drafts={synthesizeDrafts(planDay, [])} editable={editable} recording={false} startLoading={false} onStart={() => {}} suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[]} studentId="student" onVideo={() => {}} onRecord={() => {}} onToggleComplete={() => {}} resolveExerciseMetadata={() => null} onAskCoach={() => {}} />); });
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === t('student.askCoach'))).toBe(editable);
});
