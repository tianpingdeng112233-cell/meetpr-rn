import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { AppButton, useColors, type Colors, font, radius } from '@/design';
import { RewardShimmer } from '@/design/TrainingRewardMotion';
import { GradientFill } from '@/design/GradientFill';
import type { SessionReflection } from './model';
import type { WorkoutCompletionPresentation } from './completion-presentation';
import { WorkoutCelebrationView } from './WorkoutCelebrationView';
import { saveErrorCopy } from './save-errors';

export function DayCompletionBanner({ count, onPress }: { count: number; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('student.dayCompletionBanner.copy003', [count])}
      onPress={onPress}
      style={({ pressed }) => [styles.banner, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <RewardShimmer />
      <MaterialCommunityIcons color={colors.success} name="check-decagram" size={22} />
      <Text style={styles.bannerTitle}>{t('student.dayCompletionBanner.copy001', [count])}</Text>
      <View style={styles.bannerSpacer} />
      <Text style={styles.reviewLink}>{t('student.dayCompletionBanner.copy002')}</Text>
      <MaterialCommunityIcons color={colors.textSecondary} name="chevron-right" size={11} />
    </Pressable>
  );
}

export type WorkoutCompletionFlowPhase = 'celebration' | 'review';

export function WorkoutCompletionFlowView({ presentation, initialPhase, initialReflection, onReflectionChange, onFinish }: {
  presentation: WorkoutCompletionPresentation;
  initialPhase: WorkoutCompletionFlowPhase;
  initialReflection?: SessionReflection;
  onReflectionChange: (reflection: SessionReflection) => Promise<void>;
  onFinish: (reflection: SessionReflection) => Promise<void>;
}) {
  const colors = useColors();
  const [phase, setPhase] = useState(initialPhase);
  const [reflection, setReflection] = useState(initialReflection ?? { goal: '', achieved: '', improve: '' });
  const [saving, setSaving] = useState(false);
  const finishing = useRef(false);
  const pendingWrites = useRef(Promise.resolve());
  const showSaveError = (error: unknown) => Alert.alert(t('student.todayWorkoutScreen.copy001'), saveErrorCopy(error));
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setSaving(true);
    try {
      await pendingWrites.current;
      await onFinish(reflection);
    } catch (error) {
      showSaveError(error);
      finishing.current = false;
      setSaving(false);
    }
  };
  const changeReflection = (next: SessionReflection) => {
    setReflection(next);
    // An older slow autosave must not overwrite newer text or completedAt.
    pendingWrites.current = pendingWrites.current.then(() => onReflectionChange(next)).catch(showSaveError);
  };
  return (
    <Modal animationType="none" presentationStyle="fullScreen" visible onRequestClose={() => void finish()}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }}>
        {phase === 'celebration'
          ? <WorkoutCelebrationView presentation={presentation} streak={null} saving={saving} onOpenReview={() => setPhase('review')} onFinish={() => void finish()} />
          : <SessionSummaryView presentation={presentation} reflection={reflection} onReflectionChange={changeReflection} onFinish={() => void finish()} saving={saving} />}
      </SafeAreaView>
    </Modal>
  );
}

export function SessionSummaryView({ presentation, reflection, onReflectionChange, onFinish, saving }: {
  presentation: WorkoutCompletionPresentation;
  reflection: SessionReflection;
  onReflectionChange: (reflection: SessionReflection) => void;
  onFinish: () => void;
  saving: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.summaryRoot}>
      <View style={styles.summaryNav}>
        <View style={styles.headingCopy}><Text style={styles.summaryNavTitle}>{t('student.sessionSummaryView.copy003')}</Text><Text style={styles.subtitle}>{presentation.dateSubtitle}</Text></View>
        <Text style={styles.notified}>{t('student.sessionSummaryView.copy004')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.summaryContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.volumeCard}>
          <GradientFill direction="vertical" stops={[{ color: colors.reviewHeroTop, offset: 0 }, { color: colors.surfaceCard, offset: 1 }]} />
          <Text style={styles.volumeLabel}>{t('student.sessionSummaryView.copy005')}</Text>
          <View style={styles.volumeRow}>
            <Text style={styles.volumeValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{presentation.totalVolumeText}</Text>
            <Text style={styles.unit}>kg</Text><View style={styles.spacer} />
            <Text style={styles.comparison}>{presentation.volumeComparisonText}</Text>
          </View>
          <View style={styles.stats}>
            {([
              [presentation.exerciseCount, 'student.sessionSummaryView.copy006'],
              [presentation.completedSetCount, 'student.sessionSummaryView.copy007'],
              [presentation.totalReps, 'student.sessionSummaryView.copy008'],
              [presentation.averageRPEText, 'student.sessionSummaryView.copy009'],
            ] as const).map(([value, key]) => <View style={styles.stat} key={key}><Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Text><Text style={styles.statLabel} numberOfLines={1}>{t(key)}</Text></View>)}
          </View>
        </View>
        {presentation.hasPersonalRecord ? <View style={styles.record}><MaterialCommunityIcons name="crown" size={18} color={colors.gold500} /><Text style={styles.recordText}>{presentation.personalRecordText}</Text></View> : null}
        <View style={styles.section}><Text style={styles.sectionTitle}>{t('student.sessionSummaryView.copy001')}</Text><View style={styles.rule} /></View>
        <View style={styles.performances}>
          {presentation.exercises.map(exercise => <View key={exercise.id} style={styles.performance}>
            <View style={styles.exerciseCopy}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.bestSet}>{t('student.sessionSummaryView.copy010', [exercise.bestSetText])}</Text></View>
            {exercise.isPersonalRecord ? <Text style={styles.prBadge}>PR</Text> : null}
            <Text style={[styles.status, { color: exercise.failedSetCount > 0 ? colors.danger : colors.success }]}>{exercise.statusText}</Text>
          </View>)}
        </View>
        <View style={[styles.section, { marginTop: 2 }]}>
          <Text style={styles.sectionTitle}>{t('student.sessionSummaryView.copy011')}</Text><View style={styles.rule} />
          <View style={styles.privacy}><MaterialCommunityIcons name="lock" size={10} color={colors.textDim} /><Text style={styles.privateNote}>{t('student.sessionSummaryView.copy012')}</Text></View>
        </View>
        <View style={styles.reflections}>
          {([
            ['goal', 'student.sessionSummaryView.copy013', 'student.sessionSummaryView.copy014'],
            ['achieved', 'student.sessionSummaryView.copy015', 'student.sessionSummaryView.copy016'],
            ['improve', 'student.sessionSummaryView.copy017', 'student.sessionSummaryView.copy018'],
          ] as const).map(([key, label, placeholder], index) => <View key={key} style={[styles.reflectionField, index < 2 && styles.fieldDivider]}>
            <Text style={styles.reflectionLabel}>{t(label)}</Text>
            <TextInput multiline editable={!saving} accessibilityLabel={t(label)} onChangeText={value => onReflectionChange({ ...reflection, [key]: value })} placeholder={t(placeholder)} placeholderTextColor={colors.textMuted} style={styles.reflectionInput} value={reflection[key]} />
          </View>)}
        </View>
      </ScrollView>
      <View style={styles.footer}><AppButton variant="primary" label={t('student.sessionSummaryView.copy002')} onPress={onFinish} loading={saving} /></View>
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  banner: { overflow: 'hidden', alignItems: 'center', backgroundColor: `${colors.successRGB}24`, borderColor: `${colors.successRGB}66`, borderWidth: 1, borderRadius: radius.control, flexDirection: 'row', gap: 10, padding: 16 },
  bannerSpacer: { flexGrow: 1 },
  bannerTitle: { color: colors.textPrimary, ...font.body(16, 'bold'), flexShrink: 1 },
  reviewLink: { color: colors.textSecondary, ...font.body(13) },
  summaryRoot: { backgroundColor: colors.bgBase, flex: 1 },
  summaryNav: { alignItems: 'center', borderBottomColor: colors.borderHairline, borderBottomWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 13 },
  headingCopy: { flex: 1, gap: 2 },
  summaryNavTitle: { color: colors.textPrimary, ...font.display(17) },
  subtitle: { color: colors.textMuted, ...font.mono(11) },
  notified: { color: colors.success, ...font.mono(11, 'bold'), letterSpacing: 0.55, backgroundColor: `${colors.successRGB}29`, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, overflow: 'hidden' },
  summaryContent: { gap: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  volumeCard: { borderColor: `${colors.goldRGB}40`, borderWidth: 1, borderRadius: radius.card, overflow: 'hidden', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 15 },
  volumeLabel: { color: colors.goldText, ...font.mono(11, 'semibold'), letterSpacing: 0.88 },
  volumeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 5 },
  volumeValue: { color: colors.textPrimary, ...font.display(46), flexShrink: 1 },
  unit: { color: colors.textMuted, ...font.body(14, 'bold') },
  spacer: { flex: 1 },
  comparison: { color: colors.success, ...font.mono(12), flexShrink: 1 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 15 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 9, gap: 2, backgroundColor: colors.medalStatTile, borderRadius: radius.control },
  statValue: { color: colors.textPrimary, ...font.display(19) },
  statLabel: { color: colors.textMuted, ...font.body(10) },
  record: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: `${colors.goldRGB}1A`, borderColor: `${colors.goldRGB}59`, borderWidth: 1, borderRadius: radius.control },
  recordText: { color: colors.goldText, ...font.body(13, 'bold'), flexShrink: 1 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionTitle: { color: colors.textMuted, ...font.mono(11) },
  rule: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  performances: { backgroundColor: colors.surfaceCard, borderRadius: radius.card, overflow: 'hidden' },
  performance: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 13, borderTopColor: colors.borderSubtle, borderTopWidth: 1 },
  exerciseCopy: { flex: 1, gap: 3 },
  exerciseName: { color: colors.textPrimary, ...font.body(14, 'bold') },
  bestSet: { color: colors.textFaint, ...font.mono(11) },
  prBadge: { color: colors.goldText, ...font.mono(10, 'bold'), borderColor: `${colors.goldRGB}66`, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  status: { ...font.mono(11), flexShrink: 1 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  privateNote: { color: colors.textDim, ...font.body(10), flexShrink: 1 },
  reflections: { backgroundColor: colors.surfaceCard, borderRadius: radius.card, paddingHorizontal: 15, paddingVertical: 4 },
  reflectionField: { paddingVertical: 11, gap: 6 },
  fieldDivider: { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 },
  reflectionLabel: { color: colors.textPrimary, ...font.body(13, 'bold') },
  reflectionInput: { color: colors.textSecondary, ...font.body(13), lineHeight: 19, minHeight: 19, maxHeight: 76, padding: 0, textAlignVertical: 'top' },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopColor: colors.borderHairline, borderTopWidth: 1 },
});
