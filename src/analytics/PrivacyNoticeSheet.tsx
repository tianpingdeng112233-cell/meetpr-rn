import { useMemo, useState } from 'react';
import { BackHandler, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { BUILD_TRACK } from '@/config/build-track';
import { AppButton } from '@/design/AppButton';
import { useColors } from '@/design/theme';
import { type Colors, radius, spacing, typography } from '@/design/tokens';

import { confirmPrivacyNotice } from './client';
import { PRIVACY_POLICY_URL, TERMS_URL } from './legal';

export { PRIVACY_POLICY_URL, TERMS_URL } from './legal';

export type PrivacyNoticeSheetProps = {
  visible: boolean;
  onConfirmed?: () => void;
};

export function PrivacyNoticeSheet({
  visible,
  onConfirmed,
}: PrivacyNoticeSheetProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [declined, setDeclined] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (confirming) {
      return;
    }
    setConfirming(true);
    try {
      await confirmPrivacyNotice();
      onConfirmed?.();
    } finally {
      setConfirming(false);
    }
  };

  const openPrivacyPolicy = () => {
    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View
        accessibilityViewIsModal
        style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('appShell.privacy.title')}</Text>
          {declined ? <>
            <Text style={styles.body}>{t('appShell.privacy.declined')}</Text>
            <AppButton key="review" label={t('appShell.privacy.review')} onPress={() => setDeclined(false)} style={styles.button} variant="secondary" />
            <AppButton key="exit" label={t('appShell.privacy.exit')} onPress={() => BackHandler.exitApp()} style={styles.button} variant="secondary" />
          </> : <>
            <ScrollView style={styles.bodyScroll}>
              <Text style={styles.body}>
                {t('appShell.privacy.intro')}
                <Text accessibilityRole="link" accessibilityLabel={t('appShell.privacy.terms')} onPress={() => void Linking.openURL(TERMS_URL)} style={styles.link}>{t('appShell.privacy.terms')}</Text>
                {t('appShell.privacy.and')}
                <Text accessibilityRole="link" accessibilityLabel={t('appShell.privacy.policy')} onPress={openPrivacyPolicy} style={styles.link}>{t('appShell.privacy.policy')}</Text>
                {t('appShell.privacy.protection')}
              </Text>
              <Text style={styles.body}>{t(BUILD_TRACK === 'china'
                ? 'appShell.privacy.analytics.bodyChina'
                : 'appShell.privacy.analytics.body')}</Text>
            </ScrollView>
            <AppButton
              key="agree"
              disabled={confirming}
              label={t('appShell.privacy.agree')}
              onPress={() => void handleConfirm()}
              style={styles.button}
              variant="primary"
            />
            <AppButton
              key="disagree"
              disabled={confirming}
              label={t('appShell.privacy.disagree')}
              onPress={() => setDeclined(true)}
              style={styles.button}
              variant="secondary"
            />
          </>}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.bgInset,
    borderColor: colors.borderDefault,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    ...typography.headline,
  },
  bodyScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  body: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    ...typography.body,
  },
  link: {
    color: colors.textPrimary,
    textDecorationLine: 'underline',
    ...typography.bodyEmphasis,
  },
  button: {
    marginTop: spacing.lg,
  },
});
