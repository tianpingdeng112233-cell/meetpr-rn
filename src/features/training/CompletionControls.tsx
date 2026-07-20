import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, Card, colors, radius, spacing, typography } from '@/design';

import { TRAINING_LIMITS } from './constants';
import type { SessionReflection, WorkoutSetDraft } from './model';
import { isDraftTerminal } from './drafts';
import { parseFiniteDecimal } from './policy';

export function SlideToCompleteButton({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [width, setWidth] = useState(1);
  const pan = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => setProgress(Math.max(0, Math.min(1, gesture.dx / Math.max(1, width - 56)))),
      onPanResponderRelease: (_, gesture) => {
        const releasedProgress = Math.max(
          0,
          Math.min(1, gesture.dx / Math.max(1, width - 56)),
        );
        if (releasedProgress >= TRAINING_LIMITS.slideCompletionThreshold) onComplete();
        setProgress(0);
      },
      onPanResponderTerminate: () => setProgress(0),
    }),
    [onComplete, width],
  );
  return (
    <View
      {...pan.panHandlers}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.slider}>
      <Text style={styles.sliderLabel}>滑动完成今日训练</Text>
      <View style={[styles.sliderThumb, { left: progress * Math.max(0, width - 56) }]}>
        <MaterialCommunityIcons color={colors.green} name="chevron-double-right" size={24} />
      </View>
    </View>
  );
}

export function DayCompletionBanner({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Card style={styles.banner}>
      <View style={styles.bannerCopy}>
        <MaterialCommunityIcons color={colors.green} name="check-decagram" size={22} />
        <Text style={styles.bannerTitle}>今日训练完成 · {count} 组</Text>
      </View>
      <Pressable onPress={onPress}><Text style={styles.reviewLink}>查看回顾</Text></Pressable>
    </Card>
  );
}

export function SessionSummaryView({
  drafts,
  onClose,
  onComplete,
  initialReflection,
}: {
  drafts: readonly WorkoutSetDraft[];
  initialReflection?: SessionReflection;
  onClose: () => void;
  onComplete: (reflection: SessionReflection) => Promise<void>;
}) {
  const [reflection, setReflection] = useState<SessionReflection>(initialReflection ?? { goal: '', achieved: '', improve: '' });
  const [saving, setSaving] = useState(false);
  const completed = drafts.filter(isDraftTerminal);
  const totalReps = completed.reduce((sum, draft) => sum + (Number(draft.repsText) || 0), 0);
  const totalVolume = completed.reduce((sum, draft) => sum + (parseFiniteDecimal(draft.weightText) ?? 0) * (Number(draft.repsText) || 0), 0);
  const rpes = completed.map((draft) => parseFiniteDecimal(draft.rpeText)).filter((value): value is number => value !== null);
  const averageRPE = rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : null;
  const heaviest = completed.reduce<WorkoutSetDraft | null>((best, draft) => !best || (parseFiniteDecimal(draft.weightText) ?? 0) > (parseFiniteDecimal(best.weightText) ?? 0) ? draft : best, null);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <SafeAreaView style={styles.summaryRoot}>
        <View style={styles.summaryNav}><Text style={styles.summaryNavTitle}>训练回顾</Text><Pressable onPress={onClose}><Text style={styles.done}>完成</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.summaryContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.summaryHero}>今日训练完成</Text>
          <Card style={styles.overview}>
            {[['完成组数', String(completed.length)], ['总次数', String(totalReps)], ['总容量', `${Math.round(totalVolume)} kg`], ['平均 RPE', averageRPE === null ? '—' : averageRPE.toFixed(1)]].map(([label, value]) => (
              <View key={label} style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>
            ))}
          </Card>
          <Text style={styles.sectionTitle}>动作表现</Text>
          <Card style={styles.performance}><Text style={styles.performanceLabel}>最重组</Text><Text style={styles.performanceValue}>{heaviest ? `${heaviest.weightText}kg × ${heaviest.repsText}` : '—'}</Text></Card>
          <View><Text style={styles.sectionTitle}>训练反思</Text><Text style={styles.privateNote}>🔒 仅自己可见的训练笔记,保存在本机</Text></View>
          {([
            ['goal', '本次目标', '这次训练你想达成什么?'],
            ['achieved', '做到了什么', '这次训练有哪些收获?'],
            ['improve', '可以更好', '哪里还能做得更好?'],
          ] as const).map(([key, label, placeholder]) => (
            <Card key={key} style={styles.reflectionCard}><Text style={styles.performanceLabel}>{label}</Text><TextInput multiline onChangeText={(value) => setReflection((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={colors.fgTertiary} style={styles.reflectionInput} value={reflection[key]} /></Card>
          ))}
          <AppButton
            disabled={saving}
            label={saving ? '保存中…' : '完成'}
            onPress={() => {
              setSaving(true);
              void onComplete(reflection).finally(() => setSaving(false));
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slider: { backgroundColor: colors.green, borderColor: colors.green, borderRadius: radius.pill, borderWidth: 1, height: 58, justifyContent: 'center', overflow: 'hidden' },
  sliderLabel: { color: '#FFFFFF', textAlign: 'center', ...typography.bodyEmphasis },
  sliderThumb: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: radius.pill, height: 50, justifyContent: 'center', position: 'absolute', width: 50 },
  banner: { alignItems: 'center', backgroundColor: colors.greenSoft, borderColor: 'rgba(31,179,88,0.4)', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.base },
  bannerCopy: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  bannerTitle: { color: colors.green, ...typography.bodyEmphasis },
  reviewLink: { color: colors.fgPrimary, ...typography.footnote },
  summaryRoot: { backgroundColor: colors.bg, flex: 1 },
  summaryNav: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.base },
  summaryNavTitle: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  done: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  summaryContent: { gap: spacing.base, padding: spacing.base, paddingBottom: spacing.xxl },
  summaryHero: { color: colors.fgPrimary, ...typography.title1 },
  overview: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm },
  metric: { padding: spacing.md, width: '50%' },
  metricValue: { color: colors.fgPrimary, ...typography.headline },
  metricLabel: { color: colors.fgSecondary, marginTop: spacing.xs, ...typography.caption },
  sectionTitle: { color: colors.fgPrimary, ...typography.headline },
  performance: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.base },
  performanceLabel: { color: colors.fgSecondary, ...typography.footnote },
  performanceValue: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  privateNote: { color: colors.fgTertiary, marginTop: spacing.xs, ...typography.footnote },
  reflectionCard: { gap: spacing.sm, padding: spacing.base },
  reflectionInput: { color: colors.fgPrimary, minHeight: 72, textAlignVertical: 'top', ...typography.body },
});
