import { Alert } from 'react-native';
import { router } from 'expo-router';
import { chatRepository } from '@/api/domains/chat';
import { t } from '@/i18n';

/**
 * Coach entry points into chat (inbox row, StudentDetail header, reminder capsules) share this:
 * open-or-create the conversation with the student, then push the conversation route.
 * `draft` pre-fills the composer (iOS `coach.detail.trainingReminderDraft` / `readinessReminderDraft`).
 */
export async function openStudentConversation(input: { studentId: string; studentName?: string; draft?: string; status?: string }): Promise<boolean> {
  try {
    const { conversation } = await chatRepository.open(input.studentId);
    router.push({ pathname: '/(coach)/conversation/[conversationId]', params: { conversationId: conversation.id, studentName: input.studentName ?? '', ...(input.status ? { status: input.status } : {}), ...(input.draft ? { draft: input.draft } : {}) } });
    return true;
  } catch {
    Alert.alert(t('coach.chat.unableToOpenConversation'), undefined, [{ text: t('coach.chat.ok') }]);
    return false;
  }
}
