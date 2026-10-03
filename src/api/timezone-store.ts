import type AsyncStorage from '@react-native-async-storage/async-storage';

function storage(): typeof AsyncStorage {
  // Keep this lazy native import synchronous for Metro and Jest.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage').default;
}

const key = (userId: string) => `meetpr.timezone.${userId}`;

// Load the native store only when Global timezone reporting needs it. CN
// authentication has no dependency on this persistence channel.
export const timezoneStore = {
  async getLastReported(userId: string): Promise<string | null> {
    return storage().getItem(key(userId));
  },
  async setLastReported(userId: string, timezone: string): Promise<void> {
    await storage().setItem(key(userId), timezone);
  },
};

export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
