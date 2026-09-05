import { useLocalSearchParams } from 'expo-router';
import { ConversationScreen } from '@/features/chat/ConversationScreen';
export default function ConversationRoute() {
  const { conversationId, studentName, status, draft } = useLocalSearchParams<{ conversationId: string; studentName?: string; status?: string; draft?: string }>();
  return <ConversationScreen key={conversationId} conversationId={conversationId} studentName={studentName} status={status} initialDraft={draft} />;
}
