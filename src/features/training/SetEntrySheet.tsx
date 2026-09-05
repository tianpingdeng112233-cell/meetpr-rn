import { decodePrescription, prescribed } from '@/domain/plan/prescription';
import { entryPrefill } from './suggestion-gating';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { AnalyticsEvent, track } from '@/analytics';
import {
  AppButton,
  Card,
  useColors,
  type Colors,
  font,
  radius,
  spacing,
  typography,
} from '@/design';

import { TRAINING_LIMITS } from './constants';
import type { WeightSuggestion, WorkoutSetDraft } from './model';
import {
  formatWeight,
  normalizeDecimalInput,
  parseFiniteDecimal,
  plateLoadout,
  rirCopy,
} from './policy';
import { createWeightEntryState, weightEntryReducer } from './set-entry-weight';

type Props = {
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

function Stepper({
  label,
  onChange,
  stepLabel,
  value,
}: {
  label: string;
  onChange: (delta: number) => void;
  stepLabel: string;
  value: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={styles.stepperCard}>
      <View style={styles.stepperHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.stepLabel}>{stepLabel}</Text>
      </View>
      <View style={styles.stepperRow}>
        <Pressable onPress={() => onChange(-1)} style={styles.stepperButton}>
          <MaterialCommunityIcons
            color={colors.gold500}
            name="minus"
            size={24}
          />
        </Pressable>
        <Text style={styles.stepperValue}>{value || '—'}</Text>
        <Pressable onPress={() => onChange(1)} style={styles.stepperButton}>
          <MaterialCommunityIcons
            color={colors.gold500}
            name="plus"
            size={24}
          />
        </Pressable>
      </View>
    </Card>
  );
}

export function SetEntrySheet({
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
  const [draggingRPE, setDraggingRPE] = useState(false);
  const [scaleWidth, setScaleWidth] = useState(1);
  const { activeSuggestion, weightText } = weightEntry;

  useEffect(() => {
    dispatchWeightEntry({
      type: 'suggestionChanged',
      suggestion: allowedSuggestion,
    });
  }, [allowedSuggestion]);

  const setRPEFromX = useCallback(
    (x: number) => {
      const index = Math.max(
        0,
        Math.min(10, Math.round((x / scaleWidth) * 10)),
      );
      setRpeText(formatWeight(5 + index * 0.5));
    },
    [scaleWidth],
  );
  const rpePan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 4 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: (event) => {
          setDraggingRPE(true);
          setRPEFromX(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => setRPEFromX(event.nativeEvent.locationX),
        onPanResponderRelease: () => setDraggingRPE(false),
        onPanResponderTerminate: () => setDraggingRPE(false),
      }),
    [setRPEFromX],
  );
  const validWeight =
    parseFiniteDecimal(weightText) !== null &&
    (parseFiniteDecimal(weightText) ?? -1) >= 0;
  const parsedWeight = parseFiniteDecimal(weightText) ?? 0;
  const loadout = plateLoadout(parsedWeight, collarOn);
  const rpe = parseFiniteDecimal(rpeText) ?? 8;
  const coachNote = draft.planSet.coach_note ?? draft.exercise.notes;

  const updateWeight = (next: string) => {
    dispatchWeightEntry({ type: 'userChanged', value: next });
  };
  const save = async (failed: boolean) => {
    if (!editable || saving || !validWeight) return;
    Keyboard.dismiss();
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
    void track(AnalyticsEvent.NavBack, { screen: 'set_entry' });
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      visible
      transparent={false}
    >
      <SafeAreaView style={styles.root}>
        <View style={styles.nav}>
          <Pressable
            accessibilityLabel={t('student.progression.backToTraining')}
            onPress={close}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="arrow-left"
              size={26}
            />
          </Pressable>
          <Text numberOfLines={1} style={styles.navTitle}>
            {t('student.setEntrySheet.copy005', [
              exerciseName,
              draft.setIndex + 1,
            ])}
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!draft.exercise.is_main_lift ? null : (
            <Card style={styles.plateCard}>
              <View style={styles.plateTop}>
                <Text style={styles.plateDetail}>{loadout.detail}</Text>
                <Pressable
                  onPress={() => onChangeCollar(!collarOn)}
                  style={[styles.collar, collarOn && styles.collarOn]}
                >
                  <Text style={styles.collarText}>
                    {t('student.setEntrySheet.copy007')}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.barbell}>
                <View style={styles.plate} />
                <View style={styles.bar} />
                <View style={styles.sleeve} />
                <Text style={styles.perSide}>
                  {t('student.progression.perSide', [
                    formatWeight(loadout.perSideKg),
                  ])}
                </Text>
                <View style={styles.sleeve} />
                <View style={styles.bar} />
                <View style={styles.plate} />
              </View>
            </Card>
          )}
          {coachNote ? (
            <View style={styles.notePill}>
              <Text style={styles.noteText}>
                {t('student.todayWorkoutScreen.copy014')} · {coachNote}
              </Text>
            </View>
          ) : null}
          <Text style={styles.noteText}>
            {prescribed(prescription, suggestion?.percentage)}
          </Text>
          {suggestionReason && !weightEntry.userEdited ? (
            <Text style={styles.noteText}>{suggestionReason}</Text>
          ) : null}
          {activeSuggestion?.percentage ? (
            <Text style={styles.suggestionText}>
              {t('student.todayWorkoutTypes.copy027')}
            </Text>
          ) : null}
          {suggestion?.percentage ? (
            <Text style={styles.noteText}>{suggestion.label}</Text>
          ) : activeSuggestion ? (
            <View style={styles.suggestion}>
              <Text style={styles.suggestionText}>
                {activeSuggestion.label} ·{' '}
                {formatWeight(activeSuggestion.weightKg)}kg
              </Text>
            </View>
          ) : null}
          <Card style={styles.inputCard}>
            <Text style={styles.sectionLabel}>
              {t('student.setEntrySheet.copy001')} KG
            </Text>
            <TextInput
              editable={editable}
              keyboardType="decimal-pad"
              onChangeText={updateWeight}
              selectTextOnFocus
              style={[
                styles.bigInput,
                activeSuggestion?.percentage && { color: colors.textMuted },
              ]}
              value={weightText}
            />
          </Card>
          <Stepper
            label={t('student.setEntrySheet.copy001')}
            onChange={(direction) =>
              updateWeight(
                formatWeight(
                  Math.max(
                    0,
                    parsedWeight + direction * TRAINING_LIMITS.weightStepKg,
                  ),
                ),
              )
            }
            stepLabel="± 2.5"
            value={weightText ? `${weightText} kg` : '—'}
          />
          <Card style={styles.inputCard}>
            <Text style={styles.sectionLabel}>
              {t('student.setEntrySheet.copy003')}
            </Text>
            <TextInput
              editable={editable}
              keyboardType="number-pad"
              onChangeText={setRepsText}
              selectTextOnFocus
              style={styles.bigInput}
              value={repsText}
            />
          </Card>
          <Stepper
            label={t('student.setEntrySheet.copy003')}
            onChange={(direction) =>
              setRepsText(
                String(
                  Math.max(
                    0,
                    (Number(repsText) || 0) +
                      direction * TRAINING_LIMITS.repsStep,
                  ),
                ),
              )
            }
            stepLabel="± 1"
            value={repsText}
          />
          <Card style={styles.rpeCard}>
            <View style={styles.rpeHeader}>
              <Text style={styles.sectionLabel}>RPE</Text>
              <Text style={styles.rpeValue}>{formatWeight(rpe)}</Text>
            </View>
            <View
              {...rpePan.panHandlers}
              onLayout={(event) =>
                setScaleWidth(event.nativeEvent.layout.width)
              }
              style={styles.rpeScale}
            >
              {Array.from({ length: 11 }, (_, index) => {
                const value = 5 + index * 0.5;
                const selected =
                  value === Math.max(5, Math.min(10, Math.round(rpe * 2) / 2));
                return (
                  <Pressable
                    key={value}
                    onPress={() => setRpeText(formatWeight(value))}
                    style={styles.tickTouch}
                  >
                    <View
                      style={[
                        styles.tick,
                        Number.isInteger(value)
                          ? styles.integerTick
                          : styles.halfTick,
                        selected && styles.selectedTick,
                      ]}
                    />
                    <Text style={styles.tickLabel}>
                      {Number.isInteger(value) ? value : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.rir}>
              {draggingRPE
                ? t('student.progression.releaseToConfirm')
                : rirCopy(rpe)}
            </Text>
          </Card>
          <Card style={styles.videoCard}>
            <View>
              <Text style={styles.sectionLabel}>
                {t('student.videoAttachmentSection.copy001')}
              </Text>
              <Text style={styles.videoStub}>
                {t('student.videoAttachmentSection.copy001')}
              </Text>
            </View>
            <View style={styles.videoActions}>
              <AppButton
                disabled
                label={t('student.videoAttachmentV3Controls.copy001')}
              />
              <AppButton
                disabled
                label={t('student.videoAttachmentV3Controls.copy002')}
              />
            </View>
          </Card>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={!editable || saving || !validWeight}
            onPress={() => void save(false)}
            style={({ pressed }) => [
              styles.completeButton,
              pressed && styles.footerPressed,
              (!editable || saving || !validWeight) && styles.footerDisabled,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.ctaText}
              name="check"
              size={18}
            />
            <Text style={styles.completeText}>
              {saving
                ? t('student.progression.saving')
                : t('student.setEntrySheet.copy012')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!editable || saving || !validWeight}
            onPress={() => void save(true)}
            style={({ pressed }) => [
              styles.failedButton,
              pressed && styles.footerPressed,
              (!editable || saving || !validWeight) && styles.footerDisabled,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="close"
              size={18}
            />
            <Text style={styles.failedText}>
              {t('student.setEntrySheet.copy009')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: { backgroundColor: colors.bgBase, flex: 1 },
    nav: {
      alignItems: 'center',
      borderBottomColor: colors.borderDefault,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      minHeight: 52,
      paddingHorizontal: spacing.base,
    },
    navTitle: {
      color: colors.textPrimary,
      flex: 1,
      textAlign: 'center',
      ...typography.bodyEmphasis,
    },
    navSpacer: { width: 26 },
    content: {
      gap: spacing.md,
      padding: spacing.base,
      paddingBottom: spacing.xl,
    },
    plateCard: { gap: spacing.md, padding: spacing.base },
    plateTop: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sectionLabel: { color: colors.textSecondary, ...typography.footnote },
    plateDetail: {
      color: colors.textPrimary,
      marginTop: spacing.xs,
      ...typography.bodyEmphasis,
    },
    collar: {
      backgroundColor: colors.bgStack,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    collarOn: {
      backgroundColor: colors.successTint,
      borderColor: colors.success,
      borderWidth: 1,
    },
    collarText: { color: colors.textPrimary, ...typography.footnote },
    barbell: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    bar: { backgroundColor: colors.textTertiary, height: 5, width: 34 },
    sleeve: { backgroundColor: colors.textSecondary, height: 12, width: 10 },
    // Existing plate artwork is frozen until the W3 PlateVisual port.
    plate: {
      backgroundColor: '#E5221E',
      borderRadius: 3,
      height: 60,
      width: 15,
    },
    perSide: {
      color: colors.textPrimary,
      minWidth: 92,
      textAlign: 'center',
      ...typography.footnote,
    },
    notePill: {
      alignSelf: 'flex-start',
      backgroundColor: colors.bgStack,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    noteText: { color: colors.textSecondary, ...typography.footnote },
    suggestion: {
      alignSelf: 'flex-start',
      backgroundColor: colors.successTint,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    suggestionText: { color: colors.success, ...typography.footnote },
    inputCard: { alignItems: 'center', gap: spacing.sm, padding: spacing.base },
    bigInput: {
      color: colors.textPrimary,
      ...font.display(44),
      minWidth: 160,
      textAlign: 'center',
    },
    stepperCard: { gap: spacing.sm, padding: spacing.base },
    stepperHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    stepLabel: { color: colors.textTertiary, ...typography.footnote },
    stepperRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    stepperButton: {
      alignItems: 'center',
      backgroundColor: colors.goldSoft,
      borderColor: `${colors.gold500}4D`,
      borderRadius: radius.pill,
      borderWidth: 1,
      height: 52,
      justifyContent: 'center',
      width: 52,
    },
    stepperValue: { color: colors.textPrimary, ...typography.headline },
    rpeCard: { gap: spacing.md, padding: spacing.base },
    rpeHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rpeValue: { color: colors.textPrimary, ...typography.title2 },
    rpeScale: { alignItems: 'flex-end', flexDirection: 'row', height: 62 },
    tickTouch: {
      alignItems: 'center',
      flex: 1,
      height: 62,
      justifyContent: 'flex-end',
    },
    tick: {
      backgroundColor: colors.borderStrong,
      borderRadius: radius.pill,
      width: 4,
    },
    integerTick: { height: 26 },
    halfTick: { height: 16 },
    selectedTick: { backgroundColor: colors.gold500, height: 40 },
    tickLabel: {
      color: colors.textTertiary,
      height: 16,
      marginTop: 2,
      ...typography.caption,
    },
    rir: {
      color: colors.textSecondary,
      textAlign: 'center',
      ...typography.body,
    },
    videoCard: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: spacing.base,
    },
    videoStub: {
      color: colors.textTertiary,
      marginTop: spacing.xs,
      ...typography.caption,
    },
    videoActions: { flexDirection: 'row', gap: spacing.sm },
    footer: {
      borderTopColor: colors.borderDefault,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
      padding: spacing.base,
    },
    completeButton: {
      alignItems: 'center',
      backgroundColor: colors.ctaBackground,
      borderRadius: radius.pill,
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: spacing.lg,
    },
    completeText: { color: colors.ctaText, ...font.body(16, 'semibold') },
    failedButton: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderDefault,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: spacing.lg,
    },
    failedText: { color: colors.textSecondary, ...font.body(16, 'semibold') },
    footerPressed: { opacity: 0.6 },
    footerDisabled: { opacity: 0.35 },
  });
