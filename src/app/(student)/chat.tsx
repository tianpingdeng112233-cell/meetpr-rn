import { useLocalSearchParams } from 'expo-router';
import { StudentConversationScreen } from '@/features/chat/StudentConversationScreen';

export default function StudentChatRoute() {
  const { conversationId, coachName } = useLocalSearchParams<{ conversationId: string; coachName: string }>();
  return <StudentConversationScreen key={conversationId} conversationId={conversationId} coachName={coachName ?? ''} />;
}
