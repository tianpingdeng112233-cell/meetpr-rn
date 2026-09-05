import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSessionStore } from '@/api/session';
import { StudentDetailScreen } from '@/features/coach/student-detail/StudentDetailScreen';

/** Route owns the clock until the W2-a coach shell provides its shared clock. */
export default function StudentDetailRoute() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const coachName = useSessionStore((state) => state.user?.name?.trim() || undefined);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, 60_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') tick(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, []);
  useEffect(() => {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeout = setTimeout(() => setNow(new Date()), Math.max(1, midnight.getTime() - now.getTime()));
    return () => clearTimeout(timeout);
  }, [now]);
  return <StudentDetailScreen key={studentId} studentId={studentId} now={now} coachName={coachName} onBack={() => router.canGoBack() ? router.back() : router.replace('/(coach)/(tabs)/students')} />;
}
