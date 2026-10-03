import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { planKeys } from '@/api/domains/plans';
import { useSessionStore } from '@/api/session';
import { startPlanNotifications } from './plan-notifications';

function currentStudent() {
  const { status, user, bootstrapped } = useSessionStore.getState();
  return bootstrapped && status === 'authenticated' && (user?.role === 'coached_student' || user?.role === 'self_train_student') ? user.id : null;
}
export function PlanNotificationSession() {
  const user = useSessionStore(state => state.user);
  const status = useSessionStore(state => state.status);
  const bootstrapped = useSessionStore(state => state.bootstrapped);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    const studentId = currentStudent();
    if (!studentId) return;
    return startPlanNotifications({
      studentId, currentStudent,
      refresh: planId => {
        // Inactive tabs become stale too; their first focus must load the new recommendation.
        void queryClient.invalidateQueries({ queryKey: planKeys.list(studentId) }).catch(() => undefined);
        void queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) }).catch(() => undefined);
      },
      openTraining: () => router.navigate('/(student)/training'),
      transport: {
        onReceive: listener => { const subscription = Notifications.addNotificationReceivedListener(notification => listener(notification.request.content.data)); return () => subscription.remove(); },
        onResponse: listener => { const subscription = Notifications.addNotificationResponseReceivedListener(response => listener(response.notification.request.identifier, response.notification.request.content.data)); return () => subscription.remove(); },
        lastResponse: async () => { const response = await Notifications.getLastNotificationResponseAsync(); return response ? { id: response.notification.request.identifier, data: response.notification.request.content.data } : null; },
        clearResponse: () => Notifications.clearLastNotificationResponseAsync(),
      },
    });
  }, [user?.id, user?.role, status, bootstrapped, queryClient, router]);
  return null;
}
