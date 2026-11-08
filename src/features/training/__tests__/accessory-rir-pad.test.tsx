import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Modal, Text } from 'react-native';
import type { SetLog } from '@/api/domains/sets';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { NumberPad } from '@/design/NumberPad';
import { day, set } from '@/domain/plan/test-fixtures';
import { setLocaleOverride, t } from '@/i18n';
import { AccessoryLogCard } from '../AccessoryLogCard';
import { EffortToggleLabel } from '../EffortToggleLabel';
import { synthesizeDrafts } from '../drafts';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

let renderer: ReactTestRenderer;
afterEach(() => {
  act(() => renderer?.unmount());
  setLocaleOverride(null);
});

const button = (label: string) => renderer.root.findAllByType(FeedbackPressable)
  .find(node => node.props.accessibilityLabel === label)!;
const pad = () => renderer.root.findByType(NumberPad);
const pressKey = async (label: string) => {
  await act(async () => pad().findAllByType(FeedbackPressable)
    .find(node => node.props.accessibilityLabel === label)!.props.onPress!({} as never));
};
const closePad = async (action: 'left' | 'backdrop' | 'back') => {
  const controls = pad().findAllByType(FeedbackPressable);
  await act(async () => action === 'back' ? renderer.root.findByType(Modal).props.onRequestClose()
    : (action === 'left' ? controls.at(-2)! : controls[0]).props.onPress!({} as never));
};
async function mountEntry(saved?: Partial<SetLog>, allRecorded = false) {
  setLocaleOverride('en');
  const planDay = day('day', { exercises: [{ id: 'exercise', plan_day_id: 'day', exercise_id: 'pulldown',
    sort_order: 0, is_main_lift: false, notes: null,
    sets: [1, 2].map(n => set({ id: `set-${n}`, set_number: n, target_value: '57', target_reps: 10 })),
  }] });
  const logs: SetLog[] = saved ? [{ id: 'log', student_id: 'student', exercise_id: 'pulldown', plan_exercise_id: 'exercise',
    set_index: 0, weight_kg: '57', reps: 10, rpe: null, actual_rir: null, completed: false, failed: false, assumed: false, adhoc: false,
    logged_date: '2026-11-08', logged_at: '2026-11-08T14:00:00Z', ...saved }] : [];
  if (allRecorded) logs.push({ ...logs[0], id: 'log-2', set_index: 1 });
  const save = jest.fn(async () => {});
  await act(async () => { renderer = create(<AccessoryLogCard exerciseName="Pulldown" allowsRIR
    drafts={synthesizeDrafts(planDay, logs)} previousLogs={[]} unit="kg" studentId="student" onRecord={() => {}} onSave={save} />); });
  return save;
}

test.each(['left', 'backdrop', 'back'] as const)('105r %s keeps RIR locally and only the checkmark submits it', async action => {
  const save = await mountEntry();
  await act(async () => button(t('training.effort.switch')).props.onPress!({} as never));
  await act(async () => button('Set 1 RIR').props.onPress!({} as never));
  await pressKey('2');
  await closePad(action);
  expect(button('Set 1 RIR').props.accessibilityValue.text).toBe('2');
  expect(save).not.toHaveBeenCalled();
  await act(async () => button('Complete set 1').props.onPress!({} as never));
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ actual_rir: 2, rpe: null, completed: true }), 'single');
});

test('105r every keystroke updates the visible cell without saving prematurely', async () => {
  const save = await mountEntry();
  await act(async () => button('Set 1 weight').props.onPress!({} as never));
  for (const [key, text] of [['7', '7'], [t('designSystem.numberPad.decimalPoint'), '7.'], ['5', '7.5'], [t('designSystem.numberPad.backspace'), '7.']]) {
    await pressKey(key);
    expect(button('Set 1 weight').props.accessibilityValue.text).toBe(text);
  }
  expect(save).not.toHaveBeenCalled();
});

test.each([undefined, { rpe: '7', completed: true }, { rpe: null, completed: true }])('105r opening and dismissing does not create or rewrite records: %j', async saved => {
  const save = await mountEntry(saved);
  await act(async () => button(t('training.effort.switch')).props.onPress!({} as never));
  const effort = button('Set 1 RIR') ?? button('Set 1 RPE');
  const oldValue = effort.props.accessibilityValue.text;
  await act(async () => effort.props.onPress!({} as never));
  await closePad('backdrop');
  expect(save).not.toHaveBeenCalled();
  expect((button('Set 1 RIR') ?? button('Set 1 RPE')).props.accessibilityValue.text).toBe(oldValue);
});

test.each(['3', 'empty'])('105r dismissing %s RPE restores the last committed value without writing', async value => {
  const save = await mountEntry({ rpe: '7', completed: true });
  await act(async () => button('Set 1 RPE').props.onPress!({} as never));
  await pressKey(value === 'empty' ? t('designSystem.numberPad.backspace') : value);
  await closePad('left');
  expect(button('Set 1 RPE').props.accessibilityValue.text).toBe('7');
  expect(save).not.toHaveBeenCalled();
});

test('105r editing a saved RIR in RPE mode clears RIR and preserves completion', async () => {
  const save = await mountEntry({ actual_rir: 2, completed: true });
  await act(async () => button('Set 1 RIR').props.onPress!({} as never));
  expect(pad().props.initialValue).toBe('');
  await pressKey('8');
  await closePad('left');
  expect(save).not.toHaveBeenCalled();
  await act(async () => button('Complete set 1').props.onPress!({} as never));
  expect(save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rpe: '8', actual_rir: null, completed: true }), 'single');
});

test('105r an empty saved effort edits in the header mode and repeated dismissal remains writable', async () => {
  const save = await mountEntry({ completed: true });
  await act(async () => button(t('training.effort.switch')).props.onPress!({} as never));
  await act(async () => (button('Set 1 RIR') ?? button('Set 1 RPE')).props.onPress!({} as never));
  await pressKey('2');
  await closePad('backdrop');
  await act(async () => button('Set 1 RIR').props.onPress!({} as never));
  await pressKey('0');
  await closePad('left');
  expect(save).not.toHaveBeenCalled();
  await act(async () => button('Complete set 1').props.onPress!({} as never));
  expect(save).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ rpe: null, actual_rir: 0, completed: true }), 'single');
});

test('105r final confirm stays local and an all-recorded card can change mode without undoing equal-valued effort', async () => {
  const save = await mountEntry({ rpe: '7', completed: true }, true);
  const toggle = button(t('training.effort.switch'));
  expect(toggle.props.disabled).toBe(false);
  await act(async () => toggle.props.onPress!({} as never));
  expect(save).not.toHaveBeenCalled();
  await act(async () => button('Set 2 RPE').props.onPress!({} as never));
  expect(pad().props.initialValue).toBe('');
  expect(pad().props.field).toBe('rir');
  await pressKey('7');
  await act(async () => pad().findAllByType(FeedbackPressable).at(-1)!.props.onPress!({} as never));
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
  expect(button('Set 2 RIR').props.accessibilityValue.text).toBe('7');
  expect(save).not.toHaveBeenCalled();
  await act(async () => button('Complete set 2').props.onPress!({} as never));
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rpe: null, actual_rir: 7, completed: true }), 'single');
});

test('105r original: RIR header accepts 2 over a previously recorded RPE and saves RIR', async () => {
  setLocaleOverride('zh');
  const planDay = day('day', { exercises: [{
    id: 'exercise', plan_day_id: 'day', exercise_id: 'pulldown',
    sort_order: 0, is_main_lift: false, notes: null,
    sets: [1, 2].map(n => set({ id: `set-${n}`, set_number: n, target_reps: 10, load_mode: 'rir', rir_target: 1 })),
  }] });
  const log: SetLog = {
    id: 'log', student_id: 'student', exercise_id: 'pulldown', plan_exercise_id: 'exercise',
    set_index: 0, weight_kg: '57', reps: 10, rpe: '7', actual_rir: null,
    completed: true, failed: false, assumed: false, adhoc: false,
    logged_date: '2026-11-08', logged_at: '2026-11-08T14:00:00Z',
  };
  const save = jest.fn(async () => {});
  await act(async () => {
    renderer = create(<AccessoryLogCard exerciseName="颈后高位下拉" allowsRIR
      drafts={synthesizeDrafts(planDay, [log])} previousLogs={[]} unit="kg"
      studentId="student" onRecord={() => {}} onSave={save} />);
  });
  const button = (label: string) => renderer.root.findAllByType(FeedbackPressable)
    .find(node => node.props.accessibilityLabel === label)!;
  expect(renderer.root.findByType(EffortToggleLabel).findByType(Text).props.children).toBe('RIR');
  await act(async () => button(t('training.effort.switch')).props.onPress!({} as never));
  expect(renderer.root.findByType(EffortToggleLabel).findByType(Text).props.children).toBe('RPE');
  await act(async () => button(t('training.effort.switch')).props.onPress!({} as never));
  expect(renderer.root.findByType(EffortToggleLabel).findByType(Text).props.children).toBe('RIR');
  expect(renderer.root.findAllByType(Text).map(node => node.props.children))
    .toContain(t('training.effort.saved', [1, 'RPE']));
  expect(button(t('training.explainer.rir.help'))).toBeDefined();
  expect(button(t('training.effort.rirLabel', [2])).props.accessibilityHint).toBe('1');
  // Locate the same visible effort cell even when its accessibility label disagrees with the header.
  const effort = button(t('training.effort.rirLabel', [1])) ?? button(t('student.accessory.rpeLabel', [1]));
  await act(async () => effort.props.onPress!({} as never));
  const pad = () => renderer.root.findByType(NumberPad);
  const key = (label: string) => pad().findAllByType(FeedbackPressable)
    .find(node => node.props.accessibilityLabel === label)!;
  await act(async () => key('2').props.onPress!({} as never));
  const confirm = pad().findAllByType(FeedbackPressable).at(-1)!;
  expect(pad().props.nextTitle).toBe(t('student.accessory.pad.next', [t('student.accessory.pad.weight')]));
  const displayTexts = pad().findAllByType(Text).filter(node => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (parent.type === FeedbackPressable) return false;
    }
    return true;
  });
  expect(displayTexts.map(node => node.props.children)).toContain('2');
  expect({ context: pad().props.contextText, disabled: confirm.props.disabled }).toEqual({
    context: '颈后高位下拉 · 第 1 组 · RIR', disabled: false,
  });
  await act(async () => confirm.props.onPress!({} as never));
  expect(save).not.toHaveBeenCalled();
  expect(pad().props.contextText).toBe('颈后高位下拉 · 第 2 组 · 重量');
  await act(async () => pad().props.onCancel());
  await act(async () => button(t('student.accessory.complete', [1])).props.onPress!({} as never));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ setIndex: 0 }),
    expect.objectContaining({ weight_kg: '57', reps: 10, rpe: null, actual_rir: 2, completed: true }), 'single');
});
