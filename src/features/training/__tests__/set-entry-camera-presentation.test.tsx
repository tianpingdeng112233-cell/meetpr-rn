import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Modal, Text, StyleSheet } from 'react-native';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { SetEntrySheet } from '../SetEntrySheet';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { NumberPad } from '@/design/NumberPad';
import { setLocaleOverride, t } from '@/i18n';

jest.mock('expo-media-library', () => ({}));
jest.mock('react-native-compressor', () => ({}));
jest.mock('react-native-video', () => 'Video');
jest.mock('../video-upload/use-camera-availability', () => ({ useCameraAvailability: () => true }));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const planDay = day('day', { exercises: [{ id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: null, sets: [set()] }] });
let renderer: ReactTestRenderer;
beforeEach(async () => { await AsyncStorage.clear(); jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); setLocaleOverride(null); });

test.each(['left', 'backdrop', 'back', 'confirm'] as const)('105r main entry %s retains local input until the record button submits', async action => {
  setLocaleOverride('en');
  const onSave = jest.fn(async () => {});
  await act(async () => { renderer = create(<SetEntrySheet studentId="student" draft={synthesizeDrafts(planDay, [])[0]} collarOn={false} editable exerciseName="Squat" suggestion={null} suggestionReason={null} ensureSetLog={async () => 'log'} onChangeCollar={() => {}} onClose={() => {}} onSave={onSave} />); });
  const field = () => renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === t('student.setEntrySheet.copy001'))!;
  await act(async () => field().props.onPress!({} as never));
  const pad = () => renderer.root.findByType(NumberPad);
  for (const key of ['8', '2', t('designSystem.numberPad.decimalPoint'), '2', '5']) await act(async () => pad().findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === key)!.props.onPress!({} as never));
  expect(field().props.accessibilityValue.text).toBe('82.25 KG');
  const controls = pad().findAllByType(FeedbackPressable);
  await act(async () => action === 'back' ? renderer.root.findByType(Modal).props.onRequestClose() : (action === 'confirm' ? controls.at(-1)! : action === 'left' ? controls.at(-2)! : controls[0]).props.onPress!({} as never));
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
  expect(field().props.accessibilityValue.text).toBe('82.25 KG');
  expect(onSave).not.toHaveBeenCalled();
  await act(async () => renderer.root.findAllByType(FeedbackPressable).find(node => node.findAllByType(Text).some(text => text.props.children === t('student.setEntrySheet.copy012')))!.props.onPress!({} as never));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ weightText: '82.25', failed: false }));
});

test.each(['untouched', 'empty'] as const)('105r main %s dismissal writes nothing', async input => {
  setLocaleOverride('en');
  const onSave = jest.fn(async () => {});
  const draft = { ...synthesizeDrafts(planDay, [])[0], weightText: '80' };
  await act(async () => { renderer = create(<SetEntrySheet studentId="student" draft={draft} collarOn={false} editable exerciseName="Squat" suggestion={null} suggestionReason={null} ensureSetLog={async () => 'log'} onChangeCollar={() => {}} onClose={() => {}} onSave={onSave} />); });
  const field = () => renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === t('student.setEntrySheet.copy001'))!;
  await act(async () => field().props.onPress!({} as never));
  if (input === 'empty') for (let i = 0; i < 2; i++) await act(async () => renderer.root.findByType(NumberPad).findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === t('designSystem.numberPad.backspace'))!.props.onPress!({} as never));
  await act(async () => renderer.root.findByType(NumberPad).findAllByType(FeedbackPressable)[0].props.onPress!({} as never));
  expect(field().props.accessibilityValue.text).toBe('80 KG');
  expect(onSave).not.toHaveBeenCalled();
});

test('105r main invalid reps dismissal restores the last valid value without saving', async () => {
  setLocaleOverride('en');
  const onSave = jest.fn(async () => {});
  await act(async () => { renderer = create(<SetEntrySheet studentId="student" draft={synthesizeDrafts(planDay, [])[0]} collarOn={false} editable exerciseName="Squat" suggestion={null} suggestionReason={null} ensureSetLog={async () => 'log'} onChangeCollar={() => {}} onClose={() => {}} onSave={onSave} />); });
  const field = () => renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === t('student.setEntrySheet.copy003'))!;
  const oldValue = field().props.accessibilityValue.text;
  await act(async () => field().props.onPress!({} as never));
  for (const key of ['1', '0', '0']) await act(async () => renderer.root.findByType(NumberPad).findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === key)!.props.onPress!({} as never));
  expect(field().props.accessibilityValue.text).toBe(`100 ${t('student.setEntrySheet.copy004')}`);
  await act(async () => renderer.root.findByType(NumberPad).findAllByType(FeedbackPressable)[0].props.onPress!({} as never));
  expect(field().props.accessibilityValue.text).toBe(oldValue);
  expect(onSave).not.toHaveBeenCalled();
});

test('first Record entry waits for the native sheet to show before prompting and prompts only once', async () => {
  await act(async () => { renderer = create(<SetEntrySheet studentId="student" initialCamera draft={synthesizeDrafts(planDay, [])[0]} collarOn={false} editable exerciseName="Squat" suggestion={null} suggestionReason={null} ensureSetLog={async () => 'log'} onChangeCollar={() => {}} onClose={() => {}} onSave={async () => {}} />); });
  expect(Alert.alert).not.toHaveBeenCalled();
  await act(async () => { renderer.root.findByType(Modal).props.onShow(); });
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  await act(async () => { renderer.root.findByType(Modal).props.onShow(); });
  expect(Alert.alert).toHaveBeenCalledTimes(1);
});


test.each(['free_weight', 'bodyweight'] as const)('056 single-set entry enforces %s weight semantics', async load_mode => {
  setLocaleOverride('zh');
  const onSave = jest.fn(async () => {});
  const inputDay = { ...planDay, exercises: [{ ...planDay.exercises[0], sets: [set({ load_mode, intensity_mode: null, target_value: null })] }] };
  await act(async () => { renderer = create(<SetEntrySheet studentId="student" draft={synthesizeDrafts(inputDay, [])[0]} collarOn={false} editable exerciseName="Squat" suggestion={null} suggestionReason={null} ensureSetLog={async () => 'log'} onChangeCollar={() => {}} onClose={() => {}} onSave={onSave} />); });
  const label = load_mode === 'free_weight' ? '重量 kg · 必填' : '额外负重 kg · 选填';
  const field = () => renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === label)!;
  expect(field().props.accessibilityValue.text).toBe(load_mode === 'bodyweight' ? '0 KG' : ' KG');
  const complete = renderer.root.findAllByType(FeedbackPressable).find(node => node.findAllByType(Text).some(text => text.props.children === t('student.setEntrySheet.copy012')))!;
  expect(complete.props.disabled).toBe(false);
  await act(async () => complete.props.onPress());
  if (load_mode === 'bodyweight') expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ weightText: '0' }));
  else {
    expect(onSave).not.toHaveBeenCalled();
    expect(StyleSheet.flatten(field().props.style)).toMatchObject({ borderWidth: 1 });
    expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain('第 1 组还没填重量——自选重量的组要填实际用的重量才能完成。');
  }
});


test.each(['bodyweight', 'free_weight'] as const)('056 %s entry does not select the projected RPE 10', async load_mode => {
  setLocaleOverride('zh');
  const inputDay = { ...planDay, exercises: [{ ...planDay.exercises[0], sets: [set({ load_mode, intensity_mode: 'rpe', target_value: '10.00' })] }] };
  await act(async () => { renderer = create(<SetEntrySheet studentId="student" draft={synthesizeDrafts(inputDay, [])[0]} collarOn={false} editable exerciseName="Squat" suggestion={null} suggestionReason={null} ensureSetLog={async () => 'log'} onChangeCollar={() => {}} onClose={() => {}} onSave={async () => {}} />); });
  const scale = renderer.root.findAll(node => node.props.accessibilityRole === 'adjustable')[0];
  expect(scale.props.accessibilityValue.now).not.toBe(10);
  expect(scale.props.accessibilityValue.text).toBe(t('student.todayWorkoutTypes.copy028'));
});
