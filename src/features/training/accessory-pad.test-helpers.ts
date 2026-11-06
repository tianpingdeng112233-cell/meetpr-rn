import { act, type ReactTestRenderer } from 'react-test-renderer';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { NumberPad } from '@/design/NumberPad';
import { t } from '@/i18n';

export const numericCell = (renderer: ReactTestRenderer, label: string) => renderer.root.findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === label)!;

/** Use the actual keypad so save regressions cover entry through the new UI. */
export async function enterNumber(renderer: ReactTestRenderer, label: string, value: string) {
  await act(async () => numericCell(renderer, label).props.onPress!({} as never));
  const pad = () => renderer.root.findByType(NumberPad);
  const key = (label: string) => pad().findAllByType(FeedbackPressable).find(node => node.props.accessibilityLabel === label)!;
  if (value === '') {
    for (const _ of pad().props.initialValue) { // eslint-disable-line @typescript-eslint/no-unused-vars
      await act(async () => key(t('designSystem.numberPad.backspace')).props.onPress!({} as never));
    }
  } else {
    for (const ch of value.replace(',', '.')) await act(async () => key(ch === '.' ? t('designSystem.numberPad.decimalPoint') : ch).props.onPress!({} as never));
  }
  const confirm = pad().findAllByType(FeedbackPressable).at(-1)!;
  await act(async () => confirm.props.onPress!({} as never));
  if (renderer.root.findAllByType(NumberPad).length) await act(async () => pad().props.onCancel());
}
