import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSessionStore } from '@/api/session';
import { AppButton, Card, colors, Screen, spacing, typography } from '@/design';
import type { LiftFamily } from '@/domain/e1rm';
import { chineseMonthDay, formatKg, utcDateText } from '@/features/dashboard/model';

import { E1RMChart } from './E1RMChart';
import { LIFT_PRESENTATION } from './model';
import { useHistoryViewModel } from './use-history';

function resolveFamily(family: string | undefined, lift: string | undefined): LiftFamily {
  if (family === 'squat' || family === 'bench' || family === 'deadlift') return family;
  if (lift === '卧推') return 'bench';
  if (lift === '硬拉') return 'deadlift';
  return 'squat';
}

export function GrowthCurveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ family?: string; lift?: string }>();
  const studentId = useSessionStore((state) => state.user?.id ?? '');
  const vm = useHistoryViewModel(studentId);
  const family = resolveFamily(params.family, params.lift);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="返回"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}>
          <MaterialCommunityIcons color={colors.fgPrimary} name="arrow-left" size={26} />
        </Pressable>
        <Text style={styles.title}>成长曲线</Text>
        <View style={styles.headerSpacer} />
      </View>

      {vm.state.status === 'idle' || vm.state.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.fgTertiary} size="large" />
        </View>
      ) : vm.state.status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>加载失败</Text>
          <AppButton label="重试" onPress={() => void vm.reload()} style={styles.retryButton} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.liftName}>{LIFT_PRESENTATION[family].name}</Text>
          <Text style={styles.explainer}>E1RM = 用你完成的组数估算的单次最大重量</Text>
          <Card style={styles.chartCard}>
            <Text style={styles.period}>
              {LIFT_PRESENTATION[family].name} E1RM · {vm.state.curves[family].periodLabel}
            </Text>
            <View style={styles.numberRow}>
              <Text style={styles.number}>
                {vm.state.curves[family].point
                  ? formatKg(vm.state.curves[family].point.valueKg)
                  : '—'}
              </Text>
              {vm.state.curves[family].point ? <Text style={styles.unit}>KG</Text> : null}
            </View>
            <E1RMChart curve={vm.state.curves[family]} height={240} />
          </Card>

          <Text style={styles.sectionTitle}>纪录点</Text>
          <Card style={styles.recordsCard}>
            {vm.state.curves[family].series.records.length === 0 ? (
              <Text style={styles.empty}>练几次就有趋势了</Text>
            ) : (
              [...vm.state.curves[family].series.records]
                .reverse()
                .map((record, index, records) => (
                  <View
                    key={record.sampleId}
                    style={[styles.recordRow, index < records.length - 1 && styles.recordBorder]}>
                    <Text style={styles.recordDate}>
                      {chineseMonthDay(utcDateText(record.date))}
                    </Text>
                    <Text style={styles.recordValue}>{formatKg(record.valueKg)} KG</Text>
                  </View>
                ))
            )}
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  title: { color: colors.fgPrimary, flex: 1, textAlign: 'center', ...typography.headline },
  headerSpacer: { width: 26 },
  center: { alignItems: 'center', flex: 1, gap: spacing.base, justifyContent: 'center', padding: spacing.lg },
  errorTitle: { color: colors.fgPrimary, ...typography.headline },
  retryButton: { minWidth: 128 },
  content: { gap: spacing.base, padding: spacing.base, paddingBottom: spacing.xxl },
  liftName: { color: colors.fgPrimary, fontSize: 34, fontWeight: '800', lineHeight: 38 },
  explainer: { color: colors.fgSecondary, ...typography.footnote },
  chartCard: { gap: spacing.sm, padding: spacing.base },
  period: { color: colors.fgSecondary, ...typography.footnote },
  numberRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
  number: { color: colors.fgPrimary, ...typography.displayNumeral },
  unit: { color: colors.fgPrimary, ...typography.displayUnit },
  sectionTitle: { color: colors.fgPrimary, marginTop: spacing.sm, ...typography.headline },
  recordsCard: { paddingHorizontal: spacing.base },
  empty: { color: colors.fgTertiary, paddingVertical: spacing.lg, textAlign: 'center', ...typography.footnote },
  recordRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52 },
  recordBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  recordDate: { color: colors.fgSecondary, ...typography.footnote },
  recordValue: { color: colors.fgPrimary, fontVariant: ['tabular-nums'], ...typography.bodyEmphasis },
});
