import { useEffect, useState } from 'react';
import storage from '@/demo/storage';
import { SerialTaskQueue } from './serial-task-queue';

const visits = new SerialTaskQueue();
type Visit = { opened: string; selected?: string; fillsSets?: boolean; continuedOn?: string };
type VisitChange = (key: string, visit: Visit) => void;
const listeners = new Set<VisitChange>();
const isoDay = /^\d{4}-\d\d-\d\d$/;

async function readVisit(key: string): Promise<Visit | null> {
  const raw = await storage.getItem(key);
  if (!raw) return null;
  if (isoDay.test(raw)) return { opened: raw };
  try {
    const value: Visit = JSON.parse(raw);
    return value && isoDay.test(value.opened) && isoDay.test(value.selected ?? '') ? value : null;
  } catch { return null; }
}

async function saveVisit(key: string, visit: Visit) {
  await storage.setItem(key, visit.selected ? JSON.stringify(visit) : visit.opened);
  listeners.forEach(listener => listener(key, visit));
}

export function visitKey(studentId: string, planId: string, dayId: string) {
  return `training.session-visit.v1.${studentId}.${planId}.${dayId}`;
}

export const storedResumeDate = (key: string) => visits.enqueue(async () => (await readVisit(key))?.selected);

/** Reserve the date *before* the outbox can persist a set. A crash between writes is ambiguous. */
export const pinResumeDate = (key: string, opened: string, selected: string, fillsSets: boolean) => visits.enqueue(async () => {
  const existing = await readVisit(key);
  if (existing?.selected && existing.selected !== selected) throw new Error('Completion date already selected');
  await saveVisit(key, { ...existing, opened, selected, fillsSets: Boolean(existing?.fillsSets || fillsSets) });
});

export const releaseResumeDate = (key: string, rejected = false) => visits.enqueue(async () => {
  const existing = await readVisit(key);
  if (!existing?.selected || (rejected && existing.fillsSets)) return;
  await saveVisit(key, { opened: existing.continuedOn ?? existing.opened });
});

/** A visit belongs to the displayed plan day, including a day opened manually. */
export function useSessionResume(key: string | null, today: string, defaultEntry: boolean) {
  const [result, setResult] = useState<{ identity: string; visit: Visit } | null>(null);
  const identity = key && `${key}:${today}:${defaultEntry}`;
  useEffect(() => {
    if (!key || !identity) return;
    let active = true;
    const changed: VisitChange = (changedKey, visit) => {
      if (active && key === changedKey) setResult({ identity, visit });
    };
    listeners.add(changed);
    void visits.enqueue(async () => {
      const visit = await readVisit(key);
      if (!active) return;
      if (visit?.selected || (defaultEntry && visit && visit.opened < today)) changed(key, visit);
      else await saveVisit(key, { opened: today });
    }).catch(() => changed(key, { opened: today }));
    return () => { active = false; listeners.delete(changed); };
  }, [key, today, defaultEntry, identity]);
  const visit = identity && result?.identity === identity ? result.visit : null;
  const previous = defaultEntry && visit && visit.opened < today && (!visit.continuedOn || visit.continuedOn < today) ? visit.opened : undefined;
  const resume = async (currentDay: string) => {
    if (!key) return;
    await visits.enqueue(async () => {
      const current = await readVisit(key);
      await saveVisit(key, current?.selected ? { ...current, continuedOn: currentDay } : { opened: currentDay });
    });
  };
  return { previous, selected: visit?.selected, fillsSets: visit?.fillsSets, ready: !identity || result?.identity === identity, resume };
}
