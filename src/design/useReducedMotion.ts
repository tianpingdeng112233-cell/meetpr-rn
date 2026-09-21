import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// One native subscription for all buttons; use the accessible fallback until it resolves.
let reduced = true;
let version = 0;
const listeners = new Set<() => void>();
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | undefined;
function update(value: boolean) {
  reduced = value;
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const current = ++version;
    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { version++; update(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (version === current) update(value); }).catch(() => undefined);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { subscription?.remove(); subscription = undefined; version++; reduced = true; }
  };
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => reduced, () => true);
}
