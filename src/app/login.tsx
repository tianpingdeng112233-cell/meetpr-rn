import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '@/api/client';
import { useSessionStore } from '@/api/session';
import {
  AppButton,
  Card,
  Screen,
  colors,
  radius,
  spacing,
  typography,
} from '@/design';

function loginErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return error ? '登录失败，请稍后重试' : null;
  }

  switch (error.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return '手机号或密码不正确';
    case 'RATE_LIMITED':
      return '尝试过于频繁，请稍后再试';
    default:
      return '登录失败，请稍后重试';
  }
}

export default function LoginScreen() {
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
            <Text style={styles.subtitle}>登录你的训练账户</Text>
            <View style={styles.accent} />
          </View>

          <Card style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>手机号</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="tel"
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="请输入手机号"
                placeholderTextColor={colors.fgTertiary}
                style={styles.input}
                value={phone}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>密码</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="请输入密码"
                placeholderTextColor={colors.fgTertiary}
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
              label="登录"
              onPress={handleLogin}
            />
            {/* TODO(W1): Restore the canonical registration entry and flow. */}
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.brandRed,
    borderRadius: radius.pill,
    height: 3,
    marginTop: spacing.xs,
    width: 48,
  },
  title: {
    color: colors.fgPrimary,
    ...typography.title1,
  },
  subtitle: {
    color: colors.fgSecondary,
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
    color: colors.fgSecondary,
    ...typography.footnote,
  },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.fgPrimary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  error: {
    color: colors.brandRed,
    ...typography.footnote,
  },
});
