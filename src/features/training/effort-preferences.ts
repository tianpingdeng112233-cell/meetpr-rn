import { useEffect, useState } from 'react';
import AsyncStorage from '@/demo/storage';
import type { EffortKind } from './actual-effort';
import type { SetLog } from '@/api/domains/sets';

const key = (studentId: string, exerciseId: string) => `meetpr.effort.${studentId}.${exerciseId}`;
export async function readEffortChoices(studentId: string, exerciseIds: readonly string[]): Promise<Record<string, EffortKind>> {
  const entries = await Promise.all(exerciseIds.map(async id => [id, await AsyncStorage.getItem(key(studentId, id))] as const));
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, EffortKind] => entry[1] === 'rpe' || entry[1] === 'rir'));
}
export async function writeEffortChoice(studentId: string, exerciseId: string, kind: EffortKind) {
  await AsyncStorage.setItem(key(studentId, exerciseId), kind);
}

export function useEffortChoices(studentId: string, exerciseIds: readonly string[]) {
  const [state, setState] = useState<{ studentId: string; choices: Record<string, EffortKind> }>({ studentId, choices: {} });
  const idsKey = JSON.stringify([...new Set(exerciseIds)].sort());
  useEffect(() => {
    let active = true;
    void readEffortChoices(studentId, JSON.parse(idsKey)).then(choices => {
      if (active) setState(current => ({ studentId, choices: { ...choices, ...(current.studentId === studentId ? current.choices : {}) } }));
    }).catch(() => {});
    return () => { active = false; };
  }, [studentId, idsKey]);
  const remember = (exerciseId: string, kind: EffortKind) => {
    setState(current => ({ studentId, choices: { ...(current.studentId === studentId ? current.choices : {}), [exerciseId]: kind } }));
    void writeEffortChoice(studentId, exerciseId, kind).catch(() => {});
  };
  return { choices: state.studentId === studentId ? state.choices : {}, remember };
}

/** Existing logs supply a fallback for users upgrading before local choices were remembered. */
export function historicalEffortChoices(logs: readonly SetLog[], studentId: string, beforeDate: string): Record<string, EffortKind> {
  const result: Record<string, EffortKind> = {};
  const ordered = logs.filter(log => log.student_id === studentId && !log.assumed &&
    (log.logged_date ?? log.logged_at.slice(0, 10)) < beforeDate && (log.actual_rir != null || log.rpe != null))
    .sort((a, b) => Date.parse(a.logged_at) - Date.parse(b.logged_at));
  for (const log of ordered) if (log.exercise_id) result[log.exercise_id] = log.actual_rir != null ? 'rir' : 'rpe';
  return result;
}
