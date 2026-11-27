import { useEffect, useState, useSyncExternalStore } from 'react';

import { useSessionStore } from '@/api/session';

// The coached-student bind gate opens with a full-screen spinner. The splash
// waits for it instead of revealing that spinner (spec 099).
type GateState = 'unseen' | 'loading' | 'settled';

let gateState: GateState = 'unseen';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function setGateState(next: GateState) {
  if (gateState === next) return;
  gateState = next;
  listeners.forEach(listener => listener());
}

/** Called by BindGate with whether it is still on its loading screen. */
export function useReportBindGateLaunchState(loading: boolean) {
  useEffect(() => { setGateState(loading ? 'loading' : 'settled'); }, [loading]);
}

export function resetLaunchReadyForTests() {
  setGateState('unseen');
}

// A coached student normally mounts the bind gate right after restore. If it
// never shows up (a route outside the student tabs), stop waiting for it.
const GATE_MOUNT_GRACE_MS = 3000;

/** True once the first screen behind the splash is usable. */
export function useLaunchReady() {
  const bootstrapped = useSessionStore(state => state.bootstrapped);
  const status = useSessionStore(state => state.status);
  const role = useSessionStore(state => state.user?.role);
  const gate = useSyncExternalStore(subscribe, () => gateState, () => gateState);
  const [gateOverdue, setGateOverdue] = useState(false);

  const settled = bootstrapped && status !== 'authenticating';
  const needsGate = settled && status === 'authenticated' && role === 'coached_student';
  const awaitingMount = needsGate && gate === 'unseen';

  useEffect(() => {
    if (!awaitingMount) return;
    const id = setTimeout(() => setGateOverdue(true), GATE_MOUNT_GRACE_MS);
    return () => clearTimeout(id);
  }, [awaitingMount]);

  if (!settled) return false;
  if (!needsGate) return true;
  return gate === 'settled' || (gate === 'unseen' && gateOverdue);
}
