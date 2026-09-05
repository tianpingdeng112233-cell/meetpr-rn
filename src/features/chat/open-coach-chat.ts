import { Alert, AppState } from 'react-native';
import { ApiError } from '@/api/client';
import { bindKeys, useMineBindRequest } from '@/api/domains/bind';
import { chatRepository } from '@/api/domains/chat';
import { useFeedbackInboxViewModel } from '@/features/dashboard/feedback-inbox';
import { t } from '@/i18n';
import { CHAT_POLL_MS } from './conversation-model';
import { totalUnreadCount } from './student-timeline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlan, usePlans } from '@/api/domains/plans';
import { currentWeekDays } from '@/domain/plan/sequence';
import { selectDashboardPlan, selectLatestPublishedPlan } from '@/features/dashboard/model';
import { dashboardPlanSignature, dashboardPlanSignatureKey, hasSeenDashboardPlan } from '@/features/dashboard/plan-seen';
import type { StudentPlanNotice } from './student-timeline';

export const studentChatKeys = {
  conversations: (studentId: string) => ['student-chat', studentId, 'conversations'] as const,
  planSeen: (studentId: string, signature: string | null) => ['student-chat', studentId, 'plan-seen', signature] as const,
};

/** Shares Dashboard's publication selector and persistent signature, without its charts/history queries. */
export function useStudentPlanNotice(studentId: string) {
  const plans = usePlans(studentId);
  const latest = selectLatestPublishedPlan(plans.data?.plans ?? []);
  const active = selectDashboardPlan(plans.data?.plans ?? []);
  const detail = usePlan(active?.id ?? '');
  const signature = latest ? dashboardPlanSignature(latest) : null;
  const queryKey = studentChatKeys.planSeen(studentId, signature ? dashboardPlanSignatureKey(signature) : null);
  const seen = useQuery({ queryKey, queryFn: () => hasSeenDashboardPlan(studentId, signature!), enabled: Boolean(studentId && signature) });
  const refetchSeen = seen.refetch;
  const signatureKey = signature ? dashboardPlanSignatureKey(signature) : null;
  useFocusEffect(useCallback(() => { if (studentId && signatureKey) void refetchSeen(); }, [studentId, signatureKey, refetchSeen]));
  const planNotice: StudentPlanNotice | null = signature && (seen.data === false || seen.isError)
    ? { signature, weekIndex: currentWeekDays(detail.data?.days ?? [])[0]?.week_number ?? 1 } : null;
  return { planNotice, queryKey, isLoading: plans.isPending || (Boolean(signature) && seen.isPending) };
}

/** Shared student inbox cache: only the currently bound coach contributes chat unread. */
export function useOpenCoachChat(studentId: string) {
  const router = useRouter();
  const client = useQueryClient();
  const binding = useMineBindRequest();
  const bound = binding.data?.bind_request;
  const coachId = bound?.status === 'accepted' ? bound.coach_id : null;
  const feedback = useFeedbackInboxViewModel(studentId);
  const plan = useStudentPlanNotice(studentId);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const conversations = useQuery({
    queryKey: studentChatKeys.conversations(studentId), queryFn: chatRepository.list,
    enabled: Boolean(studentId && coachId && foreground), staleTime: CHAT_POLL_MS, refetchInterval: CHAT_POLL_MS,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state === 'active') {
        void client.invalidateQueries({ queryKey: studentChatKeys.conversations(studentId) });
        void client.invalidateQueries({ queryKey: ['student-chat', studentId, 'plan-seen'] });
      }
    });
    return () => subscription.remove();
  }, [client, studentId]);
  const coachConversation = conversations.data?.conversations.find(item => item.other_party.id === coachId);
  const opening = useRef(false);
  const [isOpening, setIsOpening] = useState(false);
  async function openCoachChat() {
    if (opening.current) return;
    opening.current = true;
    setIsOpening(true);
    const failure = (kind: 'noCoach' | 'binding' | 'network') => Alert.alert(
      t(kind === 'noCoach' ? 'student.studentNotificationComponents.copy001' : kind === 'binding' ? 'student.studentNotificationComponents.copy003' : 'student.studentNotificationComponents.copy005'),
      t(kind === 'noCoach' ? 'student.studentNotificationComponents.copy002' : kind === 'binding' ? 'student.studentNotificationComponents.copy004' : 'student.studentNotificationComponents.copy006'),
      [{ text: t('student.studentNotificationComponents.copy007') }],
    );
    try {
      // A cold/failed binding query is not evidence that no coach exists.
      let current = bound;
      if (binding.isPending || binding.isError) {
        const result = await binding.refetch();
        if (result.isError) { failure('network'); return; }
        current = result.data?.bind_request;
      }
      if (!current || current.status !== 'accepted') { failure('noCoach'); return; }
      const { conversation } = await chatRepository.open(current.coach_id);
      const queryKey = studentChatKeys.conversations(studentId);
      await client.cancelQueries({ queryKey });
      client.setQueryData<Awaited<ReturnType<typeof chatRepository.list>>>(queryKey, previous => ({ conversations: [...(previous?.conversations ?? []).filter(item => item.id !== conversation.id), conversation] }));
      router.navigate({ pathname: '/(student)/chat', params: { conversationId: conversation.id, coachName: current.coach_display_name ?? conversation.other_party.display_name } });
    } catch (error) {
      if (error instanceof ApiError && String(error.code ?? error.envelope?.error) === 'CHAT_BIND_REQUIRED') {
        void client.invalidateQueries({ queryKey: bindKeys.mine });
        failure('binding');
      } else failure('network');
    } finally { opening.current = false; setIsOpening(false); }
  }
  return { openCoachChat, isOpening, totalUnread: totalUnreadCount({ hasPlanNotice: plan.planNotice !== null, feedbackUnread: feedback.unreadCount, chatUnread: coachConversation?.unread_count ?? 0 }) };
}
