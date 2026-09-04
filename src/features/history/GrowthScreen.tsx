import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMarkFeedbackRead, type FeedbackItem } from '@/api/domains';
import { useSessionStore } from '@/api/session';
import { AnalyticsScreen, screen } from '@/analytics';
import {
  AppButton,
  Card,
  colors,
  radius,
  Screen,
  spacing,
  typography,
} from '@/design';
import type { PRBreakthroughEvent } from '@/domain/e1rm';
import { chineseMonthDay, formatKg, utcDateText } from '@/features/dashboard/model';
import { useStudentTabsStore } from '@/features/student-tabs';

import { E1RMChart } from './E1RMChart';
import { HistoryEntriesView } from './HistoryEntriesView';
import {
  feedbackDate,
  feedbackTitle,
  LIFT_FAMILIES,
  LIFT_PRESENTATION,
} from './model';
import type { GrowthCurve, GrowthLoaded } from './types';
import { useHistoryViewModel } from './use-history';
import { VolumeIntensityChart } from './VolumeIntensityChart';

export function GrowthScreen() {
  const studentId = useSessionStore((state) => state.user?.id ?? '');
  const router = useRouter();
  const vm = useHistoryViewModel(studentId);
  const feedbackJumpToken = useStudentTabsStore((state) => state.feedbackJumpToken);
  const markFeedbackRead = useMarkFeedbackRead();
  const scrollRef = useRef<ScrollView>(null);
  const feedbackY = useRef<number | null>(null);
  const previousFeedbackToken = useRef(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [locallyRead, setLocallyRead] = useState<ReadonlySet<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      void screen(AnalyticsScreen.ProgressHistory);
    }, []),
  );

  useEffect(() => {
    if (
      feedbackJumpToken === 0 ||
      previousFeedbackToken.current === feedbackJumpToken ||
      feedbackY.current === null
    ) {
      return;
    }
    previousFeedbackToken.current = feedbackJumpToken;
    scrollRef.current?.scrollTo({ y: Math.max(0, feedbackY.current - spacing.base), animated: true });
  }, [feedbackJumpToken, vm.state.status]);

  if (vm.state.status === 'idle' || vm.state.status === 'loading') {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.fgTertiary} size="large" />
      </Screen>
    );
  }
  if (vm.state.status === 'error') {
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorTitle}>加载失败</Text>
        <AppButton label="重试" onPress={() => void vm.reload()} style={styles.retryButton} />
      </Screen>
    );
  }
  const data = vm.state;
  const openFeedback = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    if (item.read_at === null && !locallyRead.has(item.id)) {
      setLocallyRead((ids) => new Set(ids).add(item.id));
      void markFeedbackRead.mutateAsync(item.id).catch(() => undefined);
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            onRefresh={() => void vm.refresh()}
            refreshing={vm.isRefreshing}
            tintColor={colors.brandRed}
          />
        }
        showsVerticalScrollIndicator={false}>
        <Text style={styles.hero}>成长</Text>

        {data.prEvents[0] ? (
          <GrowthPRBanner
            data={data}
            event={data.prEvents[0]}
            onAcknowledge={() => void vm.acknowledgePR(data.prEvents[0].id)}
          />
        ) : null}

        <Text style={styles.explainer}>E1RM = 用你完成的组数估算的单次最大重量</Text>

        <View style={styles.curveList}>
          {LIFT_FAMILIES.map((family) => (
            <GrowthCurveCard
              curve={data.curves[family]}
              key={family}
              onPress={() =>
                router.push({
                  pathname: '/(student)/growth-curve',
                  params: { family, lift: data.curves[family].name },
                })
              }
            />
          ))}
        </View>

        <View
          onLayout={(event) => {
            feedbackY.current = event.nativeEvent.layout.y;
            if (
              feedbackJumpToken > 0 &&
              previousFeedbackToken.current !== feedbackJumpToken
            ) {
              previousFeedbackToken.current = feedbackJumpToken;
              requestAnimationFrame(() =>
                scrollRef.current?.scrollTo({
                  y: Math.max(0, event.nativeEvent.layout.y - spacing.base),
                  animated: true,
                }),
              );
            }
          }}
          style={styles.section}>
          <Text style={styles.sectionTitle}>教练反馈记录</Text>
          {data.feedback.length === 0 ? (
            <Card style={styles.inlineEmpty}>
              <Text style={styles.inlineEmptyText}>还没有教练反馈</Text>
            </Card>
          ) : (
            <Card style={styles.feedbackList}>
              {data.feedback.map((item, index) => (
                <FeedbackRow
                  data={data}
                  item={item}
                  key={item.id}
                  last={index === data.feedback.length - 1}
                  locallyRead={locallyRead.has(item.id)}
                  onPress={() => openFeedback(item)}
                />
              ))}
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>全部历史</Text>
          <View style={styles.statsRow}>
            <StatCard label="训练次数" value={String(data.stats.trainingDays)} />
            <StatCard label="训练周" value={String(data.stats.trainingWeeks)} />
            <StatCard
              label="三大项合计"
              value={
                data.stats.sbdTotalKg === null
                  ? '—'
                  : `${formatKg(data.stats.sbdTotalKg)} KG`
              }
            />
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => setHistoryOpen(true)}>
          {({ pressed }) => (
            <Card style={[styles.historyEntry, pressed && styles.pressed]}>
              <View style={styles.historyIcon}>
                <MaterialCommunityIcons color={colors.brandRed} name="history" size={23} />
              </View>
              <View style={styles.historyText}>
                <Text style={styles.historyTitle}>全部训练历史</Text>
                <Text style={styles.historySubtitle}>按周 / 月查看 · 含每组数据</Text>
              </View>
              <MaterialCommunityIcons color={colors.fgTertiary} name="chevron-right" size={23} />
            </Card>
          )}
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>容量 / 强度</Text>
          <Card style={styles.volumeCard}>
            <VolumeIntensityChart series={data.volumeIntensity} />
          </Card>
        </View>
      </ScrollView>

      <HistoryEntriesView
        onClose={() => setHistoryOpen(false)}
        visible={historyOpen}
        weeks={data.weeks}
      />
      <FeedbackDetail
        item={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
      />
    </Screen>
  );
}

function GrowthPRBanner({
  data,
  event,
  onAcknowledge,
}: {
  data: GrowthLoaded;
  event: PRBreakthroughEvent;
  onAcknowledge: () => void;
}) {
  const today = utcDateText(new Date());
  const occurred = utcDateText(event.occurredAt);
  const family = data.familyByExerciseId.get(event.exerciseId);
  const familyName = family ? LIFT_PRESENTATION[family].name : '三大项';
  return (
    <Pressable
      accessibilityHint="点按确认这条纪录"
      accessibilityRole="button"
      onPress={onAcknowledge}>
      {({ pressed }) => (
        <Card style={[styles.prBanner, pressed && styles.pressed]}>
          <View style={styles.prIcon}>
            <MaterialCommunityIcons color={colors.brandRed} name="trophy" size={25} />
          </View>
          <View style={styles.prText}>
            <Text style={styles.prEyebrow}>
              新 e1RM PR · {occurred === today ? '今天' : chineseMonthDay(occurred)}
            </Text>
            <Text style={styles.prTitle}>
              {familyName} e1RM 突破 {formatKg(event.breakthroughE1RMKg)} KG
            </Text>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

function GrowthCurveCard({
  curve,
  onPress,
}: {
  curve: GrowthCurve;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.curveCard, pressed && styles.pressed]}>
          <View style={styles.curveHeader}>
            <Text style={styles.curveTitle}>
              {curve.name} E1RM · {curve.periodLabel}
            </Text>
            <MaterialCommunityIcons color={colors.fgTertiary} name="chevron-right" size={22} />
          </View>
          <View style={styles.curveNumberRow}>
            <Text style={styles.curveNumber}>
              {curve.point ? formatKg(curve.point.valueKg) : '—'}
            </Text>
            {curve.point ? <Text style={styles.curveUnit}>KG</Text> : null}
          </View>
          <E1RMChart curve={curve} height={140} />
        </Card>
      )}
    </Pressable>
  );
}

function FeedbackRow({
  data,
  item,
  last,
  locallyRead,
  onPress,
}: {
  data: GrowthLoaded;
  item: FeedbackItem;
  last: boolean;
  locallyRead: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.feedbackRow,
        !last && styles.feedbackBorder,
        pressed && styles.pressed,
      ]}>
      <View style={styles.feedbackLead}>
        {item.read_at === null && !locallyRead ? <View style={styles.unreadDot} /> : null}
        <View style={styles.feedbackText}>
          <Text style={styles.feedbackTitle}>
            {feedbackTitle(item, data.plans, data.familyByPlanExerciseId)}
          </Text>
          <Text numberOfLines={2} style={styles.feedbackPreview}>{item.text}</Text>
        </View>
      </View>
      <View style={styles.feedbackMeta}>
        <Text style={styles.feedbackDate}>{feedbackDate(item)}</Text>
        <MaterialCommunityIcons color={colors.fgTertiary} name="chevron-right" size={20} />
      </View>
    </Pressable>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.statCard}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function FeedbackDetail({
  item,
  onClose,
}: {
  item: FeedbackItem | null;
  onClose: () => void;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={item !== null}>
      <Screen style={styles.detailScreen}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>教练反馈</Text>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}>
            <Text style={styles.detailDone}>完成</Text>
          </Pressable>
        </View>
        {item ? (
          <View style={styles.detailBody}>
            <Text style={styles.detailDate}>{feedbackDate(item)}</Text>
            <Text style={styles.detailText}>{item.text}</Text>
          </View>
        ) : null}
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.base, justifyContent: 'center', padding: spacing.lg },
  errorTitle: { color: colors.fgPrimary, ...typography.headline },
  retryButton: { minWidth: 128 },
  content: { gap: spacing.base, padding: spacing.base, paddingBottom: spacing.xxl },
  hero: { color: colors.fgPrimary, fontSize: 36, fontWeight: '900', lineHeight: 40 },
  pressed: { opacity: 0.6 },
  prBanner: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.base },
  prIcon: { alignItems: 'center', backgroundColor: colors.brandRedSoft, borderRadius: radius.pill, height: 46, justifyContent: 'center', width: 46 },
  prText: { flex: 1, gap: spacing.xs },
  prEyebrow: { color: colors.fgSecondary, ...typography.footnote },
  prTitle: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  explainer: { color: colors.fgSecondary, ...typography.footnote },
  curveList: { gap: spacing.md },
  curveCard: { gap: spacing.sm, padding: spacing.base },
  curveHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  curveTitle: { color: colors.fgSecondary, ...typography.footnote },
  curveNumberRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
  curveNumber: { color: colors.fgPrimary, ...typography.displayNumeral },
  curveUnit: { color: colors.fgPrimary, ...typography.displayUnit },
  section: { gap: spacing.md, marginTop: spacing.sm },
  sectionTitle: { color: colors.fgPrimary, ...typography.headline },
  inlineEmpty: { alignItems: 'center', padding: spacing.lg },
  inlineEmptyText: { color: colors.fgTertiary, ...typography.footnote },
  feedbackList: { overflow: 'hidden', paddingHorizontal: spacing.base },
  feedbackRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', minHeight: 78, paddingVertical: spacing.md },
  feedbackBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  feedbackLead: { alignItems: 'flex-start', flex: 1, flexDirection: 'row', gap: spacing.sm },
  unreadDot: { backgroundColor: colors.brandRed, borderRadius: radius.pill, height: 8, marginTop: 6, width: 8 },
  feedbackText: { flex: 1, gap: spacing.xs },
  feedbackTitle: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  feedbackPreview: { color: colors.fgSecondary, ...typography.footnote },
  feedbackMeta: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  feedbackDate: { color: colors.fgTertiary, ...typography.caption },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { alignItems: 'center', flex: 1, gap: spacing.sm, minHeight: 88, justifyContent: 'center', padding: spacing.sm },
  statValue: { color: colors.fgPrimary, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.fgSecondary, textAlign: 'center', ...typography.caption },
  historyEntry: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.base },
  historyIcon: { alignItems: 'center', backgroundColor: colors.brandRedSoft, borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42 },
  historyText: { flex: 1, gap: spacing.xs },
  historyTitle: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  historySubtitle: { color: colors.fgSecondary, ...typography.footnote },
  volumeCard: { padding: spacing.base },
  detailScreen: { paddingHorizontal: spacing.base },
  detailHeader: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.base },
  detailTitle: { color: colors.fgPrimary, ...typography.headline },
  detailDone: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  detailBody: { gap: spacing.base, paddingVertical: spacing.lg },
  detailDate: { color: colors.fgSecondary, ...typography.footnote },
  detailText: { color: colors.fgPrimary, ...typography.body },
});
