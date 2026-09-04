import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  colors,
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
      <GateFrame title="正在检查绑定状态">
        <ActivityIndicator color={colors.brandRed} size="large" />
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
        <GateFrame onLogout={() => void logout()} title="完成资料填写,教练才能开始评估">
          <Text style={styles.detail}>已填的内容都已保存,可随时继续</Text>
          <AppButton label="继续填写" onPress={() => setWizardVisible(true)} />
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
    <GateFrame onLogout={() => void logout()} title="无法获取绑定状态">
      <AppButton label="重试" onPress={retry} />
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
        setBanner('网络异常,请重试');
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
        setBanner('网络异常,请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GateFrame onLogout={onLogout} title="输入教练邀请码">
      <Text style={styles.detail}>没有教练?请向你的教练索取邀请码</Text>
      {notice ? <Notice>{notice}</Notice> : null}
      <TextInput
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        onChangeText={(value) => setCode(normalizeInviteCode(value))}
        placeholder="XXXXXXXXXX"
        placeholderTextColor={colors.fgTertiary}
        style={[styles.input, styles.codeInput]}
        value={isValidInviteCode(code) ? groupedInviteCode(code) : code}
      />
      <Text style={styles.hint}>邀请码为 10 位字母数字(不含 I/O/0/1)</Text>
      <Text style={styles.fieldLabel}>你的姓名</Text>
      <TextInput
        maxLength={100}
        onChangeText={setDisplayName}
        placeholder="填你自己的名字"
        placeholderTextColor={colors.fgTertiary}
        style={styles.input}
        value={displayName}
      />
      <Text style={styles.hint}>教练会在学员列表里看到这个名字</Text>
      {banner ? <Text style={styles.error}>{banner}</Text> : null}
      <AppButton
        disabled={!valid || submitting}
        label={submitting ? '提交中…' : '提交'}
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
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${remainingMinutes} 分`;
  return `${remainingMinutes} 分钟`;
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
      } else setError('取消失败,请重试');
    } finally {
      setCancelling(false);
    }
  };

  const coachName = request?.coach_display_name || '教练';
  const uploads = profile?.upload_attachment_ids.length ?? 0;
  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.topSpacer} />
        <Pressable onPress={onLogout}><Text style={styles.logout}>登出</Text></Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.pendingContent}
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={colors.brandRed} />}>
        <Text style={styles.gateTitle}>已发送绑定请求</Text>
        <Text style={styles.detail}>等待教练 {coachName} 接收</Text>
        {request ? (
          <Card style={styles.waitCard}>
            <Text style={styles.clock}>◷</Text>
            <Text style={styles.waitText}>已等待: {elapsedLabel(request.submitted_at, now)}</Text>
          </Card>
        ) : null}
        {profile?.completed_at || uploads > 0 ? (
          <Card style={styles.profileCard}>
            <Text style={styles.fieldLabel}>你已提交给教练的资料</Text>
            {profile?.completed_at ? <Text style={styles.detail}>完整资料</Text> : null}
            {uploads > 0 ? <Text style={styles.detail}>{uploads} 份上传资料</Text> : null}
          </Card>
        ) : null}
        <Text style={styles.hint}>教练通常在 24-48 小时内响应;7 天未响应自动过期,可重新输码。</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton
          disabled={!request || cancelling}
          label={cancelling ? '取消中…' : '取消请求'}
          onPress={() =>
            Alert.alert('取消绑定请求?', '取消后可重新输入邀请码。', [
              { text: '保留请求', style: 'cancel' },
              { text: '取消请求', onPress: () => void cancel() },
            ])
          }
          variant="secondary"
        />
      </ScrollView>
    </Screen>
  );
}

function CompletionHandoffView({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <GateFrame title="资料已提交">
      {failed ? (
        <>
          <Text style={styles.error}>绑定请求发送失败,请检查网络后重试</Text>
          <AppButton label="重试发送" onPress={onRetry} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.brandRed} size="large" />
          <Text style={styles.detail}>正在发送绑定请求</Text>
        </>
      )}
    </GateFrame>
  );
}

function Notice({ children }: { children: string }) {
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
  return (
    <Screen>
      {onLogout ? (
        <View style={styles.topBar}>
          <View style={styles.topSpacer} />
          <Pressable onPress={onLogout}><Text style={styles.logout}>登出</Text></Pressable>
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

const styles = StyleSheet.create({
  topBar: { alignItems: 'center', flexDirection: 'row', minHeight: 52, paddingHorizontal: spacing.base },
  topSpacer: { flex: 1 },
  logout: { color: colors.brandRed, padding: spacing.sm, ...typography.bodyEmphasis },
  content: { flex: 1, justifyContent: 'center', padding: spacing.base },
  pendingContent: { gap: spacing.base, padding: spacing.base, paddingBottom: spacing.xl },
  card: { gap: spacing.base, padding: spacing.lg },
  gateTitle: { color: colors.fgPrimary, ...typography.title2 },
  detail: { color: colors.fgSecondary, lineHeight: 23, ...typography.body },
  fieldLabel: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  hint: { color: colors.fgTertiary, lineHeight: 18, ...typography.footnote },
  input: { backgroundColor: colors.surface2, borderColor: colors.borderStrong, borderRadius: radius.md, borderWidth: 1, color: colors.fgPrimary, minHeight: 48, paddingHorizontal: spacing.base, paddingVertical: spacing.md, ...typography.body },
  codeInput: { fontFamily: 'monospace', fontSize: 24, letterSpacing: 2, textAlign: 'center' },
  notice: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md },
  error: { color: colors.brandRed, ...typography.footnote },
  waitCard: { alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  clock: { color: colors.fgPrimary, fontSize: 36 },
  waitText: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  profileCard: { gap: spacing.sm, padding: spacing.base },
});
