import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';

import { getLocale, t } from '@/i18n';
import { requestPasswordReset, resetPassword } from '@/api/auth';
import { font, useColors } from '@/design';

import { authTypography } from './auth-typography';
import { AuthForm, AuthNotice, EmailField } from './AuthForm';
import { GlobalAuthButton } from './GlobalAuthButton';
import { GlobalAuthField } from './GlobalAuthField';
import { globalAuthErrorMessage } from './error-copy';
import { isValidEmail, isValidPassword, isValidResetCode } from './validation';

export default function GlobalForgotPasswordScreen() {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const submitting = useRef(false);
  const valid = sent ? isValidResetCode(code) && isValidPassword(password) : isValidEmail(email);
  const submit = async () => {
    if (submitting.current || !valid) return;
    submitting.current = true; setBusy(true); setMessage(null);
    try {
      if (!sent) { await requestPasswordReset({ email }); setSent(true); }
      else {
        await resetPassword({ email, code, newPassword: password });
        router.replace({ pathname: '/login', params: { passwordReset: '1' } });
      }
    } catch (error) { setMessage(globalAuthErrorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <AuthForm title={t(sent ? 'auth.resetTitle' : 'auth.forgotTitle')} subtitle={sent ? undefined : t('auth.forgotSubtitle')}>
    {sent ? <>
      <Text style={{ ...font.body(13, 'semibold'), ...authTypography(), color: colors.textTertiary }}>{t('auth.resetSent')}</Text>
      <GlobalAuthField mono label={getLocale() === 'zh' ? t('auth.signupCode') : undefined} placeholder={t('auth.codePlaceholder')} accessibilityLabel={t('auth.codePlaceholder')} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} value={code} onChangeText={value => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))} editable={!busy} />
      <GlobalAuthField label={t('auth.newPassword')} placeholder={t('auth.newPasswordPlaceholder')} helper={t('auth.passwordHelper')} error={password.length > 0 && !isValidPassword(password) ? t('auth.invalidPassword') : undefined}
        value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} editable={!busy} />
    </> : <EmailField value={email} onChangeText={setEmail} editable={!busy} />}
    <AuthNotice message={message} />
    <GlobalAuthButton label={t(sent ? 'auth.resetButton' : 'auth.sendCode')} loading={busy} disabled={!valid} onPress={() => void submit()} />
  </AuthForm>;
}
