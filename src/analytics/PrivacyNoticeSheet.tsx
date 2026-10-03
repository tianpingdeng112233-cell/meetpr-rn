import { useMemo, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { t } from '@/i18n';
import { AppButton } from '@/design/AppButton';
import { useColors } from '@/design/theme';
import { type Colors, radius, spacing, typography } from '@/design/tokens';

import { confirmPrivacyNotice } from './client';

export const PRIVACY_POLICY_URL = 'https://meetpr.app/privacy';

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
          <Text style={styles.title}>{t('appShell.privacy.analytics.title')}</Text>
          <Text style={styles.body}>{t('appShell.privacy.analytics.body')}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={openPrivacyPolicy}
            style={({ pressed }) => pressed && styles.linkPressed}>
            <Text style={styles.link}>{t('appShell.privacy.policy')}</Text>
          </Pressable>
          <AppButton
            disabled={confirming}
            label={t('appShell.acknowledge')}
            onPress={() => void handleConfirm()}
            style={styles.button}
            variant="primary"
          />
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
  body: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    ...typography.body,
  },
  link: {
    color: colors.textPrimary,
    marginTop: spacing.base,
    textDecorationLine: 'underline',
    ...typography.bodyEmphasis,
  },
  linkPressed: {
    opacity: 0.7,
  },
  button: {
    alignSelf: 'flex-end',
    marginTop: spacing.lg,
  },
});
