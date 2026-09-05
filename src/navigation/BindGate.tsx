import { t } from '@/i18n';

import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AnalyticsEvent, AnalyticsScreen, screen, track } from '@/analytics';
import { ApiError } from '@/api/client';
import {
  bindRepository,
  onboardingRepository,
  type BindRequest,
  type OnboardingProfile,
} from '@/api/domains';
import { useSessionStore } from '@/api/session';
import {
  AppButton,
  Card,
  Screen,
  TextField,
  useColors, type Colors,
  radius,
  spacing,
  typography,
} from '@/design';
import {
  BIND_NOTICES,
  groupedInviteCode,
  inviteStashStorage,
  isValidInviteCode,
  normalizeInviteCode,
  onboardingDraftStorage,
  OnboardingWizard,
  resubmitInviteStash,
  resolveBindGateState,
  type BindGateViewState,
  type InviteStash,
} from '@/features/onboarding';

// 2026-07-13 硬封存：accepted 直接进入 tabs。defer ≠ delete。
export const evaluationSealed = true;

type Snapshot = {
  profile: OnboardingProfile | null;
  request: BindRequest | null;
  stash: InviteStash | null;
};

type BindGateProps = PropsWithChildren<{
  studentId?: string;
}>;

export function BindGate({ children, studentId: explicitStudentId }: BindGateProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useSessionStore((current) => current.user);
  const logout = useSessionStore((current) => current.logout);
  const studentId = explicitStudentId ?? user?.id ?? '';
  const [state, setState] = useState<BindGateViewState>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const [prefillDisplayName, setPrefillDisplayName] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot>({ profile: null, request: null, stash: null });
  const [wizardVisible, setWizardVisible] = useState(false);
  const [revision, setRevision] = useState(0);

  const runHandoff = useCallback(
    async (stash: InviteStash) => {
      setState('handoffSubmitting');
      const result = await resubmitInviteStash(
        stash,
        bindRepository.create,
        () => inviteStashStorage.clear(studentId),
      );
      if (result.kind === 'requestSent') {
        setSnapshot((current) => ({ ...current, request: result.request, stash: null }));
        setState('pendingAcceptance');
        return;
      }
      if (result.kind === 'invalidCode') {
        setPrefillDisplayName(stash.displayName);
        setSnapshot((current) => ({ ...current, stash: null }));
        setNotice(BIND_NOTICES.invalidCode);
        setState('needsCode');
        return;
      }
      if (result.kind === 'needsReload') {
        setRevision((current) => current + 1);
        return;
      }
      setState('handoffFailed');
    },
    [studentId],
  );

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    void Promise.all([
      bindRepository.mine(),
      onboardingRepository.get(studentId),
      inviteStashStorage.read(studentId),
    ])
      .then(async ([mine, profile, stash]) => {
        if (!active) return;
        if (profile?.completed_at) await onboardingDraftStorage.clear(studentId);
        const request = mine.bind_request;
        const resolution = resolveBindGateState(
          request?.status ?? 'none',
          stash !== null,
          profile?.completed_at != null,
        );
        if (!active) return;
        setSnapshot({ profile, request, stash });
        setNotice(resolution.notice);
        setState(resolution.state);
        setWizardVisible(resolution.state === 'needsOnboarding');
        if (resolution.state === 'handoffSubmitting' && stash) void runHandoff(stash);
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
    };
  }, [revision, runHandoff, studentId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && state === 'pendingAcceptance') {
        setRevision((current) => current + 1);
      }
    });
    return () => subscription.remove();
  }, [state]);

  const retry = () => {
    setState('loading');
    setRevision((current) => current + 1);
  };

  if (state === 'bound' && evaluationSealed) return children;
  if (state === 'loading') {
    return (
      <GateFrame title={t('student.bindGateView.copy001')}>
        <ActivityIndicator color={colors.gold500} size="large" />
      </GateFrame>
    );
  }
  if (state === 'needsCode') {
    return (
      <EnterCodeView
        notice={notice}
        prefillDisplayName={prefillDisplayName}
        onNeedsOnboarding={(stash) => {
          setSnapshot((current) => ({ ...current, stash }));
          setWizardVisible(true);
          setState('needsOnboarding');
        }}
        onPending={(request) => {
          setSnapshot((current) => ({ ...current, request, stash: null }));
          setState('pendingAcceptance');
        }}
        onReload={retry}
        onboardingComplete={snapshot.profile?.completed_at != null}
        onLogout={() => void logout()}
        studentId={studentId}
      />
    );
  }
  if (state === 'needsOnboarding') {
    return (
      <>
        <GateFrame onLogout={() => void logout()} title={t('student.onboardingWizardView.copy001')}>
          <Text style={styles.detail}>{t('student.onboardingWizardView.copy002')}</Text>
          <AppButton label={t('student.onboardingWizardView.copy003')} onPress={() => setWizardVisible(true)} />
        </GateFrame>
        <OnboardingWizard
          onCompleted={(profile) => {
            setWizardVisible(false);
            setSnapshot((current) => ({ ...current, profile }));
            if (snapshot.stash) void runHandoff(snapshot.stash);
            else retry();
          }}
          onExit={() => setWizardVisible(false)}
          profile={snapshot.profile}
          studentId={studentId}
          visible={wizardVisible}
        />
      </>
    );
  }
  if (state === 'pendingAcceptance') {
    return (
      <PendingBindView
        onLogout={() => void logout()}
        onReload={retry}
        profile={snapshot.profile}
        request={snapshot.request}
        studentId={studentId}
      />
    );
  }
  if (state === 'handoffSubmitting' || state === 'handoffFailed') {
    return (
      <CompletionHandoffView
        failed={state === 'handoffFailed'}
        onRetry={() => {
          if (snapshot.stash) void runHandoff(snapshot.stash);
          else retry();
        }}
      />
    );
  }
  return (
    <GateFrame onLogout={() => void logout()} title={t('student.bindGateView.copy002')}>
      <AppButton label={t('student.bindGateView.copy003')} onPress={retry} />
    </GateFrame>
  );
}

function EnterCodeView({
  notice,
  prefillDisplayName,
  onLogout,
  onNeedsOnboarding,
  onboardingComplete,
  onPending,
  onReload,
  studentId,
}: {
  notice: string | null;
  prefillDisplayName: string;
  onLogout: () => void;
  onNeedsOnboarding: (stash: InviteStash) => void;
  onboardingComplete: boolean;
  onPending: (request: BindRequest) => void;
  onReload: () => void;
  studentId: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState(prefillDisplayName);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const valid = isValidInviteCode(code) && displayName.trim().length > 0;

  useEffect(() => {
    void screen(AnalyticsScreen.BindEnterCode);
    void track(AnalyticsEvent.BindCoachAction, { action: 'invite_open' });
  }, []);

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setBanner(null);
    const stash: InviteStash = {
      code: normalizeInviteCode(code),
      displayName: displayName.trim(),
      savedAt: new Date().toISOString(),
    };
    await track(AnalyticsEvent.BindCoachAction, { action: 'submitted' });
    if (!onboardingComplete) {
      try {
        await inviteStashStorage.write(studentId, stash);
        onNeedsOnboarding(stash);
      } catch {
        setCode('');
        setDisplayName(stash.displayName);
        setBanner(t('student.enterCodeView.copy004'));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    try {
      const request = await bindRepository.create({ code: stash.code, display_name: stash.displayName });
      await inviteStashStorage.clear(studentId);
      onPending(request);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVITE_CODE_INVALID') {
        await inviteStashStorage.clear(studentId);
        setCode('');
        setDisplayName(stash.displayName);
        setBanner(BIND_NOTICES.invalidCode);
      } else if (
        error instanceof ApiError &&
        (error.code === 'BIND_REQUEST_ALREADY_PENDING' || error.code === 'BIND_ALREADY_BOUND')
      ) {
        onReload();
      } else {
        setCode('');
        setDisplayName(stash.displayName);
        setBanner(t('student.enterCodeView.copy004'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GateFrame onLogout={onLogout} title={t('student.bindEnterCodeSubviews.copy001')}>
      <Text style={styles.detail}>{"没有教练?请向你的教练索取邀请码" /* TODO(i18n:missing) */}</Text>
      {notice ? <Notice>{notice}</Notice> : null}
      <TextField
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        onChangeText={(value) => setCode(normalizeInviteCode(value))}
        placeholder="XXXXXXXXXX"
        label={t('student.inviteCodeEntry.copy001')}
        helper={t('student.enterCodeViewModel.copy002')}
        mono
        style={styles.codeInput}
        value={isValidInviteCode(code) ? groupedInviteCode(code) : code}
      />
      <TextField
        maxLength={100}
        onChangeText={setDisplayName}
        placeholder={t('student.enterCodeView.copy002')}
        label={t('student.enterCodeView.copy001')}
        helper={t('student.enterCodeView.copy003')}
        value={displayName}
      />
      {banner ? <Text style={styles.error}>{banner}</Text> : null}
      <AppButton
        disabled={!valid || submitting}
        label={submitting ? t('student.accountSecuritySheets.copy018') : '提交' /* TODO(i18n:missing) */}
        onPress={() => void submit()}
      />
    </GateFrame>
  );
}

function elapsedLabel(submittedAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(submittedAt)) / 60_000));
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const remainingMinutes = minutes % 60;
  if (days > 0) return t('student.pendingBindViewModel.copy002', [days, hours]);
  if (hours > 0) return t('student.pendingBindViewModel.copy003', [hours, remainingMinutes]);
  return t(remainingMinutes === 1 ? 'student.pendingBindViewModel.copy004.one' : 'student.pendingBindViewModel.copy004', [remainingMinutes]);
}

function PendingBindView({
  onLogout,
  onReload,
  profile,
  request,
  studentId,
}: {
  onLogout: () => void;
  onReload: () => void;
  profile: OnboardingProfile | null;
  request: BindRequest | null;
  studentId: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [now, setNow] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void screen(AnalyticsScreen.PendingBind);
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);

  const refresh = () => {
    setRefreshing(true);
    onReload();
    setTimeout(() => setRefreshing(false), 350);
  };
  const cancel = async () => {
    if (!request || cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      await bindRepository.cancel(request.id);
      await inviteStashStorage.clear(studentId);
      onReload();
    } catch (caught) {
      if (caught instanceof ApiError && (caught.status === 409 || caught.status === 404)) {
        onReload();
      } else setError(t('student.pendingBindViewModel.copy001'));
    } finally {
      setCancelling(false);
    }
  };

  const coachName = request?.coach_display_name || t('student.bindGateView.copy004');
  const uploads = profile?.upload_attachment_ids.length ?? 0;
  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.topSpacer} />
        <AppButton accessibilityLabel={t('student.bindGateView.copy007')} label={t('student.bindGateView.copy006')} onPress={onLogout} variant="link" />
      </View>
      <ScrollView
        contentContainerStyle={styles.pendingContent}
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={colors.gold500} />}>
        <Text style={styles.gateTitle}>{t('student.pendingBindView.copy001')}</Text>
        <Text style={styles.detail}>{t('student.pendingBindView.copy002', [coachName])}</Text>
        {request ? (
          <Card style={styles.waitCard}>
            <Text style={styles.clock}>◷</Text>
            <Text style={styles.waitText}>{t('student.pendingBindView.copy009', [elapsedLabel(request.submitted_at, now)])}</Text>
          </Card>
        ) : null}
        {profile?.completed_at || uploads > 0 ? (
          <Card style={styles.profileCard}>
            <Text style={styles.fieldLabel}>{t('student.pendingBindView.copy010')}</Text>
            {profile?.completed_at ? <Text style={styles.detail}>{"完整资料" /* TODO(i18n:missing) */}</Text> : null}
            {uploads > 0 ? <Text style={styles.detail}>{t(uploads === 1 ? 'student.pendingBindView.copy012.one' : 'student.pendingBindView.copy012', [uploads])}</Text> : null}
          </Card>
        ) : null}
        <Text style={styles.hint}>{t('student.pendingBindView.copy003')}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton
          disabled={!request || cancelling}
          label={cancelling ? '取消中…' /* TODO(i18n:missing) */ : t('student.pendingBindView.copy004')}
          onPress={() =>
            Alert.alert(t('student.pendingBindView.copy005'), t('student.pendingBindView.copy007'), [
              { text: '保留请求' /* TODO(i18n:missing) */, style: 'cancel' },
              { text: t('student.pendingBindView.copy004'), onPress: () => void cancel() },
            ])
          }
          variant="secondary"
        />
      </ScrollView>
    </Screen>
  );
}

function CompletionHandoffView({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <GateFrame title={t('student.onboardingWizardView.copy015')}>
      {failed ? (
        <>
          <Text style={styles.error}>{t('student.onboardingWizardView.copy016')}</Text>
          <AppButton label={t('student.onboardingWizardView.copy017')} onPress={onRetry} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.gold500} size="large" />
          <Text style={styles.detail}>{t('student.onboardingWizardView.copy018')}</Text>
        </>
      )}
    </GateFrame>
  );
}

function Notice({ children }: { children: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.notice}>
      <Text style={styles.detail}>{children}</Text>
    </View>
  );
}

function GateFrame({
  children,
  onLogout,
  title,
}: PropsWithChildren<{ onLogout?: () => void; title: string }>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Screen>
      {onLogout ? (
        <View style={styles.topBar}>
          <View style={styles.topSpacer} />
          <AppButton accessibilityLabel={t('student.bindGateView.copy007')} label={t('student.bindGateView.copy006')} onPress={onLogout} variant="link" />
        </View>
      ) : null}
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.gateTitle}>{title}</Text>
          {children}
        </Card>
      </View>
    </Screen>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  topBar: { alignItems: 'center', flexDirection: 'row', minHeight: 52, paddingHorizontal: spacing.base },
  topSpacer: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: spacing.base },
  pendingContent: { gap: spacing.base, padding: spacing.base, paddingBottom: spacing.xl },
  card: { gap: spacing.base, padding: spacing.lg },
  gateTitle: { color: colors.textPrimary, ...typography.title2 },
  detail: { color: colors.textSecondary, lineHeight: 23, ...typography.body },
  fieldLabel: { color: colors.textPrimary, ...typography.bodyEmphasis },
  hint: { color: colors.textTertiary, lineHeight: 18, ...typography.footnote },
  codeInput: { fontSize: 24, letterSpacing: 2, textAlign: 'center' },
  notice: { backgroundColor: colors.bgInset, borderRadius: radius.md, padding: spacing.md },
  error: { color: colors.danger, ...typography.footnote },
  waitCard: { alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  clock: { color: colors.textPrimary, fontSize: 36 },
  waitText: { color: colors.textPrimary, ...typography.bodyEmphasis },
  profileCard: { gap: spacing.sm, padding: spacing.base },
});
