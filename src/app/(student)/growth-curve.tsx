import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { useColors, type Colors, Screen, spacing, typography } from '@/design';

export default function GrowthCurvePlaceholderScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { lift } = useLocalSearchParams<{ lift?: string }>();
  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('student.feedbackInboxView.copy005')}
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}>
          <MaterialCommunityIcons
            color={colors.textPrimary}
            name="arrow-left"
            size={26}
          />
        </Pressable>
        <Text style={styles.title}>{t('student.rn.growthCurve.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.empty}>
        <MaterialCommunityIcons
          color={colors.textTertiary}
          name="chart-line"
          size={44}
        />
        <Text style={styles.emptyTitle}>{t('student.rn.growthCurve.liftTitle', [lift ?? t('student.growthCurveView.copy001')])}</Text>
        <Text style={styles.emptyBody}>{t('student.rn.growthCurve.placeholder')}</Text>
      </View>
    </Screen>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  screen: { paddingHorizontal: spacing.base },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  title: { color: colors.textPrimary, flex: 1, textAlign: 'center', ...typography.headline },
  headerSpacer: { width: 26 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.textPrimary, ...typography.headline },
  emptyBody: { color: colors.textSecondary, ...typography.footnote },
});
