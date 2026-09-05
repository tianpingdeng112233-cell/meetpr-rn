import { t } from '@/i18n';
import type { ChatMessage } from '@/api/domains/chat';
import type { FeedbackItem } from '@/api/domains/feedback';
import type { DashboardPlanSignature } from '@/features/dashboard/plan-seen';

export type StudentPlanNotice = { signature: DashboardPlanSignature; weekIndex: number };
export type StudentTimelineItem = { id: string; occurredAt: string } & (
  | { kind: 'message'; message: ChatMessage }
  | { kind: 'plan'; notice: StudentPlanNotice }
  | { kind: 'feedback'; feedback: FeedbackItem }
);

export function mergeStudentTimeline(messages: readonly ChatMessage[], planNotice: StudentPlanNotice | null, feedback: readonly FeedbackItem[]): StudentTimelineItem[] {
  const items: StudentTimelineItem[] = [
    ...messages.map(message => ({ kind: 'message' as const, id: `message-${message.id}`, occurredAt: message.created_at, message })),
    ...feedback.map(item => ({ kind: 'feedback' as const, id: `feedback-${item.id}`, occurredAt: item.posted_at, feedback: item })),
  ];
  if (planNotice) items.push({ kind: 'plan', id: `plan-${planNotice.signature.planId}.${planNotice.signature.publishedAt}`, occurredAt: planNotice.signature.publishedAt, notice: planNotice });
  return items.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export type VerticalFrame = { y: number; height: number };
export function visibleFraction(card: VerticalFrame, viewport: VerticalFrame): number {
  if (card.height <= 0) return 0;
  return Math.min(1, Math.max(0, Math.min(card.y + card.height, viewport.y + viewport.height) - Math.max(card.y, viewport.y)) / card.height);
}

export function videoLabel(video: { exercise_name: string | null; set_index: number | null } | null | undefined): string {
  if (!video) return t('student.studentChatTimeline.copy001');
  return [t('student.studentChatTimeline.copy002', [video.exercise_name?.trim() || t('student.studentChatTimeline.copy001')]),
    video.set_index == null ? null : t('student.studentChatTimeline.copy003', [video.set_index + 1])].filter(Boolean).join(' · ');
}
export function videoDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—:—';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function totalUnreadCount({ hasPlanNotice, feedbackUnread, chatUnread }: { hasPlanNotice: boolean; feedbackUnread: number; chatUnread: number }): number {
  return (hasPlanNotice ? 1 : 0) + feedbackUnread + chatUnread;
}
