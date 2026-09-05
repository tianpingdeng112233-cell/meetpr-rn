import { t } from '@/i18n';
import { addDays, sameDay, startOfDay } from './calendar';
export type TriageSignal = { kind: 'notTrained'; daysMissed: number } | { kind: 'awaitingReply' };
export type CoachPlan = { days: { date: Date; exercises: readonly unknown[] }[] };
export type CoachLog = { completed: boolean; logged_at: string };
export type CoachFeedback = { posted_at: string };
export function triageSignals({ plan, logs, feedback, now }: {
  plan: CoachPlan | null; logs: readonly CoachLog[]; feedback: readonly CoachFeedback[]; now: Date;
}): TriageSignal[] {
  const today = startOfDay(now);
  const start = addDays(today, -7);
  const missed = plan?.days.filter(day => day.exercises.length && day.date >= start && day.date < today && !logs.some(log => log.completed && sameDay(new Date(log.logged_at), day.date))).length ?? 0;
  const result: TriageSignal[] = missed >= 2 ? [{ kind: 'notTrained', daysMissed: missed }] : [];
  const latestLog = Math.max(-Infinity, ...logs.filter(log => log.completed).map(log => new Date(log.logged_at).getTime()));
  const latestFeedback = Math.max(-Infinity, ...feedback.map(item => new Date(item.posted_at).getTime()));
  if (latestLog >= addDays(now, -3).getTime() && latestLog <= now.getTime() && latestFeedback < latestLog) result.push({ kind: 'awaitingReply' });
  return result;
}
export function triageSummaryText(signals: readonly TriageSignal[]): string {
  const missed = Math.max(0, ...signals.map(signal => signal.kind === 'notTrained' ? signal.daysMissed : 0));
  const reply = signals.some(signal => signal.kind === 'awaitingReply');
  return missed ? t(reply ? 'coach.roster.triage.missedAwaitingReply %lld' : 'coach.roster.triage.missed %lld', [missed]) : reply ? t('coach.roster.triage.newRecord') : '';
}
