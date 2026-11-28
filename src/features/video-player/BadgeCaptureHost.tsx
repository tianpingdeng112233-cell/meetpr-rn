import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { findNodeHandle, View } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import type { BadgeBitmap } from '@/features/training/video-upload/trim-native';
import { VideoBadgeCard } from './VideoBadgeCard';
import type { VideoBadgeInfo } from './types';

export type CaptureVideoBadge = (info: VideoBadgeInfo, scale: number, signal: AbortSignal) => Promise<BadgeBitmap>;
const CaptureContext = createContext<CaptureVideoBadge>(async () => { throw new Error('Badge renderer unavailable'); });
export const useBadgeCapture = () => useContext(CaptureContext);

type Request = {
  id: number;
  info: VideoBadgeInfo;
  scale: number;
  draw: (tag: number | null) => void;
};

function CaptureView({ request }: { request: Request }) {
  const view = useRef<View>(null);
  return <View pointerEvents="none" importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', left: 0, top: 0, opacity: 0, width: 452 * request.scale }}>
    <View ref={view} collapsable={false} style={{ alignSelf: 'flex-start' }}
      onLayout={() => request.draw(findNodeHandle(view.current))}>
      <VideoBadgeCard info={request.info} form="export" scale={request.scale} />
    </View>
  </View>;
}

/** The root owns recording captures. A replay window can hand an accepted save back when dismissed. */
export function BadgeCaptureHost({ children, handoffOnDismiss = false }: { children: ReactNode; handoffOnDismiss?: boolean }) {
  const parentCapture = useBadgeCapture();
  const mounted = useRef(true);
  const [requests, setRequests] = useState<Request[]>([]);
  const sequence = useRef(0);
  const pending = useRef(new Set<() => void>());
  useLayoutEffect(() => {
    mounted.current = true;
    const cancellations = pending.current;
    return () => {
      mounted.current = false;
      for (const cancel of cancellations) cancel();
    };
  }, []);
  const capture = useCallback<CaptureVideoBadge>((info, scale, signal) => new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Badge capture interrupted')); return; }
    const id = ++sequence.current;
    let drawing = false;
    const finish = () => {
      if (!pending.current.delete(cancel)) return false;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      if (mounted.current) setRequests(current => current.filter(item => item.id !== id));
      return true;
    };
    const cancel = () => {
      if (!finish()) return;
      if (!mounted.current && handoffOnDismiss && !signal.aborted) resolve(parentCapture(info, scale, signal));
      else reject(new Error('Badge layout unavailable'));
    };
    const timer = setTimeout(cancel, 5000);
    signal.addEventListener('abort', cancel);
    pending.current.add(cancel);
    if (!mounted.current) { cancel(); return; }
    setRequests(current => [...current, { id, info, scale, draw(tag) {
      if (drawing || !pending.current.has(cancel)) return;
      drawing = true;
      if (tag == null) { cancel(); return; }
      void Promise.resolve().then(() => requireNativeModule<{ captureBadge(tag: number): Promise<BadgeBitmap> }>(
        'TrainingVideo').captureBadge(tag)).then(bitmap => {
        if (finish()) resolve(bitmap);
        else bitmap.release();
      }).catch(cancel);
    } }]);
  }), [handoffOnDismiss, parentCapture]);
  return <CaptureContext.Provider value={capture}>
    {children}
    {requests.map(request => <CaptureView key={request.id} request={request} />)}
  </CaptureContext.Provider>;
}
