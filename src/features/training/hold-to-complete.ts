export const HOLD_DURATION_MS = 1_100;
export const HOLD_CANCEL_MS = 300;
export type HoldState =
  | 'idle'
  | 'holding'
  | 'cancelledUntilEnded'
  | 'completedUntilEnded';
export function holdTransition(
  state: HoldState,
  event: 'begin' | 'cancel' | 'complete' | 'reset',
): HoldState {
  if (event === 'reset') return 'idle';
  if (state === 'idle' && event === 'begin') return 'holding';
  if (state === 'holding' && event === 'cancel') return 'cancelledUntilEnded';
  if (state === 'holding' && event === 'complete') return 'completedUntilEnded';
  return state;
}
export function completionAvailability({
  editable,
  recording,
  realCount,
  remainingSets,
}: {
  editable: boolean;
  recording: boolean;
  realCount: number;
  remainingSets: number;
}) {
  const button = editable && recording && realCount > 0;
  return { button, pill: button && remainingSets > 0 };
}
