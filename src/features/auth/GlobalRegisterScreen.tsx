import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Text } from 'react-native';

import { requestSignupCode } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useSessionStore } from '@/api/session';
import { BUILD_TRACK } from '@/config/build-track';
import { font, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';

import { AuthForm, AuthNotice, EmailField } from './AuthForm';
import { GlobalAuthButton } from './GlobalAuthButton';
import { GlobalAuthField } from './GlobalAuthField';
import { authTypography } from './auth-typography';
import { globalAuthErrorMessage } from './error-copy';
import { isValidEmail, isValidPassword, isValidResetCode } from './validation';

export default function GlobalRegisterScreen() {
  const china = BUILD_TRACK === 'china';
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [confirmationBlurred, setConfirmationBlurred] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string>();
  const [emailTaken, setEmailTaken] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentEmail, setSentEmail] = useState<string>();
  const [requested, setRequested] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const submitting = useRef(false);
  const sendingRef = useRef(false);
  const requestGeneration = useRef(0);
  const deadlineRef = useRef(0);
  const mismatch = confirmation !== password && (confirmationBlurred || (confirmation.length > 0 && password.length > 0));
  const valid = isValidEmail(email) && isValidPassword(password) && (!china || (isValidResetCode(code) && confirmation === password));

  useEffect(() => () => { requestGeneration.current += 1; }, []);
  useEffect(() => {
    if (!china || !deadline) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) setDeadline(0);
    };
    const timer = setInterval(update, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [china, deadline]);

  const changeEmail = (value: string) => {
    if (value === email) return;
    setEmail(value);
    if (!china) return;
    requestGeneration.current += 1;
    sendingRef.current = false; setSending(false);
    deadlineRef.current = 0; setDeadline(0); setRemaining(0);
    setCode(''); setCodeError(undefined); setSentEmail(undefined); setRequested(false);
    setMessage(null); setEmailTaken(false);
  };
  const sendCode = async () => {
    if (submitting.current || sendingRef.current || Date.now() < deadlineRef.current || !isValidEmail(email)) return;
    const generation = ++requestGeneration.current;
    sendingRef.current = true; setSending(true); setMessage(null);
    try {
      await requestSignupCode({ email });
      if (generation !== requestGeneration.current) return;
      setSentEmail(email.trim()); setRequested(true); setCodeError(undefined);
      deadlineRef.current = Date.now() + 60000;
      setDeadline(deadlineRef.current); setRemaining(60);
    } catch (error) {
      if (generation === requestGeneration.current) setMessage(globalAuthErrorMessage(error));
    } finally {
      if (generation === requestGeneration.current) { sendingRef.current = false; setSending(false); }
    }
  };
  const submit = async () => {
    if (submitting.current || !valid) return;
    const generation = requestGeneration.current;
    submitting.current = true; setBusy(true); setMessage(null); setEmailTaken(false);
    try { await useSessionStore.getState().registerWithEmail({ email, password, ...(china ? { code } : {}) }); }
    catch (error) {
      if (china && generation !== requestGeneration.current) return;
      if (china && error instanceof ApiError && error.code === 'AUTH_INVALID_SIGNUP_CODE') {
        setCodeError(globalAuthErrorMessage(error) ?? undefined); setRequested(true);
        deadlineRef.current = 0; setDeadline(0); setRemaining(0);
      } else {
        setMessage(globalAuthErrorMessage(error));
        setEmailTaken(china && error instanceof ApiError && error.code === 'AUTH_EMAIL_TAKEN');
      }
    }
    finally { submitting.current = false; setBusy(false); }
  };
  const codeButton = remaining > 0 ? t('auth.resendCountdown', [remaining]) : t(requested ? 'auth.resend' : 'auth.getCode');
  const codeDisabled = busy || sending || remaining > 0 || !isValidEmail(email);
  return <AuthForm title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')} footer={china && sentEmail ? <Pressable accessibilityRole="link" accessibilityLabel={t('auth.signupHelp')} onPress={() => router.replace('/login')}
      style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ ...font.body(12), ...authTypography(), color: colors.textMuted, textAlign: 'center' }}>
        {t('auth.signupHelpPrefix')}<Text style={{ color: colors.goldText, textDecorationLine: 'underline' }}>{t('auth.signupHelpAction')}</Text>{t('auth.signupHelpSuffix')}
      </Text>
    </Pressable> : null}>
    <EmailField value={email} onChangeText={changeEmail} editable={!busy} />
    {china ? <GlobalAuthField label={t('auth.signupCode')} placeholder={t('auth.codePlaceholder')} mono
      keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" value={code} editable={!busy}
      onChangeText={value => { setCode(value.replace(/[^0-9]/g, '').slice(0, 6)); setCodeError(undefined); }}
      error={codeError} helper={sentEmail ? t('auth.signupSent', [sentEmail]) : undefined}
      trailing={<Pressable accessibilityRole="button" accessibilityLabel={codeButton}
        accessibilityState={{ disabled: codeDisabled, busy: sending }} disabled={codeDisabled} onPress={() => void sendCode()}
        style={{ minHeight: 44, minWidth: 44, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: codeDisabled ? colors.surfaceRaised : colors.goldSoft }}>
        <Text style={{ ...font.body(13), ...authTypography(), color: remaining > 0 || sending ? colors.textTertiary : codeDisabled ? colors.textDisabled : colors.goldText }}>{codeButton}</Text>
      </Pressable>} /> : null}
    <GlobalAuthField label={t('auth.password')} placeholder={t('auth.passwordPlaceholder')} helper={t('auth.passwordHelper')} error={password.length > 0 && !isValidPassword(password) ? t('auth.invalidPassword') : undefined}
      value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} editable={!busy} />
    {china ? <GlobalAuthField label={t('auth.confirmPassword')} placeholder={t('auth.confirmPlaceholder')}
      value={confirmation} onChangeText={setConfirmation} onBlur={() => setConfirmationBlurred(true)}
      error={mismatch ? t('auth.passwordMismatch') : undefined} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} editable={!busy} /> : null}
    <AuthNotice message={message} />
    {emailTaken ? <Pressable accessibilityRole="link" accessibilityLabel={t('auth.goSignIn')} onPress={() => router.replace('/login')}
      style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ ...font.body(13), ...authTypography(), color: colors.goldText }}>{t('auth.goSignIn')}</Text>
    </Pressable> : null}
    <GlobalAuthButton label={t('auth.registerButton')} loading={busy} disabled={!valid} onPress={() => void submit()} />
  </AuthForm>;
}
