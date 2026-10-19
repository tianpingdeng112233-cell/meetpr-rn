import { useEffect, useRef } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import { t } from '@/i18n';
import { BUILD_TRACK } from '@/config/build-track';
import { checkForAndroidUpdate, type AndroidRelease } from './android-update';

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
    `${release.releaseNotes}\n\n${t('androidUpdate.installHint')}`, [
      { text: t('androidUpdate.later'), style: 'cancel' },
      { text: t('androidUpdate.download'), onPress: download },
    ], { cancelable: true });
}

/** Mounted once in the app shell, after privacy confirmation and bootstrap. */
export function AndroidUpdateSession({ enabled }: { enabled: boolean }) {
  const completed = useRef(false);
  useEffect(() => {
    if (!enabled || completed.current) return;
    const controller = new AbortController();
    let currentState = AppState.currentState;
    let pending: AndroidRelease | null = null;
    const offerWhenActive = () => {
      if (controller.signal.aborted || !pending || currentState !== 'active') return;
      const release = pending;
      pending = null;
      completed.current = true;
      offerUpdate(release);
    };
    const subscription = AppState.addEventListener('change', state => {
      currentState = state;
      offerWhenActive();
    });
    void checkForAndroidUpdate({
      platform: Platform.OS,
      track: BUILD_TRACK,
      applicationId: Application.applicationId,
      buildVersion: Application.nativeBuildVersion,
    }, controller.signal).then(release => {
      if (controller.signal.aborted) return;
      if (!release) completed.current = true;
      pending = release;
      offerWhenActive();
    });
    return () => {
      controller.abort();
      subscription.remove();
    };
  }, [enabled]);
  return null;
}
