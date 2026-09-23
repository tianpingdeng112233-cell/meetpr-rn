import { getLocale, t } from '@/i18n';
export type InboxConversation = { id: string; otherPartyID: string; otherPartyName: string; unreadCount: number; lastMessageAt: string | null; lastMessagePreview: string | null; lastMessagePreviewKind?: 'text' | 'image' | 'training_plan' | 'training_share' | null };
function conversationPreview(conversation: InboxConversation | undefined): string {
  if (conversation?.lastMessagePreviewKind === 'training_plan') return t('chat.setReference.plannedTag');
  if (conversation?.lastMessagePreviewKind === 'training_share') return t('chat.setReference.loggedTag');
  if (conversation?.lastMessagePreviewKind === 'image') return t('chat.image');
  return conversation?.lastMessagePreview ?? t('coach.inbox.noMessages');
}
export type VideoGroup = { studentID: string; studentName: string; count: number; latestUploadedAt: string };
const instant = (value: string | null) => value ? new Date(value).getTime() : -Infinity;
function latestConversations(conversations: readonly InboxConversation[]) {
  const result = new Map<string, InboxConversation>();
  for (const item of conversations) {
    const old = result.get(item.otherPartyID);
    if (!old || instant(item.lastMessageAt) > instant(old.lastMessageAt) || (instant(item.lastMessageAt) === instant(old.lastMessageAt) && item.id > old.id)) result.set(item.otherPartyID, item);
  }
  return result;
}
export function inboxCount(conversations: readonly InboxConversation[], pendingVideoCount: number): number {
  return [...latestConversations(conversations).values()].reduce((count, item) => count + item.unreadCount, pendingVideoCount);
}
export function relativeText(value: string, now: Date): string {
  const seconds = Math.max(0, (now.getTime() - instant(value)) / 1000);
  if (seconds < 3600) return t('coach.shared.relative.minutesAgo %lld', [Math.max(1, Math.floor(seconds / 60))]);
  if (seconds < 86400) return t('coach.shared.relative.hoursAgo %lld', [Math.floor(seconds / 3600)]);
  return t('coach.shared.relative.daysAgo %lld', [Math.floor(seconds / 86400)]);
}
export function inboxRows({ conversations, videoGroups, now }: { conversations: readonly InboxConversation[]; videoGroups: readonly VideoGroup[]; now: Date }) {
  const chats = latestConversations(conversations);
  const videos = new Map(videoGroups.map(group => [group.studentID, group]));
  return [...new Set([...chats.keys(), ...videos.keys()])].map(studentID => {
    const conversation = chats.get(studentID);
    const videoGroup = videos.get(studentID);
    const unreadCount = conversation?.unreadCount ?? 0;
    const pendingVideoCount = videoGroup?.count ?? 0;
    return {
      studentID, conversation, videoGroup, unreadCount, pendingVideoCount,
      studentName: conversation?.otherPartyName.trim() || videoGroup?.studentName || '',
      latestActivityAt: Math.max(instant(conversation?.lastMessageAt ?? null), instant(videoGroup?.latestUploadedAt ?? null)),
      priority: (pendingVideoCount > 0 ? 2 : 0) + (unreadCount > 0 ? 1 : 0),
      lastPreview: videoGroup ? t('coach.inbox.pendingVideoPreview %lld %@', [videoGroup.count, relativeText(videoGroup.latestUploadedAt, now)]) : conversationPreview(conversation),
    };
  }).sort((a, b) => b.priority - a.priority || (a.latestActivityAt === b.latestActivityAt ? 0 : b.latestActivityAt - a.latestActivityAt) || a.studentName.localeCompare(b.studentName, getLocale(), { numeric: true, sensitivity: 'base' }) || a.studentID.localeCompare(b.studentID));
}
export function receivingContentState(status: 'idle' | 'loading' | 'loaded' | 'failed', rowCount: number, chatFailed = false): 'loading' | 'failed' | 'empty' | 'content' {
  if (status === 'idle' || status === 'loading') return 'loading';
  if (!rowCount && (status === 'failed' || chatFailed)) return 'failed';
  return rowCount ? 'content' : 'empty';
}
