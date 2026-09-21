import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { useSessionStore } from '@/api/session';
import { font, useColors } from '@/design';

import { AuthForm, AuthNotice, EmailField } from './AuthForm';
import { GlobalAuthButton } from './GlobalAuthButton';
import { GlobalAuthField } from './GlobalAuthField';
import { globalAuthErrorMessage } from './error-copy';
import { useGoogleOAuth } from './google-oauth';
import { isValidEmail, isValidPassword } from './validation';

export default function GlobalLoginScreen() {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { passwordReset } = useLocalSearchParams<{ passwordReset?: string }>();
  const [passwordResetNotice, setPasswordResetNotice] = useState(passwordReset === '1');
  const submitting = useRef(false);
  const googleOAuth = useGoogleOAuth();
  useEffect(() => {
    if (passwordReset !== '1') return;
    router.setParams({ passwordReset: undefined });
  }, [passwordReset]);
  const run = async (operation: () => Promise<unknown>) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setMessage(null); setPasswordResetNotice(false);
    try { await operation(); } catch (error) { setMessage(globalAuthErrorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <AuthForm brand title={'Better than\nyesterday'}>
    <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityState={{ disabled: busy }} disabled={busy}
      style={{ height: 52, backgroundColor: colors.surfaceCard, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSubtle, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}
      onPress={() => void run(async () => {
        const idToken = await googleOAuth();
        if (idToken) await useSessionStore.getState().loginWithGoogle({ idToken });
      })}>
      <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={12} cy={12} r={9} stroke={colors.textPrimary} strokeWidth={1.8} fill="none" />
        <Ellipse cx={12} cy={12} rx={4} ry={9} stroke={colors.textPrimary} strokeWidth={1.8} fill="none" />
        <Path d="M3 12H21" stroke={colors.textPrimary} strokeWidth={1.8} />
      </Svg>
      <Text style={{ ...font.body(16, 'bold'), color: colors.textPrimary }}>Continue with Google</Text>
    </Pressable>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderSubtle }} />
      <Text style={{ ...font.mono(12), color: colors.textMuted }}>or</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderSubtle }} />
    </View>
    <EmailField value={email} onChangeText={setEmail} editable={!busy} />
    <GlobalAuthField label="PASSWORD" error={password.length > 0 && !isValidPassword(password) ? 'Use 8–72 characters' : undefined}
      secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" value={password} onChangeText={setPassword} editable={!busy} />
    <AuthNotice success={passwordResetNotice} message={passwordResetNotice ? 'Password updated, sign in with your new password' : message} />
    <GlobalAuthButton label="Sign in" loading={busy} disabled={!isValidEmail(email) || !isValidPassword(password)} onPress={() => void run(() => useSessionStore.getState().loginWithEmail({ email, password }))} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <Pressable accessibilityRole="link" accessibilityLabel="Create account" disabled={busy} onPress={() => router.push('/register')} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ ...font.body(13, 'semibold'), color: colors.goldText }}>Create account</Text>
      </Pressable>
      <Pressable accessibilityRole="link" accessibilityLabel="Forgot password?" disabled={busy} onPress={() => router.push('/forgot-password')} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ ...font.body(13, 'semibold'), color: colors.goldText }}>Forgot password?</Text>
      </Pressable>
    </View>
    <Text style={{ ...font.body(12), color: colors.textMuted, textAlign: 'center' }}>
      By continuing, you agree to our{' '}
      <Text accessibilityRole="link" style={{ color: colors.goldText, textDecorationLine: 'underline' }} onPress={() => {
        void Linking.openURL('https://meetpr.app/privacy/en').catch(error => {
          setPasswordResetNotice(false);
          setMessage(globalAuthErrorMessage(error));
        });
      }}>Privacy Policy</Text>
    </Text>
  </AuthForm>;
}
