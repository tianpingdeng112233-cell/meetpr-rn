import { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/design/AppButton';
import { useColors } from '@/design/theme';
import { type Colors, radius, spacing, typography } from '@/design/tokens';

import { confirmPrivacyNotice } from './client';

export const PRIVACY_POLICY_URL = 'https://meetpr.app/privacy';

const PRIVACY_NOTICE_BODY =
  '为改进训练流程,MeetPR 会收集产品交互、匿名设备标识,以及你主动填写的反馈文本。数据仅用于产品功能,留存在境内自建阿里云,不接入第三方统计 SDK、不出境,也不用于追踪或广告。数据保留 90 天;卸载会清除匿名安装标识,你可通过删除账号或联系我们请求删除。';

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
          <Text style={styles.title}>使用数据说明</Text>
          <Text style={styles.body}>{PRIVACY_NOTICE_BODY}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={openPrivacyPolicy}
            style={({ pressed }) => pressed && styles.linkPressed}>
            <Text style={styles.link}>隐私政策</Text>
          </Pressable>
          <AppButton
            disabled={confirming}
            label="知道了"
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
