import { Stack } from 'expo-router';
import { useSessionStore } from '@/api/session';
import { CoachDataProvider } from '@/features/coach/CoachDataProvider';
import { CoachNowProvider } from '@/features/coach/CoachNowProvider';
export default function CoachLayout() {
  const userId = useSessionStore(state => state.user?.id);
  return <CoachNowProvider key={userId}><CoachDataProvider><Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="student/[studentId]" />
    <Stack.Screen name="application/[requestId]" />
  </Stack></CoachDataProvider></CoachNowProvider>;
}
