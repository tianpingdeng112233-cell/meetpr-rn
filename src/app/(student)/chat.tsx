import { useMineBindRequest } from '@/api/domains/bind';
import { chatRepository } from '@/api/domains/chat';
import { useSessionStore } from '@/api/session';
import { AppButton, Screen, font, useColors } from '@/design';
import { StudentConversationScreen } from '@/features/chat/StudentConversationScreen';
import { t } from '@/i18n';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

export default function StudentChatRoute() {
  const user = useSessionStore(state => state.user);
  const colors = useColors();
  const binding = useMineBindRequest();
  const request = binding.data?.bind_request;
  const coachId = request?.status === 'accepted' ? request.coach_id : null;
  const conversation = useQuery({ queryKey: ['coach-conversation', user?.id, coachId], queryFn: () => chatRepository.open(coachId!), enabled: Boolean(coachId && user?.role === 'coached_student'), staleTime: Infinity });
  if (user?.role === 'self_train_student') return <Redirect href="/(student)/training" />;
  if (conversation.data && coachId) return <StudentConversationScreen key={`${user?.id}:${conversation.data.conversation.id}`} conversationId={conversation.data.conversation.id} coachName={request?.coach_display_name?.trim() || conversation.data.conversation.other_party.display_name} />;
  const failed = binding.isError || conversation.isError;
  return <Screen edges={['top', 'left', 'right']}><View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
    {binding.isPending || (coachId && !failed) ? <ActivityIndicator color={colors.gold500} /> : <>
      <Text style={{ ...font.body(16), color: colors.textPrimary }}>{t(failed ? 'student.studentBlackGoldChatView.copy011' : 'student.studentNotificationComponents.copy002')}</Text>
      <AppButton label={t('student.studentBlackGoldChatView.copy013')} onPress={() => { void binding.refetch(); if (coachId) void conversation.refetch(); }} />
    </>}
  </View></Screen>;
}
