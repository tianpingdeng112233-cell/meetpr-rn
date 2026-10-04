import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/api/session';
import { listenForRestNotificationOpen } from './rest-timer-notification';

/** Same authenticated training destination as PlanNotificationSession; no Expo notification interception. */
export function RestTimerNotificationSession() {
  const router = useRouter();
  const bootstrapped = useSessionStore(state => state.bootstrapped);
  const status = useSessionStore(state => state.status);
  const role = useSessionStore(state => state.user?.role);
  useEffect(() => {
    if (!bootstrapped || status !== 'authenticated' || (role !== 'coached_student' && role !== 'self_train_student')) return;
    return listenForRestNotificationOpen(() => router.navigate('/(student)/training'));
  }, [bootstrapped, status, role, router]);
  return null;
}
