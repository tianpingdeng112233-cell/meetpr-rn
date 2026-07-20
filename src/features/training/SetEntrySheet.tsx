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

import { AnalyticsEvent, track } from '@/analytics';
import { AppButton, Card, colors, radius, spacing, typography } from '@/design';

import { TRAINING_LIMITS } from './constants';
import type { WeightSuggestion, WorkoutSetDraft } from './model';
import {
  formatWeight,
  normalizeDecimalInput,
  parseFiniteDecimal,
  plateLoadout,
  rirCopy,
} from './policy';
import {
  createWeightEntryState,
  weightEntryReducer,
} from './set-entry-weight';

type Props = {
  collarOn: boolean;
  draft: WorkoutSetDraft;
  editable: boolean;
  exerciseName: string;
  suggestion: WeightSuggestion;
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
  return (
    <Card style={styles.stepperCard}>
      <View style={styles.stepperHeader}><Text style={styles.sectionLabel}>{label}</Text><Text style={styles.stepLabel}>{stepLabel}</Text></View>
      <View style={styles.stepperRow}>
        <Pressable onPress={() => onChange(-1)} style={styles.stepperButton}><MaterialCommunityIcons color={colors.brandRed} name="minus" size={24} /></Pressable>
        <Text style={styles.stepperValue}>{value || '—'}</Text>
        <Pressable onPress={() => onChange(1)} style={styles.stepperButton}><MaterialCommunityIcons color={colors.brandRed} name="plus" size={24} /></Pressable>
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
}: Props) {
  const [weightEntry, dispatchWeightEntry] = useReducer(
    weightEntryReducer,
    createWeightEntryState(draft.weightText, suggestion),
  );
  const [repsText, setRepsText] = useState(draft.repsText);
  const [rpeText, setRpeText] = useState(draft.rpeText || '8');
  const [saving, setSaving] = useState(false);
  const [draggingRPE, setDraggingRPE] = useState(false);
  const [scaleWidth, setScaleWidth] = useState(1);
  const { activeSuggestion, weightText } = weightEntry;

  useEffect(() => {
    dispatchWeightEntry({ type: 'suggestionChanged', suggestion });
  }, [suggestion]);

  const setRPEFromX = useCallback((x: number) => {
    const index = Math.max(0, Math.min(10, Math.round((x / scaleWidth) * 10)));
    setRpeText(formatWeight(5 + index * 0.5));
  }, [scaleWidth]);
  const rpePan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
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
  const parsedWeight = parseFiniteDecimal(weightText) ?? 0;
  const loadout = plateLoadout(parsedWeight, collarOn);
  const rpe = parseFiniteDecimal(rpeText) ?? 8;
  const coachNote = draft.planSet.coach_note ?? draft.exercise.notes;

  const updateWeight = (next: string) => {
    dispatchWeightEntry({ type: 'userChanged', value: next });
  };
  const save = async (failed: boolean) => {
    if (!editable || saving) return;
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
    <Modal animationType="slide" onRequestClose={close} visible transparent={false}>
      <SafeAreaView style={styles.root}>
        <View style={styles.nav}>
          <Pressable
            accessibilityLabel="返回训练"
            onPress={close}>
            <MaterialCommunityIcons color={colors.fgPrimary} name="arrow-left" size={26} />
          </Pressable>
          <Text numberOfLines={1} style={styles.navTitle}>{exerciseName} · 第 {draft.setIndex + 1} 组</Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!draft.exercise.is_main_lift ? null : (
            <Card style={styles.plateCard}>
              <View style={styles.plateTop}>
                <Text style={styles.plateDetail}>{loadout.detail}</Text>
                <Pressable onPress={() => onChangeCollar(!collarOn)} style={[styles.collar, collarOn && styles.collarOn]}><Text style={styles.collarText}>上赛扣</Text></Pressable>
              </View>
              <View style={styles.barbell}>
                <View style={styles.plate} /><View style={styles.bar} /><View style={styles.sleeve} />
                <Text style={styles.perSide}>{formatWeight(loadout.perSideKg)}kg / 侧</Text>
                <View style={styles.sleeve} /><View style={styles.bar} /><View style={styles.plate} />
              </View>
            </Card>
          )}
          {coachNote ? <View style={styles.notePill}><Text style={styles.noteText}>教练备注 · {coachNote}</Text></View> : null}
          {activeSuggestion ? <View style={styles.suggestion}><Text style={styles.suggestionText}>{activeSuggestion.label} · {formatWeight(activeSuggestion.weightKg)}kg</Text></View> : null}
          <Card style={styles.inputCard}>
            <Text style={styles.sectionLabel}>重量 KG</Text>
            <TextInput
              editable={editable}
              keyboardType="decimal-pad"
              onChangeText={updateWeight}
              selectTextOnFocus
              style={styles.bigInput}
              value={weightText}
            />
          </Card>
          <Stepper
            label="重量"
            onChange={(direction) => updateWeight(formatWeight(Math.max(0, parsedWeight + direction * TRAINING_LIMITS.weightStepKg)))}
            stepLabel="± 2.5"
            value={`${weightText || '0'} kg`}
          />
          <Card style={styles.inputCard}>
            <Text style={styles.sectionLabel}>次数</Text>
            <TextInput editable={editable} keyboardType="number-pad" onChangeText={setRepsText} selectTextOnFocus style={styles.bigInput} value={repsText} />
          </Card>
          <Stepper
            label="次数"
            onChange={(direction) => setRepsText(String(Math.max(0, (Number(repsText) || 0) + direction * TRAINING_LIMITS.repsStep)))}
            stepLabel="± 1"
            value={repsText}
          />
          <Card style={styles.rpeCard}>
            <View style={styles.rpeHeader}><Text style={styles.sectionLabel}>RPE</Text><Text style={styles.rpeValue}>{formatWeight(rpe)}</Text></View>
            <View
              {...rpePan.panHandlers}
              onLayout={(event) => setScaleWidth(event.nativeEvent.layout.width)}
              style={styles.rpeScale}>
              {Array.from({ length: 11 }, (_, index) => {
                const value = 5 + index * 0.5;
                const selected = value === Math.max(5, Math.min(10, Math.round(rpe * 2) / 2));
                return (
                  <Pressable key={value} onPress={() => setRpeText(formatWeight(value))} style={styles.tickTouch}>
                    <View style={[styles.tick, Number.isInteger(value) ? styles.integerTick : styles.halfTick, selected && styles.selectedTick]} />
                    <Text style={styles.tickLabel}>{Number.isInteger(value) ? value : ''}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.rir}>{draggingRPE ? '松开确认' : rirCopy(rpe)}</Text>
          </Card>
          <Card style={styles.videoCard}>
            <View><Text style={styles.sectionLabel}>视频</Text><Text style={styles.videoStub}>W1-h 接线</Text></View>
            <View style={styles.videoActions}><AppButton disabled label="拍摄" /><AppButton disabled label="相册" /></View>
          </Card>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={!editable || saving}
            onPress={() => void save(false)}
            style={({ pressed }) => [
              styles.completeButton,
              pressed && styles.footerPressed,
              (!editable || saving) && styles.footerDisabled,
            ]}>
            <MaterialCommunityIcons color={colors.bg} name="check" size={18} />
            <Text style={styles.completeText}>{saving ? '保存中…' : '完成本组'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!editable || saving}
            onPress={() => void save(true)}
            style={({ pressed }) => [
              styles.failedButton,
              pressed && styles.footerPressed,
              (!editable || saving) && styles.footerDisabled,
            ]}>
            <MaterialCommunityIcons color={colors.fgSecondary} name="close" size={18} />
            <Text style={styles.failedText}>未完成 / 失败</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, flex: 1 },
  nav: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 52, paddingHorizontal: spacing.base },
  navTitle: { color: colors.fgPrimary, flex: 1, textAlign: 'center', ...typography.bodyEmphasis },
  navSpacer: { width: 26 },
  content: { gap: spacing.md, padding: spacing.base, paddingBottom: spacing.xl },
  plateCard: { gap: spacing.md, padding: spacing.base },
  plateTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionLabel: { color: colors.fgSecondary, ...typography.footnote },
  plateDetail: { color: colors.fgPrimary, marginTop: spacing.xs, ...typography.bodyEmphasis },
  collar: { backgroundColor: colors.surface3, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  collarOn: { backgroundColor: colors.greenSoft, borderColor: colors.green, borderWidth: 1 },
  collarText: { color: colors.fgPrimary, ...typography.footnote },
  barbell: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  bar: { backgroundColor: colors.fgTertiary, height: 5, width: 34 },
  sleeve: { backgroundColor: colors.fgSecondary, height: 12, width: 10 },
  plate: { backgroundColor: colors.brandRed, borderRadius: 3, height: 60, width: 15 },
  perSide: { color: colors.fgPrimary, minWidth: 92, textAlign: 'center', ...typography.footnote },
  notePill: { alignSelf: 'flex-start', backgroundColor: colors.surface3, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  noteText: { color: colors.fgSecondary, ...typography.footnote },
  suggestion: { alignSelf: 'flex-start', backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  suggestionText: { color: colors.green, ...typography.footnote },
  inputCard: { alignItems: 'center', gap: spacing.sm, padding: spacing.base },
  bigInput: { color: colors.fgPrimary, fontSize: 44, fontVariant: ['tabular-nums'], fontWeight: '800', minWidth: 160, textAlign: 'center' },
  stepperCard: { gap: spacing.sm, padding: spacing.base },
  stepperHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  stepLabel: { color: colors.fgTertiary, ...typography.footnote },
  stepperRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepperButton: { alignItems: 'center', backgroundColor: colors.brandRedSoft, borderColor: 'rgba(229,34,30,0.3)', borderRadius: radius.pill, borderWidth: 1, height: 52, justifyContent: 'center', width: 52 },
  stepperValue: { color: colors.fgPrimary, ...typography.headline },
  rpeCard: { gap: spacing.md, padding: spacing.base },
  rpeHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  rpeValue: { color: colors.fgPrimary, ...typography.title2 },
  rpeScale: { alignItems: 'flex-end', flexDirection: 'row', height: 62 },
  tickTouch: { alignItems: 'center', flex: 1, height: 62, justifyContent: 'flex-end' },
  tick: { backgroundColor: colors.borderStrong, borderRadius: radius.pill, width: 4 },
  integerTick: { height: 26 },
  halfTick: { height: 16 },
  selectedTick: { backgroundColor: colors.brandRed, height: 40 },
  tickLabel: { color: colors.fgTertiary, height: 16, marginTop: 2, ...typography.caption },
  rir: { color: colors.fgSecondary, textAlign: 'center', ...typography.body },
  videoCard: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.base },
  videoStub: { color: colors.fgTertiary, marginTop: spacing.xs, ...typography.caption },
  videoActions: { flexDirection: 'row', gap: spacing.sm },
  footer: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, padding: spacing.base },
  completeButton: { alignItems: 'center', backgroundColor: colors.fgPrimary, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.lg },
  completeText: { color: colors.bg, fontSize: 16, fontWeight: '600' },
  failedButton: { alignItems: 'center', backgroundColor: colors.surface1, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.lg },
  failedText: { color: colors.fgSecondary, fontSize: 16, fontWeight: '600' },
  footerPressed: { opacity: 0.6 },
  footerDisabled: { opacity: 0.35 },
});
