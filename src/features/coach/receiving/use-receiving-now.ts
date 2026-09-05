import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
// One clock snapshot for all W2-c rows, including mounted screens and badge consumers.
let now = new Date();
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!stop) {
    const update = () => { now = new Date(); for (const notify of listeners) notify(); };
    const timer = setInterval(update, 60_000);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    stop = () => { clearInterval(timer); appState.remove(); };
    update();
  }
  return () => { listeners.delete(listener); if (!listeners.size) { stop?.(); stop = null; } };
}
export function useReceivingNow() { return useSyncExternalStore(subscribe, () => now); }
