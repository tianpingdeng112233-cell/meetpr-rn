import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { AppButton, Card, useColors, type Colors, font, radius, spacing, typography } from '@/design';

import type { SessionReflection, WorkoutSetDraft } from './model';
import { isDraftTerminal } from './drafts';
import { parseFiniteDecimal } from './policy';

export function DayCompletionBanner({ count, onPress }: { count: number; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('student.dayCompletionBanner.copy003', [count])}
      onPress={onPress}
      style={styles.banner}
    >
      <MaterialCommunityIcons color={colors.success} name="check-decagram" size={22} />
      <Text style={styles.bannerTitle}>{t('student.dayCompletionBanner.copy001', [count])}</Text>
      <View style={styles.bannerSpacer} />
      <Text style={styles.reviewLink}>{t('student.dayCompletionBanner.copy002')}</Text>
      <MaterialCommunityIcons color={colors.textSecondary} name="chevron-right" size={11} />
    </Pressable>
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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <View style={styles.summaryNav}><Text style={styles.summaryNavTitle}>{t('student.sessionSummaryView.copy003')}</Text><Pressable onPress={onClose}><Text style={styles.done}>{t('student.readinessCheckinSheet.copy018')}</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.summaryContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.summaryHero}>{t('student.workoutCompletionFlowView.copy001')}</Text>
          <Card style={styles.overview}>
            {[[t('student.progression.completedSets'), String(completed.length)], [t('student.sessionSummaryView.copy008'), String(totalReps)], [t('student.sessionSummaryView.copy005'), `${Math.round(totalVolume)} kg`], [t('student.sessionSummaryView.copy009'), averageRPE === null ? '—' : averageRPE.toFixed(1)]].map(([label, value]) => (
              <View key={label} style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>
            ))}
          </Card>
          <Text style={styles.sectionTitle}>{t('student.sessionSummaryView.copy001')}</Text>
          <Card style={styles.performance}><Text style={styles.performanceLabel}>{t('student.sessionSummaryView.copy010', ['']).trimEnd()}</Text><Text style={styles.performanceValue}>{heaviest ? `${heaviest.weightText}kg × ${heaviest.repsText}` : '—'}</Text></Card>
          <View><Text style={styles.sectionTitle}>{t('student.sessionSummaryView.copy011')}</Text><Text style={styles.privateNote}>🔒 {t('student.progression.privateNote')}</Text></View>
          {([
            ['goal', t('student.sessionSummaryView.copy013'), t('student.sessionSummaryView.copy014')],
            ['achieved', t('student.sessionSummaryView.copy015'), t('student.sessionSummaryView.copy016')],
            ['improve', t('student.sessionSummaryView.copy017'), t('student.sessionSummaryView.copy018')],
          ] as const).map(([key, label, placeholder]) => (
            <Card key={key} style={styles.reflectionCard}><Text style={styles.performanceLabel}>{label}</Text><TextInput multiline onChangeText={(value) => setReflection((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={colors.textTertiary} style={styles.reflectionInput} value={reflection[key]} /></Card>
          ))}
          <AppButton
            disabled={saving}
            label={saving ? t('student.progression.saving') : t('student.readinessCheckinSheet.copy018')}
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

const createStyles = (colors: Colors) => StyleSheet.create({
  slider: { backgroundColor: colors.success, borderColor: colors.success, borderRadius: radius.pill, borderWidth: 1, height: 58, justifyContent: 'center', overflow: 'hidden' },
  sliderLabel: { color: '#FFFFFF', textAlign: 'center', ...typography.bodyEmphasis },
  sliderThumb: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: radius.pill, height: 50, justifyContent: 'center', position: 'absolute', width: 50 },
  banner: { alignItems: 'center', backgroundColor: `${colors.success}24`, borderColor: `${colors.success}66`, borderWidth: 1, borderRadius: radius.control, flexDirection: 'row', gap: 10, padding: 16 },
  bannerSpacer: { flexGrow: 1 },
  bannerTitle: { color: colors.textPrimary, ...font.body(16, 'bold'), flexShrink: 1 },
  reviewLink: { color: colors.textSecondary, ...font.body(13) },
  summaryRoot: { backgroundColor: colors.bgBase, flex: 1 },
  summaryNav: { alignItems: 'center', borderBottomColor: colors.borderDefault, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.base },
  summaryNavTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
  done: { color: colors.textPrimary, ...typography.bodyEmphasis },
  summaryContent: { gap: spacing.base, padding: spacing.base, paddingBottom: spacing.xxl },
  summaryHero: { color: colors.textPrimary, ...typography.title1 },
  overview: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm },
  metric: { padding: spacing.md, width: '50%' },
  metricValue: { color: colors.textPrimary, ...typography.headline },
  metricLabel: { color: colors.textSecondary, marginTop: spacing.xs, ...typography.caption },
  sectionTitle: { color: colors.textPrimary, ...typography.headline },
  performance: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.base },
  performanceLabel: { color: colors.textSecondary, ...typography.footnote },
  performanceValue: { color: colors.textPrimary, ...typography.bodyEmphasis },
  privateNote: { color: colors.textTertiary, marginTop: spacing.xs, ...typography.footnote },
  reflectionCard: { gap: spacing.sm, padding: spacing.base },
  reflectionInput: { color: colors.textPrimary, minHeight: 72, textAlignVertical: 'top', ...typography.body },
});
