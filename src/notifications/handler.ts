/** One foreground policy, shared by every local notification producer. */
export function configureNotificationHandler(): void {
  // Keep native loading lazy for model-only consumers.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const notifications: typeof import('expo-notifications') = require('expo-notifications');
  notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const training = notification.request.content.data?.category === 'training-reminder'
        || notification.request.identifier.startsWith('training-reminder-');
      return {
        shouldShowBanner: training,
        shouldShowList: true,
        shouldPlaySound: training,
        shouldSetBadge: false,
      };
    },
  });
}
