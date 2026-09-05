import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';

import { requestPasswordReset, resetPassword } from '@/api/auth';
import { AppButton, Card, TextField, font, useColors } from '@/design';
import { showToast } from '@/design/Toast';

import { AuthForm, EmailField } from './AuthForm';
import { globalAuthErrorMessage } from './error-copy';
import { isValidEmail, isValidPassword, isValidResetCode } from './validation';

export default function GlobalForgotPasswordScreen() {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const valid = sent ? isValidResetCode(code) && isValidPassword(password) : isValidEmail(email);
  const submit = async () => {
    if (submitting.current || !valid) return;
    submitting.current = true; setBusy(true);
    try {
      if (!sent) { await requestPasswordReset({ email }); setSent(true); }
      else {
        await resetPassword({ email, code, newPassword: password });
        router.replace('/login');
        showToast('Password updated, sign in with your new password');
      }
    } catch (error) { showToast(globalAuthErrorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <AuthForm title={'Reset your\npassword'} subtitle={sent ? undefined : 'Enter the email address linked to your account.'}>
    <Card style={{ gap: 20 }}>
      {sent ? <>
        <Text style={{ ...font.body(15), color: colors.textSecondary }}>If an account exists, we&apos;ve sent a code.</Text>
        <TextField label="6-digit code" accessibilityLabel="6-digit code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} value={code} onChangeText={value => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))} editable={!busy} />
        <TextField label="NEW PASSWORD" helper="8–72 characters" error={password.length > 0 && Array.from(password).length < 8 ? 'At least 8 characters' : undefined}
          value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} editable={!busy} />
      </> : <EmailField value={email} onChangeText={setEmail} editable={!busy} />}
      <AppButton label={sent ? 'Reset password' : 'Send code'} loading={busy} disabled={!valid} onPress={() => void submit()} />
    </Card>
  </AuthForm>;
}
