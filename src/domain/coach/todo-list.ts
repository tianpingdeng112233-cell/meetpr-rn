import { t } from '@/i18n';
import { relativeText, waitingText } from './formatting';
import type { RosterRow } from './week-overview';
export type CoachVideo = { id: string; uploadedAt: Date };
export type CoachConversation = { id: string; displayName: string; unreadCount: number };
export type TodoApplication = { id: string; displayName: string; submittedAt: Date };
export type TodoItem = { id: string; kind: 'videos' | 'messages' | 'studentChat' | 'applications'; studentId?: string; title: string; subtitle: string; tag: string; color: 'gold500' | 'danger' };
/** W2-c connects both inbox and tab badge through this selector. */
export function selectMessagesBadge(videos: readonly CoachVideo[], conversations: readonly CoachConversation[]): number {
  return videos.length + conversations.reduce((total, item) => total + item.unreadCount, 0);
}
export function makeTodoItems({ videos, conversations, rows, applications, now }: {
  videos: readonly CoachVideo[]; conversations: readonly CoachConversation[]; rows: readonly RosterRow[]; applications: readonly TodoApplication[]; now: Date;
}): TodoItem[] {
  const items: TodoItem[] = [];
  if (videos.length) items.push({ id: 'videos', kind: 'videos', title: t('coach.today.pendingVideosTitle %lld', [videos.length]), subtitle: t('coach.today.earliestVideoSubtitle', [relativeText(new Date(Math.min(...videos.map(item => item.uploadedAt.getTime()))), now)]), tag: t('coach.today.awaitingFeedback'), color: 'gold500' });
  const unread = conversations.filter(item => item.unreadCount > 0);
  if (unread.length) items.push({ id: 'messages', kind: 'messages', title: t('coach.today.unreadMessagesTitle %lld', [selectMessagesBadge([], unread)]), subtitle: unread.map(item => item.displayName).join(' · '), tag: t('coach.today.unread'), color: 'danger' });
  rows.forEach(row => {
    const missed = Math.max(0, ...row.triageSignals.map(signal => signal.kind === 'notTrained' ? signal.daysMissed : 0));
    if (missed) items.push({ id: row.student.id, kind: 'studentChat', studentId: row.student.id, title: t('coach.today.notTrainedTitle %@ %lld', [row.student.displayName, missed]), subtitle: t('coach.today.askHowThingsAreGoing'), tag: t('coach.today.needsAttention'), color: 'danger' });
  });
  if (applications.length) items.push({ id: 'applications', kind: 'applications', title: applications.length === 1 ? t('coach.today.singleApplicationTitle', [applications[0].displayName]) : t('coach.today.multipleApplicationsTitle %lld', [applications.length]), subtitle: applications.length === 1 ? waitingText(applications[0].submittedAt, now) : t('coach.today.earliestApplicationSubtitle', [waitingText(new Date(Math.min(...applications.map(item => item.submittedAt.getTime()))), now)]), tag: t('coach.today.newApplication'), color: 'gold500' });
  return items;
}
