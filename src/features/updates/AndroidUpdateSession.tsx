import { useEffect, useRef } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import { t } from '@/i18n';
import { BUILD_TRACK } from '@/config/build-track';
import { androidReleaseNotes, checkForAndroidUpdate, type AndroidRelease } from './android-update';

function offerUpdate(release: AndroidRelease) {
  const download = () => {
    void Linking.openURL(release.downloadUrl).catch(() => {
      Alert.alert(t('androidUpdate.openFailed'), t('androidUpdate.retryHint'), [
        { text: t('androidUpdate.cancel'), style: 'cancel' },
        { text: t('androidUpdate.retry'), onPress: download },
      ]);
    });
  };
  Alert.alert(t('androidUpdate.title', [release.versionName]),
    [androidReleaseNotes(release), t('androidUpdate.installHint')].filter(Boolean).join('\n\n'), [
      { text: t('androidUpdate.later'), style: 'cancel' },
      { text: t('androidUpdate.download'), onPress: download },
    ], { cancelable: true });
}

/** Mounted once in the app shell, after privacy confirmation and bootstrap. */
export function AndroidUpdateSession({ enabled }: { enabled: boolean }) {
  const lastCheckedAt = useRef<number | null>(null);
  const highestOfferedBuild = useRef(0);
  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    const controller = new AbortController();
    let currentState = AppState.currentState;
    let pending: AndroidRelease | null = null;
    let checking = false;
    const offerWhenActive = () => {
      if (controller.signal.aborted || !pending || currentState !== 'active') return;
      const release = pending;
      pending = null;
      if (release.versionCode <= highestOfferedBuild.current) return;
      highestOfferedBuild.current = release.versionCode;
      offerUpdate(release);
    };
    const check = async () => {
      const startedAt = Date.now();
      if (checking || controller.signal.aborted ||
          (lastCheckedAt.current !== null && startedAt - lastCheckedAt.current <= 6 * 60 * 60 * 1000)) return;
      checking = true;
      try {
        const release = await checkForAndroidUpdate({
          platform: Platform.OS,
          track: BUILD_TRACK,
          applicationId: Application.applicationId,
          buildVersion: Application.nativeBuildVersion,
        }, controller.signal);
        if (controller.signal.aborted || release === undefined) return;
        lastCheckedAt.current = startedAt;
        pending = release;
        offerWhenActive();
      } catch {
        // A failed check stays eligible for retry on the next foreground.
      } finally {
        checking = false;
      }
    };
    const subscription = AppState.addEventListener('change', state => {
      const resumed = currentState !== 'active' && state === 'active';
      currentState = state;
      offerWhenActive();
      if (resumed) void check();
    });
    void check();
    return () => {
      controller.abort();
      subscription.remove();
    };
  }, [enabled]);
  return null;
}
