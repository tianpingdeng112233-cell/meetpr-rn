export const setPlaybackRates = [2, 1.5, 1, 0.5] as const;
export type SetPlaybackState = { paused: boolean; position: number; duration: number; rate: number; expanded: boolean; restoring: boolean };
export const initialSetPlayback: SetPlaybackState = { paused: true, position: 0, duration: 0, rate: 1, expanded: false, restoring: false };
export type SetPlaybackAction =
  | { type: 'toggle' | 'expand' | 'back' | 'ended' | 'pause' | 'reload' }
  | { type: 'seek' | 'seeked' | 'progress'; position: number }
  | { type: 'loaded'; duration: number }
  | { type: 'rate'; rate: number };
export function setPlaybackReducer(state: SetPlaybackState, action: SetPlaybackAction): SetPlaybackState {
  switch (action.type) {
    case 'toggle': return { ...state, paused: !state.paused, position: state.position >= state.duration ? 0 : state.position };
    case 'reload': return { ...state, restoring: true };
    case 'pause': return { ...state, paused: true };
    case 'seek': {
      const position = Math.max(0, Math.min(state.duration, Number.isFinite(action.position) ? action.position : state.position));
      return { ...state, position, restoring: state.restoring || position !== state.position };
    }
    case 'seeked': return Math.abs(action.position - state.position) < 0.5 ? { ...state, restoring: false } : state;
    case 'progress': return state.restoring ? state : { ...state, position: Math.max(0, Math.min(state.duration, Number.isFinite(action.position) ? action.position : state.position)) };
    case 'loaded': {
      const duration = Number.isFinite(action.duration) ? Math.max(0, action.duration) : 0;
      const position = Math.min(state.position, duration);
      return { ...state, duration, position, restoring: position > 0 };
    }
    case 'rate': return setPlaybackRates.some(rate => rate === action.rate) ? { ...state, rate: action.rate } : state;
    case 'expand': return { ...state, expanded: true };
    case 'back': return state.expanded ? { ...state, expanded: false } : state;
    case 'ended': return { ...state, paused: true, position: state.duration };
  }
}
