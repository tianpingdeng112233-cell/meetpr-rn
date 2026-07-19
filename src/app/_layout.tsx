import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
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
import { QueryProvider } from '@/api/query';
import { useSessionStore } from '@/api/session';
import { colors } from '@/design';

const meetPrDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.brandRed,
    background: colors.bg,
    card: colors.surface1,
    text: colors.fgPrimary,
    border: colors.border,
  },
};

function RootNavigator() {
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
        contentStyle: { backgroundColor: colors.bg },
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

export default function RootLayout() {
  const bootstrap = useSessionStore((state) => state.bootstrap);
  const [privacyNoticeVisible, setPrivacyNoticeVisible] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

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
      <ThemeProvider value={meetPrDarkTheme}>
        <StatusBar style="light" />
        <RootNavigator />
        <PrivacyNoticeSheet
          onConfirmed={() => setPrivacyNoticeVisible(false)}
          visible={privacyNoticeVisible}
        />
      </ThemeProvider>
    </QueryProvider>
  );
}
