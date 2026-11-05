import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useStudentTabsStore } from '@/features/student-tabs';
import { useSessionStore } from '@/api/session';

export function VideoUploadNotificationSession() {
  const studentId = useSessionStore(state => state.status === 'authenticated' &&
    (state.user?.role === 'coached_student' || state.user?.role === 'self_train_student') ? state.user.id : null);
  const router = useRouter();
  useEffect(() => {
    if (!studentId) return;
    void import('./failure-notifier').then(({ configureVideoUploadChannel }) => configureVideoUploadChannel()).catch(() => undefined);
    let disposed = false;
    const consumed = new Set<string>();
    const handle = async (response: Notifications.NotificationResponse | null) => {
      if (!response || disposed || useSessionStore.getState().user?.id !== studentId) return;
      const request = response.notification.request;
      if (request.identifier !== 'video-upload-failures' || consumed.has(request.identifier)) return;
      // Old notifications lack ownership: open training, but never retry another account's videos.
      if (request.content.data?.studentId && request.content.data?.studentId !== studentId) return;
      consumed.add(request.identifier);
      await Notifications.clearLastNotificationResponseAsync();
      if (disposed) return;
      router.navigate('/(student)/training');
      const dayId = request.content.data?.dayId;
      if (typeof dayId === 'string') useStudentTabsStore.setState({ videoNotificationDay: { studentId, dayId } });
      const { videoUploadManager } = await import('./manager');
      if (!disposed && useSessionStore.getState().user?.id === studentId) await videoUploadManager.retryAll(studentId);
      consumed.delete(request.identifier);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(response => { void handle(response).catch(() => undefined); });
    void Notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
    return () => { disposed = true; subscription.remove(); };
  }, [studentId, router]);
  return null;
}
