import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { Archivo_900Black } from '@expo-google-fonts/archivo/900Black';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans/700Bold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono/700Bold';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import {
  AnalyticsEvent,
  configure,
  flushNow,
  isPrivacyNoticeConfirmed,
  PrivacyNoticeSheet,
  track,
} from '@/analytics';
import { TrainingReminderSession } from '@/features/settings/TrainingReminderSession';
import { QueryProvider } from '@/api/query';
import { useSessionStore } from '@/api/session';
import { fontNames, ThemeProvider, useColors, useTheme } from '@/design';

void SplashScreen.preventAutoHideAsync();

const fontAssets = {
  [fontNames.display.extraBold]: Archivo_800ExtraBold,
  [fontNames.display.black]: Archivo_900Black,
  [fontNames.body.regular]: IBMPlexSans_400Regular,
  [fontNames.body.medium]: IBMPlexSans_500Medium,
  [fontNames.body.semibold]: IBMPlexSans_600SemiBold,
  [fontNames.body.bold]: IBMPlexSans_700Bold,
  [fontNames.mono.regular]: IBMPlexMono_400Regular,
  [fontNames.mono.medium]: IBMPlexMono_500Medium,
  [fontNames.mono.semibold]: IBMPlexMono_600SemiBold,
  [fontNames.mono.bold]: IBMPlexMono_700Bold,
};

function RootNavigator() {
  const colors = useColors();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const bootstrapped = useSessionStore((state) => state.bootstrapped);

  const isCoach = status === 'authenticated' && user?.role === 'coach';
  const isStudent =
    status === 'authenticated' &&
    (user?.role === 'coached_student' || user?.role === 'self_train_student');

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.bgBase },
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!bootstrapped || status === 'authenticating'}>
        <Stack.Screen name="validating" />
      </Stack.Protected>
      <Stack.Protected guard={bootstrapped && status === 'anonymous'}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={isCoach}>
        <Stack.Screen name="(coach)" />
      </Stack.Protected>
      <Stack.Protected guard={isStudent}>
        <Stack.Screen name="(student)" />
      </Stack.Protected>
    </Stack>
  );
}

function ThemedRoot() {
  const { colors, scheme } = useTheme();
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.gold500,
      background: colors.bgBase,
      card: colors.surfaceCard,
      text: colors.textPrimary,
      border: colors.borderDefault,
    },
  };
  const bootstrap = useSessionStore((state) => state.bootstrap);
  const user = useSessionStore((state) => state.user);
  const [privacyNoticeVisible, setPrivacyNoticeVisible] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (
      user?.role !== 'coached_student' &&
      user?.role !== 'self_train_student'
    ) {
      return;
    }
    let disposed = false;
    let stop: (() => void) | undefined;
    void import('@/features/training/video-upload/manager')
      .then(({ videoUploadManager }) => disposed ? undefined : videoUploadManager.start(user.id))
      .then(cleanup => { if (disposed) cleanup?.(); else stop = cleanup; })
      .catch(() => undefined);
    return () => { disposed = true; stop?.(); };
  }, [user?.id, user?.role]);

  useEffect(() => {
    let mounted = true;
    void isPrivacyNoticeConfirmed()
      .then((confirmed) => {
        if (!mounted) {
          return;
        }
        setPrivacyNoticeVisible(!confirmed);
      })
      .catch(() => undefined);

    void configure()
      .then(() => track(AnalyticsEvent.AppOpen, { cold: true }))
      .then(() => flushNow())
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <QueryProvider>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
        <RootNavigator />
        <TrainingReminderSession />
        <PrivacyNoticeSheet
          onConfirmed={() => setPrivacyNoticeVisible(false)}
          visible={privacyNoticeVisible}
        />
      </NavigationThemeProvider>
    </QueryProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  // A failed font load falls back to the platform font instead of stranding startup.
  if (!loaded && !error) return null;
  return <ThemeProvider><ThemedRoot /></ThemeProvider>;
}
