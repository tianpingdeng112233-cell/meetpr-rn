import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, Screen, spacing, typography } from '@/design';

export default function GrowthCurvePlaceholderScreen() {
  const router = useRouter();
  const { lift } = useLocalSearchParams<{ lift?: string }>();
  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="返回"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}>
          <MaterialCommunityIcons
            color={colors.fgPrimary}
            name="arrow-left"
            size={26}
          />
        </Pressable>
        <Text style={styles.title}>成长曲线</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.empty}>
        <MaterialCommunityIcons
          color={colors.fgTertiary}
          name="chart-line"
          size={44}
        />
        <Text style={styles.emptyTitle}>{lift ?? '主项'}成长曲线</Text>
        <Text style={styles.emptyBody}>完整曲线将在成长页图表卡接入</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.base },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  title: { color: colors.fgPrimary, flex: 1, textAlign: 'center', ...typography.headline },
  headerSpacer: { width: 26 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.fgPrimary, ...typography.headline },
  emptyBody: { color: colors.fgSecondary, ...typography.footnote },
});
