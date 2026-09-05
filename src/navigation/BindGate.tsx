import type { PropsWithChildren } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { t } from '@/i18n';
import {
  AppButton,
  Card,
  Screen,
  useColors, type Colors,
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

export const NEUTRAL_BIND_NOTICE = t('student.rn.bind.incompleteRequest');

type BindGateProps = PropsWithChildren<{
  repository?: BindRepository;
}>;

export function BindGate({ children, repository = stubBindRepository }: BindGateProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      <GateFrame title={t('student.bindGateView.copy001')}>
        <ActivityIndicator color={colors.gold500} size="large" />
      </GateFrame>
    );
  }

  if (state === 'needsCode') {
    return (
      <GateFrame title={t('student.bindEnterCodeSubviews.copy001')}>
        {notice ? <Text style={styles.detail}>{notice}</Text> : null}
        <TextInput
          autoCapitalize="characters"
          onChangeText={setInviteCode}
          placeholder={t('student.bindEnterCodeSubviews.copy001')}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          value={inviteCode}
        />
        <AppButton disabled label={t('student.bindEnterCodeSubviews.copy005')} />
        <Text style={styles.wireNotice}>{t('student.rn.bind.wiringPlaceholder')}</Text>
      </GateFrame>
    );
  }

  if (state === 'needsOnboarding') {
    return (
      <GateFrame title={t('student.rn.bind.completeTrainingInfo')}>
        <Text style={styles.detail}>{t('student.rn.bind.onboardingPlaceholder')}</Text>
      </GateFrame>
    );
  }

  if (state === 'pendingAcceptance') {
    return (
      <GateFrame title={t('student.rn.bind.awaitingCoach')}>
        <Text style={styles.detail}>{t('student.pendingBindView.copy003')}</Text>
      </GateFrame>
    );
  }

  return (
    <GateFrame title={t('student.bindGateView.copy002')}>
      <Text style={styles.detail}>{t('coach.planning.step7.tryAgainLater')}</Text>
    </GateFrame>
  );
}

function GateFrame({ children, title }: PropsWithChildren<{ title: string }>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

const createStyles = (colors: Colors) => StyleSheet.create({
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
    color: colors.textPrimary,
    ...typography.headline,
  },
  detail: {
    color: colors.textSecondary,
    ...typography.body,
  },
  input: {
    backgroundColor: colors.bgInset,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.textPrimary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  wireNotice: {
    color: colors.textTertiary,
    textAlign: 'center',
    ...typography.footnote,
  },
});
