import { useRef, useState } from 'react';

import { useSessionStore } from '@/api/session';
import { AppButton, Card, TextField } from '@/design';
import { showToast } from '@/design/Toast';

import { AuthForm, EmailField } from './AuthForm';
import { globalAuthErrorMessage } from './error-copy';
import { isValidEmail, isValidPassword } from './validation';

export default function GlobalRegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const submit = async () => {
    if (submitting.current || !isValidEmail(email) || !isValidPassword(password)) return;
    submitting.current = true; setBusy(true);
    try { await useSessionStore.getState().registerWithEmail({ email, password }); }
    catch (error) { showToast(globalAuthErrorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <AuthForm title={'Create your\naccount'} subtitle="Join your coach and start building better training days.">
    <Card style={{ gap: 20 }}>
      <EmailField value={email} onChangeText={setEmail} editable={!busy} />
      <TextField label="PASSWORD" helper="8–72 characters" error={password.length > 0 && Array.from(password).length < 8 ? 'At least 8 characters' : undefined}
        value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} editable={!busy} />
      <AppButton label="Create account" loading={busy} disabled={!isValidEmail(email) || !isValidPassword(password)} onPress={() => void submit()} />
    </Card>
  </AuthForm>;
}
