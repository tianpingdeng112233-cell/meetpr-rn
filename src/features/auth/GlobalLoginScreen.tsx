import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useSessionStore } from '@/api/session';
import { AppButton, Card, TextField, font, useColors } from '@/design';
import { showToast } from '@/design/Toast';

import { AuthForm, EmailField } from './AuthForm';
import { globalAuthErrorMessage } from './error-copy';
import { useGoogleOAuth } from './google-oauth';
import { isValidEmail, isValidPassword } from './validation';

function GoogleMark() {
  return <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden>
    <Path fill="#4285F4" d="M22 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4C20.9 17.9 22 15.4 22 12.2Z" />
    <Path fill="#34A853" d="M12 22c2.8 0 5.2-.9 6.9-2.3l-3.4-2.6c-.9.6-2.1.9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.7v2.7A10 10 0 0 0 12 22Z" />
    <Path fill="#FBBC05" d="M6.2 13.7a6 6 0 0 1 0-3.4V7.6H2.7a10 10 0 0 0 0 8.8l3.5-2.7Z" />
    <Path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l3-3A10 10 0 0 0 2.7 7.6l3.5 2.7C7 7.8 9.3 6 12 6Z" />
  </Svg>;
}

export default function GlobalLoginScreen() {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const googleOAuth = useGoogleOAuth();
  const run = async (operation: () => Promise<unknown>) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true);
    try { await operation(); } catch (error) { showToast(globalAuthErrorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <AuthForm brand title={'Better than\nyesterday'}>
    <View>
      <AppButton variant="secondary" style={{ paddingLeft: 48, paddingRight: 12 }} label="Continue with Google" disabled={busy} onPress={() => void run(async () => {
        const idToken = await googleOAuth();
        if (idToken) await useSessionStore.getState().loginWithGoogle({ idToken });
      })} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 20, top: 16 }}><GoogleMark /></View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderDefault }} />
      <Text style={{ ...font.body(13), color: colors.textMuted }}>or</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderDefault }} />
    </View>
    <Card style={{ gap: 20 }}>
      <EmailField value={email} onChangeText={setEmail} editable={!busy} />
      <TextField label="PASSWORD" helper="Use 8–72 characters" secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" value={password} onChangeText={setPassword} editable={!busy} />
      <AppButton label="Sign in" loading={busy} disabled={!isValidEmail(email) || !isValidPassword(password)} onPress={() => void run(() => useSessionStore.getState().loginWithEmail({ email, password }))} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <AppButton variant="link" fullWidth={false} label="Create account" disabled={busy} onPress={() => router.push('/register')} />
        <AppButton variant="link" fullWidth={false} label="Forgot password?" disabled={busy} onPress={() => router.push('/forgot-password')} />
      </View>
    </Card>
    <View style={{ alignItems: 'center' }}>
      <Text style={{ ...font.body(12), color: colors.textMuted }}>By continuing, you agree to our</Text>
      <AppButton variant="link" label="Privacy Policy" onPress={() => { void Linking.openURL('https://meetpr.app/privacy/en').catch(error => showToast(globalAuthErrorMessage(error))); }} />
    </View>
  </AuthForm>;
}
