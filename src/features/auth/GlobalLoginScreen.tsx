import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { getLocale, t } from '@/i18n';
import { BUILD_TRACK } from '@/config/build-track';
import { useSessionStore } from '@/api/session';
import { font, useColors } from '@/design';

import { authTypography } from './auth-typography';
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
  return <AuthForm brand title={t(BUILD_TRACK === 'china' ? 'auth.chinaSlogan' : 'auth.globalSlogan')}>
    <EmailField value={email} onChangeText={setEmail} editable={!busy} />
    <GlobalAuthField label={t('auth.password')} placeholder={getLocale() === 'zh' ? t('auth.loginPasswordPlaceholder') : undefined} error={password.length > 0 && !isValidPassword(password) ? t('auth.invalidPassword') : undefined}
      secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" value={password} onChangeText={setPassword} editable={!busy} />
    <AuthNotice success={passwordResetNotice} message={passwordResetNotice ? t('auth.passwordUpdated') : message} />
    <GlobalAuthButton label={t('auth.signIn')} loading={busy} disabled={!isValidEmail(email) || !isValidPassword(password)} onPress={() => void run(() => useSessionStore.getState().loginWithEmail({ email, password }))} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <Pressable accessibilityRole="link" accessibilityLabel={t('auth.createAccount')} disabled={busy} onPress={() => router.push('/register')} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ ...font.body(13, 'semibold'), ...authTypography(), color: colors.goldText }}>{t('auth.createAccount')}</Text>
      </Pressable>
      <Pressable accessibilityRole="link" accessibilityLabel={t('auth.forgotLink')} disabled={busy} onPress={() => router.push('/forgot-password')} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ ...font.body(13, 'semibold'), ...authTypography(), color: colors.goldText }}>{t('auth.forgotLink')}</Text>
      </Pressable>
    </View>
    {BUILD_TRACK === 'global' ? <GoogleLoginAction busy={busy} run={run} /> : null}
    <Text style={{ ...font.body(12), ...authTypography(), color: colors.textMuted, textAlign: 'center' }}>
      {t('auth.consent')}{getLocale() === 'en' ? ' ' : ''}
      <Text accessibilityRole="link" style={{ color: colors.goldText, textDecorationLine: 'underline' }} onPress={() => {
        void Linking.openURL(BUILD_TRACK === 'china' ? 'https://meetpr.app/privacy' : 'https://meetpr.app/privacy/en').catch(error => {
          setPasswordResetNotice(false);
          setMessage(globalAuthErrorMessage(error));
        });
      }}>{t('auth.privacy')}</Text>
    </Text>
  </AuthForm>;
}

function GoogleLoginAction({ busy, run }: { busy: boolean; run: (operation: () => Promise<unknown>) => Promise<void> }) {
  const colors = useColors();
  const googleOAuth = useGoogleOAuth();
  return <>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderSubtle }} />
      <Text style={{ ...font.mono(12), color: colors.textMuted }}>{t('auth.or')}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderSubtle }} />
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('auth.google')} accessibilityState={{ disabled: busy }} disabled={busy}
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
      <Text style={{ ...font.body(16, 'bold'), color: colors.textPrimary }}>{t('auth.google')}</Text>
    </Pressable>
  </>;
}
