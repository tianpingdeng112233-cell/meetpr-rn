import { BUILD_TRACK } from '@/config/build-track';
import GlobalLoginScreen from '@/features/auth/GlobalLoginScreen';

import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { t } from '@/i18n';
import { ApiError } from '@/api/client';
import { useSessionStore } from '@/api/session';
import {
  AppButton,
  Card,
  Screen,
  useColors, type Colors,
  radius,
  spacing,
  typography,
} from '@/design';

function loginErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return error ? t('appShell.auth.requestFailed') : null;
  }

  switch (error.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return t('appShell.auth.invalidCredentials');
    case 'RATE_LIMITED':
      return t('appShell.auth.rateLimited');
    default:
      return t('appShell.auth.requestFailed');
  }
}

export default function LoginRoute() {
  return BUILD_TRACK === 'global' ? <GlobalLoginScreen /> : <LoginScreen />;
}

function LoginScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const login = useSessionStore((state) => state.login);
  const authenticationError = useSessionStore((state) => state.authenticationError);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    void login({ phone: phone.trim(), password }).catch(() => {
      // Session owns the error so it survives the authenticating route transition.
    });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.title}>MeetPR</Text>
            <Text style={styles.subtitle}>{t('appShell.login.instructions')}</Text>
            <View style={styles.accent} />
          </View>

          <Card style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('appShell.auth.phoneNumber')}</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="tel"
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder={t('appShell.auth.phoneInputHint')}
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
                value={phone}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('appShell.auth.password')}</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder={t('appShell.auth.passwordInputHint')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {loginErrorMessage(authenticationError) ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {loginErrorMessage(authenticationError)}
              </Text>
            ) : null}

            <AppButton
              disabled={!phone.trim() || !password}
              label={t('appShell.login.signIn')}
              onPress={handleLogin}
            />
            {/* TODO(W1): Restore the canonical registration entry and flow. */}
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  heading: {
    gap: spacing.sm,
  },
  accent: {
    backgroundColor: colors.gold500,
    borderRadius: radius.pill,
    height: 3,
    marginTop: spacing.xs,
    width: 48,
  },
  title: {
    color: colors.textPrimary,
    ...typography.title1,
  },
  subtitle: {
    color: colors.textSecondary,
    ...typography.body,
  },
  card: {
    gap: spacing.base,
    padding: spacing.base,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    ...typography.footnote,
  },
  input: {
    backgroundColor: colors.bgInset,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.textPrimary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  error: {
    color: colors.danger,
    ...typography.footnote,
  },
});
