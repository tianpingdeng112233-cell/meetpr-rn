import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AppButton,
  Card,
  Screen,
  colors,
  radius,
  spacing,
  typography,
} from '@/design';

export type BindGateState =
  | 'loading'
  | 'needsCode'
  | 'needsOnboarding'
  | 'pendingAcceptance'
  | 'bound'
  | 'failed';

export type BindRequestStatus =
  | 'none'
  | 'accepted'
  | 'pending'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface BindRepository {
  getMyBindingRequestStatus: () => Promise<BindRequestStatus>;
}

export const stubBindRepository: BindRepository = {
  getMyBindingRequestStatus: () => Promise.resolve('none'),
};

// 2026-07-13 硬封存：accepted 直接进入 tabs。defer ≠ delete。
export const evaluationSealed = true;

export const NEUTRAL_BIND_NOTICE = '绑定申请尚未完成，请重新输入邀请码。';

type BindGateProps = PropsWithChildren<{
  repository?: BindRepository;
}>;

export function BindGate({ children, repository = stubBindRepository }: BindGateProps) {
  const [state, setState] = useState<BindGateState>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    let active = true;

    void repository
      .getMyBindingRequestStatus()
      .then((status) => {
        if (!active) {
          return;
        }

        switch (status) {
          case 'accepted':
            if (evaluationSealed) {
              setState('bound');
              return;
            }
            // Unreachable while sealed; W1 must restore the iOS evaluation contract
            // before enabling this branch.
            setState('failed');
            return;
          case 'pending':
            setState('pendingAcceptance');
            return;
          case 'rejected':
          case 'expired':
          case 'cancelled':
            setNotice(NEUTRAL_BIND_NOTICE);
            setState('needsCode');
            return;
          case 'none':
            setState('needsCode');
        }
      })
      .catch(() => {
        if (active) {
          setState('failed');
        }
      });

    return () => {
      active = false;
    };
  }, [repository]);

  if (state === 'bound') {
    return children;
  }

  if (state === 'loading') {
    return (
      <GateFrame title="正在检查绑定状态">
        <ActivityIndicator color={colors.brandRed} size="large" />
      </GateFrame>
    );
  }

  if (state === 'needsCode') {
    return (
      <GateFrame title="绑定教练">
        {notice ? <Text style={styles.detail}>{notice}</Text> : null}
        <TextInput
          autoCapitalize="characters"
          onChangeText={setInviteCode}
          placeholder="请输入邀请码"
          placeholderTextColor={colors.fgTertiary}
          style={styles.input}
          value={inviteCode}
        />
        <AppButton disabled label="提交邀请码" />
        <Text style={styles.wireNotice}>W1 接线</Text>
      </GateFrame>
    );
  }

  if (state === 'needsOnboarding') {
    return (
      <GateFrame title="完成训练信息">
        <Text style={styles.detail}>W1 接入学员 Onboarding。</Text>
      </GateFrame>
    );
  }

  if (state === 'pendingAcceptance') {
    return (
      <GateFrame title="等待教练确认">
        <Text style={styles.detail}>绑定申请处理中，请稍后查看。</Text>
      </GateFrame>
    );
  }

  return (
    <GateFrame title="暂时无法检查绑定状态">
      <Text style={styles.detail}>请稍后再试。</Text>
    </GateFrame>
  );
}

function GateFrame({ children, title }: PropsWithChildren<{ title: string }>) {
  return (
    <Screen>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {children}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.base,
  },
  card: {
    gap: spacing.base,
    padding: spacing.lg,
  },
  title: {
    color: colors.fgPrimary,
    ...typography.headline,
  },
  detail: {
    color: colors.fgSecondary,
    ...typography.body,
  },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.fgPrimary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  wireNotice: {
    color: colors.fgTertiary,
    textAlign: 'center',
    ...typography.footnote,
  },
});
