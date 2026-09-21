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

export function holdFeedback(step: number): { weight: 'light' | 'medium' | 'heavy'; intensity: number; pulseMs: number } {
  const index = Math.max(0, Math.min(6, Math.floor(step) - 1));
  return { weight: index < 2 ? 'light' : index < 5 ? 'medium' : 'heavy', intensity: [0.5, 0.5, 0.7, 0.775, 0.85, 1, 1][index], pulseMs: [8, 10, 16, 20, 24, 32, 38][index] };
}
