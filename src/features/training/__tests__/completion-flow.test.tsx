import { afterEach, beforeEach, expect, test, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, TextInput } from 'react-native';
import { setLocaleOverride, t } from '@/i18n';
import { colors } from '@/design/tokens';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { workoutCompletionPresentation } from '../completion-presentation';
import { WorkoutCompletionFlowView } from '../CompletionControls';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));

const planDay = day('day', { exercises: [{ id: 'exercise', exercise_id: 'squat', plan_day_id: 'day', sort_order: 0, is_main_lift: true, notes: null, sets: [set()] }] });
const presentation = workoutCompletionPresentation({ planDay, drafts: synthesizeDrafts(planDay, []).map(draft => ({ ...draft, status: 'failed' })), weekCode: 'W1D3', coachName: null, references: new Map(), previousVolumeChangePercent: null, date: '2026-09-09', exerciseNames: new Map([['squat', 'Squat']]) });
let renderer: ReactTestRenderer;
const copy = () => renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));
const press = async (label: string) => { await act(async () => { await renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label)[0].props.onPress(); }); };
beforeEach(() => setLocaleOverride('en'));
afterEach(() => { act(() => renderer?.unmount()); setLocaleOverride(null); });

test('celebration opens review and review finishes the same full-screen flow', async () => {
  const onFinish = jest.fn(async () => {});
  await act(async () => { renderer = create(<WorkoutCompletionFlowView presentation={presentation} initialPhase="celebration" onFinish={onFinish} onReflectionChange={async () => {}} />); });
  expect(copy()).toEqual(expect.arrayContaining([t('student.workoutCompletionFlowView.copy001'), 'W1D3']));
  await press(t('student.workoutCompletionFlowView.copy002'));
  expect(copy()).toContain(t('student.sessionSummaryView.copy003'));
  const status = renderer.root.findAllByType(Text).find(node => node.props.children === presentation.exercises[0].statusText)!;
  expect(StyleSheet.flatten(status.props.style).color).toBe(colors.danger);
  await press(t('student.sessionSummaryView.copy002'));
  expect(onFinish).toHaveBeenCalledWith({ goal: '', achieved: '', improve: '' });
});

test('banner entry starts at review, saves each reflection edit, and finish waits for those writes', async () => {
  let releaseWrite!: () => void;
  const writes: string[] = [];
  const onReflectionChange = jest.fn(async (reflection: { goal: string }) => { writes.push(reflection.goal); await new Promise<void>(resolve => { releaseWrite = resolve; }); });
  const onFinish = jest.fn(async () => {});
  await act(async () => { renderer = create(<WorkoutCompletionFlowView presentation={presentation} initialPhase="review" initialReflection={{ goal: 'Before', achieved: '', improve: '' }} onFinish={onFinish} onReflectionChange={onReflectionChange} />); });
  expect(copy()).toContain(t('student.sessionSummaryView.copy003'));
  expect(copy()).not.toContain(t('student.workoutCompletionFlowView.copy001'));
  await act(async () => { renderer.root.findAllByType(TextInput)[0].props.onChangeText('After'); });
  expect(writes).toEqual(['After']);
  await press(t('student.sessionSummaryView.copy002'));
  expect(onFinish).not.toHaveBeenCalled();
  await act(async () => { releaseWrite(); });
  expect(onFinish).toHaveBeenCalledWith({ goal: 'After', achieved: '', improve: '' });
});

test('celebration can finish directly and repeated finish presses are ignored', async () => {
  const onFinish = jest.fn(async () => {});
  await act(async () => { renderer = create(<WorkoutCompletionFlowView presentation={presentation} initialPhase="celebration" onFinish={onFinish} onReflectionChange={async () => {}} />); });
  await press(t('student.workoutCompletionFlowView.copy003'));
  await press(t('student.workoutCompletionFlowView.copy003'));
  expect(onFinish).toHaveBeenCalledTimes(1);
});
