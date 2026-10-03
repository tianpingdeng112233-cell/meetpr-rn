import { useRef, useState } from 'react';

import { useSessionStore } from '@/api/session';

import { AuthForm, AuthNotice, EmailField } from './AuthForm';
import { GlobalAuthButton } from './GlobalAuthButton';
import { GlobalAuthField } from './GlobalAuthField';
import { globalAuthErrorMessage } from './error-copy';
import { isValidEmail, isValidPassword } from './validation';

export default function GlobalRegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const submitting = useRef(false);
  const submit = async () => {
    if (submitting.current || !isValidEmail(email) || !isValidPassword(password)) return;
    submitting.current = true; setBusy(true); setMessage(null);
    try { await useSessionStore.getState().registerWithEmail({ email, password }); }
    catch (error) { setMessage(globalAuthErrorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <AuthForm title={'Create your\naccount'} subtitle="Join your coach and start building better training days.">
    <EmailField value={email} onChangeText={setEmail} editable={!busy} />
    <GlobalAuthField label="PASSWORD" placeholder="At least 8 characters" helper="8–72 characters" error={password.length > 0 && !isValidPassword(password) ? 'Use 8–72 characters' : undefined}
      value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} editable={!busy} />
    <AuthNotice message={message} />
    <GlobalAuthButton label="Create account" loading={busy} disabled={!isValidEmail(email) || !isValidPassword(password)} onPress={() => void submit()} />
  </AuthForm>;
}
