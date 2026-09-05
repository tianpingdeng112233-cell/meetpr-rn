import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getLocale, t } from '@/i18n';
import { useMarkFeedbackRead, type FeedbackItem } from '@/api/domains';
import { useSessionStore } from '@/api/session';
import { AnalyticsEvent, AnalyticsScreen, screen, track } from '@/analytics';
import {
  AppButton,
  Card,
  useColors,
  StatTile,
  font,
  radius,
  Screen,
  spacing,
  typography,
} from '@/design';
import { formatKg } from '@/features/dashboard/model';
import { useOpenCoachChat } from '@/features/chat/open-coach-chat';
import { useStudentTabsStore } from '@/features/student-tabs';

import { GrowthE1RMCard } from './GrowthE1RMCard';
import { GrowthScreenHeader } from './GrowthScreenHeader';
import { HistoryEntriesView } from './HistoryEntriesView';
import {
  feedbackDate,
  feedbackTitle,
  LIFT_FAMILIES,
} from './model';
import type { GrowthLoaded } from './types';
import { useHistoryViewModel } from './use-history';
import { VolumeIntensityChart } from './VolumeIntensityChart';

export function GrowthScreen() {
  const { colors, styles } = useStyles();
  const studentId = useSessionStore((state) => state.user?.id ?? '');
  const router = useRouter();
  const vm = useHistoryViewModel(studentId);
  const chat = useOpenCoachChat(studentId);
  const feedbackJumpToken = useStudentTabsStore((state) => state.feedbackJumpToken);
  const markFeedbackRead = useMarkFeedbackRead();
  const scrollRef = useRef<ScrollView>(null);
  const feedbackY = useRef<number | null>(null);
  const previousFeedbackToken = useRef(0);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [locallyRead, setLocallyRead] = useState<ReadonlySet<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      void screen(AnalyticsScreen.ProgressHistory);
      void track(AnalyticsEvent.ProgressViewed, { tab: 'e1rm' });
      void track(AnalyticsEvent.ProgressViewed, { tab: 'volume' });
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

  // iOS: the growth header's message button opens the coach conversation and badges unread chat messages.
  const header = <GrowthScreenHeader unreadCount={chat.totalUnread} onOpenChat={() => void chat.openCoachChat()} />;

  if (vm.state.status === 'idle' || vm.state.status === 'loading') {
    return <Screen accessibilityLabel={t('student.trainingHistoryView.copy021')} style={styles.content}>
      {header}
      {[0, 1, 2].map(index => <View key={index} style={{ height: 220, backgroundColor: colors.surfaceElevated, borderRadius: radius.card }} />)}
    </Screen>;
  }
  if (vm.state.status === 'error') {
    return <Screen style={styles.content}>
      {header}
      <Card style={styles.failureCard}>
        <Text style={styles.errorTitle}>{t('student.trainingHistoryView.copy022')}</Text>
        {vm.state.error instanceof Error ? <Text style={styles.explainer}>{vm.state.error.message}</Text> : null}
        <AppButton label={t('student.trainingHistoryView.copy023')} onPress={() => void vm.reload()} style={styles.retryButton} />
      </Card>
    </Screen>;
  }
  const data = vm.state;
  const isZeroTraining = data.stats.trainingSessionCount === 0;
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
            tintColor={colors.gold500}
          />
        }
        showsVerticalScrollIndicator={false}>
        {header}
        <View style={styles.curveList}>
          {LIFT_FAMILIES.map(family => <GrowthE1RMCard key={family} curve={data.curves[family]} isZeroTraining={isZeroTraining} onToday={() => router.navigate('/(student)/today')} />)}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('student.trainingHistoryView.copy001')}</Text>
          <View style={styles.statsRow}>
            <StatTile label={t('student.trainingHistoryView.copy015')} value={data.stats.sbdTotalKg === null ? '—' : formatKg(data.stats.sbdTotalKg)} unit="kg" style={styles.comparisonTile} />
            <StatTile label={t('student.trainingHistoryView.copy016')} value={data.stats.trainingTotalKg === null ? '—' : formatKg(data.stats.trainingTotalKg)} unit="kg" style={styles.comparisonTile} />
          </View>
          {data.stats.sbdTotalKg !== null && data.stats.trainingTotalKg !== null && data.stats.trainingTotalKg > 0 && data.stats.sbdTotalKg > data.stats.trainingTotalKg ? <Text style={styles.breakthrough}>{t('student.trainingHistoryView.copy017', [Math.round(data.stats.sbdTotalKg / data.stats.trainingTotalKg * 100)])}</Text> : null}
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
          <Text style={styles.sectionTitle}>{t('student.trainingHistoryView.copy002')}</Text>
          <GrowthNavigationCard title={t('student.trainingHistoryView.copy009')} subtitle={data.feedback.length ? t('student.trainingHistoryView.copy010', [data.feedback.length]) : t('student.trainingHistoryView.copy011')} icon="message-outline" disabled={data.feedback.length === 0} onPress={() => setArchiveOpen(true)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('student.trainingHistoryView.copy003')}</Text>
          <Card style={[styles.statsRow, { paddingHorizontal: spacing.space4, paddingVertical: spacing.space4, elevation: 0, shadowOpacity: 0 }]}>
            <StatCard label={t('student.trainingHistoryView.copy018')} value={isZeroTraining ? '—' : String(data.stats.trainingSessionCount)} dimmed={isZeroTraining} />
            <StatCard label={t('student.trainingHistoryView.copy019')} value={isZeroTraining ? '—' : String(data.stats.trainingWeekCount)} dimmed={isZeroTraining} />
            <StatCard label={t('student.trainingHistoryView.copy020')} value={isZeroTraining ? '—' : data.stats.totalVolumeKg.toLocaleString(getLocale(), { maximumFractionDigits: 0 })} unit="kg" dimmed={isZeroTraining} />
          </Card>
          <GrowthNavigationCard title={t('student.trainingHistoryView.copy004')} subtitle={t(isZeroTraining ? 'student.trainingHistoryView.copy005' : 'student.trainingHistoryView.copy006')} icon="clock-outline" disabled={isZeroTraining} onPress={() => { void track(AnalyticsEvent.ProgressViewed, { tab: 'history' }); setHistoryOpen(true); }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('student.trainingHistoryView.copy008')}</Text>
          <Card style={styles.volumeCard}>
            <VolumeIntensityChart series={data.volumeIntensity} isUnlocked={data.stats.unlocksTrends} />
          </Card>
        </View>
      </ScrollView>

      <Modal animationType="slide" presentationStyle="fullScreen" visible={archiveOpen && selectedFeedback === null} onRequestClose={() => setArchiveOpen(false)}>
        <Screen style={styles.detailScreen}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{t('student.trainingHistoryView.copy009')}</Text>
            <Pressable accessibilityRole="button" onPress={() => setArchiveOpen(false)}><Text style={styles.detailDone}>{t('student.workoutCompletionFlowView.copy003')}</Text></Pressable>
          </View>
          <ScrollView><Card style={styles.feedbackList}>{data.feedback.map((item, index) => <FeedbackRow data={data} item={item} key={item.id} last={index === data.feedback.length - 1} locallyRead={locallyRead.has(item.id)} onPress={() => openFeedback(item)} />)}</Card></ScrollView>
        </Screen>
      </Modal>
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

function GrowthNavigationCard({ title, subtitle, icon, disabled, onPress }: { title: string; subtitle: string; icon: 'clock-outline' | 'message-outline'; disabled: boolean; onPress: () => void }) {
  const { colors, styles } = useStyles();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}>
    {({ pressed }) => <Card style={[styles.historyEntry, disabled && { opacity: 0.55 }, pressed && styles.pressed]}>
      <View style={styles.historyIcon}><MaterialCommunityIcons color={colors.gold500} name={icon} size={19} /></View>
      <View style={styles.historyText}><Text style={styles.historyTitle}>{title}</Text><Text style={styles.historySubtitle}>{subtitle}</Text></View>
      <MaterialCommunityIcons color={colors.textDim} name="chevron-right" size={14} />
    </Card>}
  </Pressable>;
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
  const { colors, styles } = useStyles();
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
        <MaterialCommunityIcons color={colors.textMuted} name="chevron-right" size={20} />
      </View>
    </Pressable>
  );
}

function StatCard({ label, value, unit, dimmed }: { label: string; value: string; unit?: string; dimmed: boolean }) {
  const { colors, styles } = useStyles();
  return <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={styles.statValueRow}>
      <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={[styles.statValue, dimmed && { color: colors.textDim }]}>{value}</Text>
      {unit ? <Text style={[styles.statUnit, dimmed && { color: colors.textDim }]}>{unit}</Text> : null}
    </View>
  </View>;
}

function FeedbackDetail({
  item,
  onClose,
}: {
  item: FeedbackItem | null;
  onClose: () => void;
}) {
  const { styles } = useStyles();
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={item !== null}>
      <Screen style={styles.detailScreen}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{t('student.feedbackDetailView.copy001')}</Text>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}>
            <Text style={styles.detailDone}>{t('student.workoutCompletionFlowView.copy003')}</Text>
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

function useStyles() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return { colors, styles };
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  failureCard: { gap: 14, padding: 20 },
  comparisonTile: { flex: 1, padding: 12, gap: 8 },
  breakthrough: { color: colors.success, ...typography.footnote },
  errorTitle: { color: colors.textPrimary, ...typography.headline },
  retryButton: { minWidth: 128 },
  content: { gap: 14, paddingHorizontal: spacing.pageHorizontal, paddingTop: 6, paddingBottom: 28 },
  pressed: { opacity: 0.6 },
  explainer: { color: colors.textSecondary, ...typography.footnote },
  curveList: { gap: 14 },
  section: { gap: 14, marginTop: spacing.space2 },
  sectionTitle: { color: colors.textSecondary, ...font.mono(13) },
  feedbackList: { overflow: 'hidden', paddingHorizontal: spacing.base },
  feedbackRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', minHeight: 78, paddingVertical: spacing.md },
  feedbackBorder: { borderBottomColor: colors.borderDefault, borderBottomWidth: StyleSheet.hairlineWidth },
  feedbackLead: { alignItems: 'flex-start', flex: 1, flexDirection: 'row', gap: spacing.sm },
  unreadDot: { backgroundColor: colors.dangerFill, borderRadius: radius.pill, height: 8, marginTop: 6, width: 8 },
  feedbackText: { flex: 1, gap: spacing.xs },
  feedbackTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
  feedbackPreview: { color: colors.textSecondary, ...typography.footnote },
  feedbackMeta: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  feedbackDate: { color: colors.textMuted, ...typography.caption },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { alignItems: 'flex-start', flex: 1, gap: spacing.space1 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, maxWidth: '100%' },
  statValue: { color: colors.textPrimary, ...font.mono(30, 'bold'), flexShrink: 1 },
  statUnit: { color: colors.textMuted, ...font.mono(12, 'semibold') },
  statLabel: { color: colors.textMuted, ...font.body(11) },
  historyEntry: { alignItems: 'center', flexDirection: 'row', gap: spacing.space3, paddingVertical: 14, paddingHorizontal: 15, minHeight: 68, elevation: 0, shadowOpacity: 0 },
  historyIcon: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.control, height: 40, justifyContent: 'center', width: 40 },
  historyText: { flex: 1, gap: 2 },
  historyTitle: { color: colors.textPrimary, ...font.body(15, 'bold') },
  historySubtitle: { color: colors.textMuted, ...font.body(12) },
  volumeCard: { paddingHorizontal: 14, paddingTop: 15, paddingBottom: spacing.space3 },
  detailScreen: { paddingHorizontal: spacing.base },
  detailHeader: { alignItems: 'center', borderBottomColor: colors.borderDefault, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.base },
  detailTitle: { color: colors.textPrimary, ...typography.headline },
  detailDone: { color: colors.textPrimary, ...typography.bodyEmphasis },
  detailBody: { gap: spacing.base, paddingVertical: spacing.lg },
  detailDate: { color: colors.textSecondary, ...typography.footnote },
  detailText: { color: colors.textPrimary, ...typography.body },
});
