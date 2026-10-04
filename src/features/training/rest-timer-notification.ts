import { requireOptionalNativeModule } from 'expo-modules-core';
import { t } from '@/i18n';
import type { RestTimerNativeState, RestTimerNotifications } from './rest-timer-session';

type NativeRestTimer = {
  show(endAtEpochMs: number, labels: Record<string, string>): void;
  hide(): void;
  consumeState(): RestTimerNativeState;
  isPermissionGranted(): boolean;
  consumeOpenRequest(): boolean;
  addListener(event: 'onOpenTraining', listener: () => void): { remove(): void };
};
function nativeModule() {
  return requireOptionalNativeModule<NativeRestTimer>('RestTimerNotification');
}

export function restNotificationPermission(): boolean {
  return nativeModule()?.isPermissionGranted() ?? false;
}
export const restTimerNotifications: RestTimerNotifications = {
  show: endAtEpochMs => nativeModule()?.show(endAtEpochMs, {
    title: t('training.restNotification.title'),
    completeTitle: t('student.restTimerOverlay.copy003'),
    completeBody: t('training.restNotification.completeBody'),
    skip: t('student.restTimerOverlay.copy001'),
    add: t('training.restNotification.add'),
    timerChannel: t('training.restNotification.timerChannel'),
    completeChannel: t('training.restNotification.completeChannel'),
  }),
  hide: () => nativeModule()?.hide(),
  consumeState: () => nativeModule()?.consumeState() ?? { endAtEpochMs: null, skipped: false },
};

export function listenForRestNotificationOpen(openTraining: () => void): () => void {
  const module = nativeModule();
  if (!module) return () => undefined;
  const open = () => { if (module.consumeOpenRequest()) openTraining(); };
  const subscription = module.addListener('onOpenTraining', open);
  open();
  return () => subscription.remove();
}
