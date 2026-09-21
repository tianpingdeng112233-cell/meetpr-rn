import { CoachedSetLogRequestSchema } from '@/api/domains/sets';
import { gymDayText, formatWeight, normalizeDecimalInput, parseFiniteDecimal, plateLoadout } from './policy';
import { VideoAttachmentControls } from './video-upload/VideoAttachmentControls';
import { OverlayHostProvider, type OverlayHostHandle } from './OverlayHost';
import { decodePrescription } from '@/domain/plan/prescription';
import { entryPrefill } from './suggestion-gating';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Svg, { Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { AnalyticsEvent, track } from '@/analytics';
import { NumberPad, PlateVisual, useColors, type Colors, font, radius, spacing, typography } from '@/design';
import type { NumberPadField } from '@/design/number-pad';
import { SetEntryRPEScale } from './SetEntryRPEScale';
import { TRAINING_LIMITS } from './constants';
import type { WeightSuggestion, WorkoutSetDraft } from './model';
import { createWeightEntryState, weightEntryReducer } from './set-entry-weight';

type Props = {
  studentId: string;
  initialCamera?: boolean;
  ensureSetLog: (input: {
    stableSetId: string;
    weightText: string;
    repsText: string;
    rpeText: string;
    failed: boolean;
  }) => Promise<string>;
  collarOn: boolean;
  draft: WorkoutSetDraft;
  editable: boolean;
  exerciseName: string;
  suggestion: WeightSuggestion;
  suggestionReason: string | null;
  onChangeCollar: (value: boolean) => void;
  onClose: () => void;
  onSave: (input: {
    stableSetId: string;
    weightText: string;
    repsText: string;
    rpeText: string;
    failed: boolean;
  }) => Promise<void>;
};

function Stepper({ label, onChange, stepLabel, value, unit, onOpenPad, automatic = false, editable }: {
  label: string;
  onChange: (delta: number) => void;
  stepLabel: string;
  value: string;
  unit: string;
  onOpenPad: () => void;
  automatic?: boolean;
  editable: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const button = (direction: -1 | 1) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${direction < 0 ? '−' : '+'}`}
      disabled={!editable} onPress={() => onChange(direction)} style={styles.stepperButton}>
      <MaterialCommunityIcons color={colors.gold500} name={direction < 0 ? 'minus' : 'plus'} size={20} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.stepLabel}>{stepLabel}</Text>
      </View>
      <View style={styles.stepperRow}>
        {button(-1)}
        <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityValue={{ text: `${value} ${unit}` }}
          disabled={!editable} onPress={onOpenPad} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.valueBox}>
          {automatic && width > 0 ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg width={width} height={54}>
                <Rect x={0.75} y={0.75} width={width - 1.5} height={52.5} rx={radius.card}
                  fill="none" stroke={`${colors.gold500}73`} strokeWidth={1.5} strokeDasharray={[2, 3]} />
              </Svg>
            </View>
          ) : null}
          <View style={styles.valueContents}>
            <Text style={[styles.stepperValue, automatic && { color: colors.textSecondary }]}>{value || t('coach.videoFeedback.missingValue')}</Text>
            <Text style={styles.stepperUnit}>{unit}</Text>
          </View>
          {automatic ? <Text style={styles.automaticBadge}>{t('student.todayWorkoutTypes.copy027')}</Text> : null}
        </Pressable>
        {button(1)}
      </View>
    </View>
  );
}

export function SetEntrySheet({
  studentId,
  initialCamera,
  ensureSetLog,
  collarOn,
  draft,
  editable,
  exerciseName,
  onChangeCollar,
  onClose,
  onSave,
  suggestion,
  suggestionReason,
}: Props) {
  const overlayHost = useRef<OverlayHostHandle>(null);
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const prescription = decodePrescription(draft.planSet);
  const allowedSuggestion =
    !prescription.loadMode || prescription.intensity?.kind === 'pct'
      ? suggestion
      : null;
  const seed = entryPrefill(
    draft.planSet,
    draft.weightText || null,
    allowedSuggestion,
    draft.exercise.is_main_lift,
  );
  const initialWeight = createWeightEntryState(
    draft.weightText,
    allowedSuggestion,
  );
  initialWeight.weightText = seed;
  const [weightEntry, dispatchWeightEntry] = useReducer(
    weightEntryReducer,
    initialWeight,
  );
  const [repsText, setRepsText] = useState(draft.repsText);
  const [rpeText, setRpeText] = useState(draft.rpeText || '8');
  const [saving, setSaving] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const scrolledToVideo = useRef(false);
  const [numberPad, setNumberPad] = useState<NumberPadField | null>(null);
  const [showsRPEPlaceholder, setShowsRPEPlaceholder] = useState(prescription.intensity?.kind !== 'rpe');
  const { activeSuggestion, weightText } = weightEntry;

  useEffect(() => {
    dispatchWeightEntry({
      type: 'suggestionChanged',
      suggestion: allowedSuggestion,
    });
  }, [allowedSuggestion]);

  const validWeight =
    parseFiniteDecimal(weightText) !== null &&
    (parseFiniteDecimal(weightText) ?? -1) >= 0;
  const parsedWeight = parseFiniteDecimal(weightText) ?? 0;
  const loadout = plateLoadout(parsedWeight, collarOn);
  const rpe = parseFiniteDecimal(rpeText) ?? 8;
  const weightFloor = draft.exercise.is_main_lift ? 20 : 0;
  const isAutomatic = Boolean(activeSuggestion?.percentage) && !weightEntry.userEdited;
  const caption = suggestion?.percentage ? suggestion.label : suggestionReason
    ? prescription.intensity?.kind === 'pct' ? suggestionReason : t('student.setEntrySheet.copy002', [suggestionReason])
    : null;
  const changeRPE = useCallback((value: number) => {
    setRpeText(formatWeight(value));
    setShowsRPEPlaceholder(false);
  }, []);

  const updateWeight = (next: string) => {
    dispatchWeightEntry({ type: 'userChanged', value: next });
  };
  const save = async (failed: boolean) => {
    if (!editable || saving || !validWeight) return;
    setSaving(true);
    try {
      await onSave({
        stableSetId: draft.stableSetId,
        weightText: normalizeDecimalInput(weightText),
        repsText: repsText.trim(),
        rpeText: normalizeDecimalInput(rpeText),
        failed,
      });
    } catch {
      // Parent maps and presents canonical save errors; keep this sheet mounted.
    } finally {
      setSaving(false);
    }
  };
  const close = () => {
    overlayHost.current?.dismiss();
    void track(AnalyticsEvent.NavBack, { screen: 'set_entry' });
    onClose();
  };

  return (
    <Modal animationType="slide" visible transparent={false} onRequestClose={() => {
      if (overlayHost.current?.requestClose()) return;
      if (numberPad) setNumberPad(null);
      else close();
    }}>
      <OverlayHostProvider ref={overlayHost}>
        <SafeAreaView style={styles.root}>
          <View style={styles.root} importantForAccessibility={numberPad ? 'no-hide-descendants' : 'auto'}>
            <View style={styles.nav}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('student.setEntrySheet.copy006')} onPress={close} style={styles.backButton}>
                <MaterialCommunityIcons color={colors.textPrimary} name="arrow-left" size={26} />
              </Pressable>
              <Text numberOfLines={1} style={styles.navTitle}>{t('student.setEntrySheet.copy005', [exerciseName, draft.setIndex + 1])}</Text>
              <View style={styles.navSpacer} />
            </View>
            <ScrollView ref={scroll} contentContainerStyle={styles.content}
              onContentSizeChange={() => {
                if (initialCamera && !scrolledToVideo.current) {
                  scroll.current?.scrollToEnd({ animated: false });
                  scrolledToVideo.current = true;
                }
              }}>
              {draft.exercise.is_main_lift ? (
                <View style={styles.plateSection}>
                  <PlateVisual totalKg={parsedWeight} hasCollar={collarOn} height={108} />
                  <View style={styles.plateTop}>
                    <Text style={styles.plateDetail}>{loadout.detail}</Text>
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: collarOn }}
                      accessibilityLabel={t('student.setEntrySheet.copy007')} onPress={() => onChangeCollar(!collarOn)}
                      style={[styles.collar, collarOn && { borderColor: `${colors.gold500}73` }]}>
                      {collarOn ? <MaterialCommunityIcons name="check-circle" size={17} color={colors.gold500} /> : <View style={styles.collarCircle} />}
                      <Text style={[styles.collarText, collarOn && { color: colors.textPrimary }]}>{t('student.setEntrySheet.copy007')}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              <View style={styles.controls}>
                <View style={{ gap: spacing.space2 }}>
                  <Stepper label={t('student.setEntrySheet.copy001')} stepLabel="± 2.5" unit="KG" value={weightText}
                    editable={editable} automatic={isAutomatic} onOpenPad={() => setNumberPad('weight')}
                    onChange={direction => updateWeight(String(direction < 0 ? Math.max(weightFloor, parsedWeight - TRAINING_LIMITS.weightStepKg) : parsedWeight + TRAINING_LIMITS.weightStepKg))} />
                  {caption ? <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.caption}>{caption}</Text> : null}
                </View>
                <Stepper label={t('student.setEntrySheet.copy003')} stepLabel="± 1" unit={t('student.setEntrySheet.copy004')}
                  value={repsText} editable={editable} onOpenPad={() => setNumberPad('reps')}
                  onChange={direction => setRepsText(String(Math.max(0, (Number(repsText) || 0) + direction * TRAINING_LIMITS.repsStep)))} />
                <View style={styles.stepper}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>{t('chat.rpeMetric')}</Text>
                    <Text style={styles.stepLabel}>5–10 · 0.5</Text>
                  </View>
                  <SetEntryRPEScale value={rpe} onChange={changeRPE}
                    placeholder={showsRPEPlaceholder ? t('student.todayWorkoutTypes.copy028') : undefined} />
                </View>
                <VideoAttachmentControls
                  badge={{
                    exerciseName,
                    weightKg: parseFiniteDecimal(weightText),
                    reps: /^\d+$/.test(repsText.trim()) ? parseFiniteDecimal(repsText) : null,
                    rpe: parseFiniteDecimal(rpeText),
                    setOrdinal: draft.setIndex + 1,
                    coachName: null,
                  }}
                  studentId={studentId}
                  stableSetId={draft.stableSetId}
                  editable={editable}
                  initialCamera={initialCamera}
                  buildLogRequest={() =>
                    CoachedSetLogRequestSchema.parse({
                      plan_exercise_id: draft.exercise.id,
                      logged_date: gymDayText(new Date()),
                      set_index: draft.setIndex,
                      weight_kg: weightText.trim(),
                      reps: Number(repsText),
                      rpe: rpeText.trim() || null,
                      completed: draft.status === 'complete',
                      failed: draft.status === 'failed',
                    })
                  }
                  ensureSetLog={() =>
                    ensureSetLog({
                      stableSetId: draft.stableSetId,
                      weightText: normalizeDecimalInput(weightText),
                      repsText,
                      rpeText: normalizeDecimalInput(rpeText),
                      failed: draft.status === 'failed',
                    })
                  }
                />
              </View>
            </ScrollView>
            <View style={styles.footer}>
              <Pressable accessibilityRole="button" disabled={!validWeight} onPress={() => void save(false)}
                style={({ pressed }) => [styles.completeButton, pressed && styles.footerPressed, !validWeight && styles.footerDisabled]}>
                <MaterialCommunityIcons color={colors.ctaText} name="check" size={20} />
                <Text style={styles.completeText}>{t('student.setEntrySheet.copy012')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!validWeight} onPress={() => void save(true)}
                style={({ pressed }) => [styles.failedButton, pressed && styles.footerPressed]}>
                <MaterialCommunityIcons color={colors.textMuted} name="close" size={14} />
                <Text style={styles.failedText}>{t('student.setEntrySheet.copy009')}</Text>
              </Pressable>
            </View>
          </View>
          {numberPad ? <NumberPad key={numberPad} field={numberPad} initialValue={numberPad === 'weight' ? weightText : repsText}
            minimumWeight={weightFloor} onCancel={() => setNumberPad(null)} onCommit={value => {
              if (numberPad === 'weight') updateWeight(String(value));
              else {
                setRepsText(String(value));
                updateWeight(weightText);
              }
              setNumberPad(null);
            }} /> : null}
        </SafeAreaView>
      </OverlayHostProvider>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  root: { backgroundColor: colors.bgBase, flex: 1 },
  nav: { alignItems: 'center', borderBottomColor: colors.borderDefault, borderBottomWidth: 1, flexDirection: 'row', minHeight: 52, paddingHorizontal: spacing.space4 },
  backButton: { minHeight: 44, width: 44, justifyContent: 'center' },
  navTitle: { color: colors.textPrimary, flex: 1, textAlign: 'center', ...font.body(17, 'semibold') },
  navSpacer: { width: 44 },
  content: { paddingHorizontal: spacing.space4, paddingBottom: spacing.space4 },
  plateSection: { gap: 6, marginBottom: 6 },
  plateTop: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  plateDetail: { color: colors.textPrimary, flex: 1, ...font.mono(13, 'semibold') },
  collar: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.surfaceCard, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderDefault, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44 },
  collarCircle: { width: 17, height: 17, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.textMuted },
  collarText: { color: colors.textMuted, ...font.body(14, 'medium') },
  controls: { gap: spacing.space3 },
  stepper: { gap: spacing.space2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionLabel: { color: colors.textMuted, ...font.mono(12, 'medium'), letterSpacing: 0.96 },
  stepLabel: { color: colors.textMuted, ...font.mono(10) },
  caption: { color: colors.textSecondary, ...typography.caption },
  stepperRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.space3 },
  stepperButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.gold500}1F`, borderColor: `${colors.gold500}4D`, borderRadius: radius.pill, borderWidth: 1, height: 48, width: 48 },
  valueBox: { flex: 1, height: 54, backgroundColor: colors.surfaceCard, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center' },
  valueContents: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  stepperValue: { color: colors.textPrimary, ...font.mono(34, 'bold') },
  stepperUnit: { color: colors.textMuted, ...font.body(14, 'bold') },
  automaticBadge: { position: 'absolute', top: -6, right: 10, paddingHorizontal: 5, backgroundColor: colors.bgBase, color: colors.goldText, ...font.mono(9), letterSpacing: 0.72 },
  footer: { borderTopColor: colors.borderDefault, borderTopWidth: 1, gap: spacing.space3, paddingHorizontal: spacing.space4, paddingTop: 10, paddingBottom: 20 },
  completeButton: { alignItems: 'center', backgroundColor: colors.ctaBackground, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.space2, justifyContent: 'center', height: 52 },
  completeText: { color: colors.ctaText, ...font.display(16) },
  failedButton: { alignItems: 'center', flexDirection: 'row', gap: spacing.space2, justifyContent: 'center', minHeight: 44 },
  failedText: { color: colors.textMuted, ...font.body(13) },
  footerPressed: { opacity: 0.6 },
  footerDisabled: { opacity: 0.45 },
});
