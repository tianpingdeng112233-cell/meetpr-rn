import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';

import { requestPasswordReset, resetPassword } from '@/api/auth';
import { font, useColors } from '@/design';

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
  return <AuthForm title={'Reset your\npassword'} subtitle={sent ? undefined : 'Enter the email address linked to your account.'}>
    {sent ? <>
      <Text style={{ ...font.body(13, 'semibold'), color: colors.textTertiary }}>If an account exists, we&apos;ve sent a code.</Text>
      <GlobalAuthField mono placeholder="6-digit code" accessibilityLabel="6-digit code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} value={code} onChangeText={value => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))} editable={!busy} />
      <GlobalAuthField label="NEW PASSWORD" placeholder="At least 8 characters" helper="8–72 characters" error={password.length > 0 && !isValidPassword(password) ? 'Use 8–72 characters' : undefined}
        value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} editable={!busy} />
    </> : <EmailField value={email} onChangeText={setEmail} editable={!busy} />}
    <AuthNotice message={message} />
    <GlobalAuthButton label={sent ? 'Reset password' : 'Send code'} loading={busy} disabled={!valid} onPress={() => void submit()} />
  </AuthForm>;
}
