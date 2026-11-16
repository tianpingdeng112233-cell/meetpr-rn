import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import AsyncStorage from '@/demo/storage';
import type { PlanHandoff } from '@/api/domains/plans';
import { SerialTaskQueue } from './serial-task-queue';

const schema = z.object({ last: z.string().nullable(), pending: z.string().nullable(), dismissed: z.array(z.string()) });
const writes = new SerialTaskQueue();
const keyFor = (studentId: string) => `training.handoff-notice.v1.${studentId}`;
async function read(studentId: string) {
  const raw = await AsyncStorage.getItem(keyFor(studentId));
  try { return schema.parse(raw ? JSON.parse(raw) : { last: null, pending: null, dismissed: [] }); }
  catch { return { last: null, pending: null, dismissed: [] as string[] }; }
}

/** Observes only the displayed training cycle; previewing never consumes a notice. */
export function useHandoffNotice(studentId: string, planId: string | null, handoff?: PlanHandoff, previousCachedId?: string) {
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const identity = `${studentId}:${planId}`;
  useEffect(() => {
    if (!studentId || !planId || !handoff) return;
    let active = true;
    void writes.enqueue(async () => {
      const state = await read(studentId);
      const previous = handoff.plans.find(plan => plan.id === (state.last ?? previousCachedId));
      if (previous && previous.id !== planId && previous.total_training_days > 0 && previous.completed_training_days === previous.total_training_days && !state.dismissed.includes(planId)) state.pending = planId;
      state.last = planId;
      await AsyncStorage.setItem(keyFor(studentId), JSON.stringify(state));
      if (active) setVisibleKey(state.pending === planId && !state.dismissed.includes(planId) ? identity : null);
    }).catch(() => {});
    return () => { active = false; };
  }, [studentId, planId, handoff, identity, previousCachedId]);
  const dismiss = useCallback(() => {
    setVisibleKey(null);
    if (!planId) return Promise.resolve();
    return writes.enqueue(async () => {
      const state = await read(studentId);
      if (!state.dismissed.includes(planId)) state.dismissed.push(planId);
      if (state.pending === planId) state.pending = null;
      await AsyncStorage.setItem(keyFor(studentId), JSON.stringify(state));
    });
  }, [studentId, planId]);
  return { visible: visibleKey === identity, dismiss };
}
