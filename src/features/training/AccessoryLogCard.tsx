import { EffortHelpButton } from './EffortHelpButton';
import { EffortToggleLabel } from './EffortToggleLabel';
import { useEffect, useRef, useState } from 'react';
import { Modal, Text, View, Vibration, useWindowDimensions, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppButton, font, fontMetrics, radius, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { showToast } from '@/design/Toast';
import { NumberPad } from '@/design/NumberPad';
import type { SetLog, SetLogUpsertRequest } from '@/api/domains/sets';
import { t } from '@/i18n';
import { effectiveLoadMode } from '@/domain/plan/prescription';
import { accessoryLogRequest, accessoryRows, accessoryRowWritable, rowsToCompleteAll } from './accessory-quick-log';
import type { SetLogInput } from './set-log-input';
import type { WorkoutSetDraft } from './model';
import { gymDayText } from './policy';
import { studentAddedLogRequest } from './drafts';
import { useVideoUploadStore } from './video-upload/store';

// Move the old effort minimum into Last's basis, subtracting effort's share from
// Last's growth. Only these two columns exchange space; all rows use this allocation.
const columns = [fontMetrics.size36, spacing.xxxl + spacing.sm, spacing.xxxl, spacing.xxl, spacing.xxl, spacing.minimumHitTarget];
export const column = (index: number): Pick<ViewStyle, 'flexGrow' | 'flexBasis' | 'minWidth'> => ({
  flexGrow: index === 1 ? columns[1] - columns[4] : columns[index],
  flexBasis: index === 1 ? spacing.minimumHitTarget * 2 : 0,
  minWidth: 0,
});
const fields = [
  ['weightText', 'weight', 'student.accessory.weightLabel'],
  ['repsText', 'reps', 'student.accessory.repsLabel'],
  ['rpeText', 'rpe', 'student.accessory.rpeLabel'],
] as const;

export type AccessoryEdits = Record<string, { revision: string; input: SetLogInput; weightEdited: boolean }>;

function PreviousLogText({ text }: { text: string }) {
  const colors = useColors();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState<number | null>(null);
  // IBM Plex Mono's numeric/punctuation glyphs advance 600/1000 em. Fit in JS:
  // RN 0.86 Android ignores minimumFontScale when adjustsFontSizeToFit is enabled.
  const size = width === null ? fontMetrics.size11
    : Math.max(fontMetrics.size10, Math.min(fontMetrics.size11, width / (text.length * 0.6 * fontScale)));
  return <Text onLayout={event => setWidth(event.nativeEvent.layout.width)} numberOfLines={1}
    style={{ ...font.mono(size), color: colors.textMuted, textAlign: 'center' }}>{text}</Text>;
}

export function AccessoryLogCard({ drafts, previousLogs, unit, studentId, onRecord, onSave, exerciseName = '', onPadLayout, onAddSet, onRemoveSet, inlineEdits, readOnly = false, allowsRIR = false }: {
  allowsRIR?: boolean;
  onAddSet?: () => void;
  onRemoveSet?: (draft: WorkoutSetDraft) => void;
  inlineEdits?: { values: AccessoryEdits; onChange: (id: string, edit: AccessoryEdits[string]) => void };
  readOnly?: boolean;
  drafts: readonly WorkoutSetDraft[];
  previousLogs: readonly SetLog[];
  unit: 'kg' | 'lb';
  studentId: string;
  onRecord: (draft: WorkoutSetDraft) => void;
  exerciseName?: string;
  onPadLayout?: (row: View | null, panel: { top: number; height: number } | null) => void;
  onSave?: (draft: WorkoutSetDraft, request: SetLogUpsertRequest, mode: 'single' | 'all') => Promise<unknown>;
}) {
  const colors = useColors();
  const rowViews = useRef<Record<string, View | null>>({});
  const [panelLayout, setPanelLayout] = useState<{ top: number; height: number } | null>(null);
  const batch = useRef(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [attempted, setAttempted] = useState<ReadonlySet<string>>(new Set());
  const [active, setActive] = useState<{ index: number; field: typeof fields[number][0] } | null>(null);
  const saving = useRef(new Set<string>());
  const [busyRows, setBusyRows] = useState<ReadonlySet<string>>(new Set());
  const videos = useVideoUploadStore(state => state.records);
  const rows = accessoryRows({ drafts, previousLogs, unit, allowsRIR, videoById: Object.fromEntries(drafts.map(draft => [draft.stableSetId, (videos[`${studentId}:${draft.stableSetId}`]?.status ?? 'none') !== 'none'])) });
  const [effortOverride, setEffortOverride] = useState<SetLogInput['effortKind']>();
  const [localEdits, setLocalEdits] = useState<AccessoryEdits>({});
  const edits = inlineEdits?.values ?? localEdits;
  const added = drafts[0]?.kind === 'added';
  const revision = (index: number) => JSON.stringify([drafts[index].sourceLog, rows[index].status, unit]);
  const inputFor = (index: number) => edits[rows[index].stableSetId]?.revision === revision(index) ? edits[rows[index].stableSetId].input : !drafts[index].sourceLog && effortOverride ? { ...rows[index], effortKind: effortOverride, rpeText: '' } : rows[index];
  const change = (index: number, patch: Partial<SetLogInput>) => {
    const id = rows[index].stableSetId;
    const next = { revision: revision(index), input: { ...inputFor(index), ...patch }, weightEdited: patch.weightText !== undefined || (edits[id]?.revision === revision(index) && edits[id].weightEdited) };
    if (inlineEdits) inlineEdits.onChange(id, next);
    else setLocalEdits(current => ({ ...current, [id]: next }));
  };
  const activeRowId = active ? rows[active.index]?.stableSetId : undefined;
  useEffect(() => {
    if (!activeRowId) return;
    onPadLayout?.(rowViews.current[activeRowId], panelLayout);
    return () => onPadLayout?.(null, null);
  }, [active, activeRowId, panelLayout, onPadLayout]);
  const fieldKind = (index: number, field: typeof fields[number][0]) => field === 'weightText' ? 'weight' : field === 'repsText' ? 'reps' : inputFor(index).effortKind === 'rir' ? 'rir' : 'rpe';
  const fieldTitle = (index: number, field: typeof fields[number][0]) => {
    const kind = fieldKind(index, field);
    return kind === 'rpe' || kind === 'rir' ? kind.toUpperCase() : t(kind === 'weight' ? 'student.accessory.pad.weight' : 'student.accessory.pad.reps');
  };
  const editableCells = rows.flatMap((row, index) => readOnly || batchBusy || busyRows.has(row.stableSetId) ? []
    : fields.filter(([field]) => field !== 'rpeText' || allowsRIR || effectiveLoadMode(drafts[index].planSet) !== 'free_weight').map(([field]) => ({ index, field })));
  const nextCell = active ? editableCells[editableCells.findIndex(cell => cell.index === active.index && cell.field === active.field) + 1] : undefined;
  const closePad = () => { setActive(null); setPanelLayout(null); };
  const commitPad = (value: number | null, advance = false) => {
    if (!active) return;
    if (value !== null || active.field === 'rpeText') change(active.index, { [active.field]: value === null ? '' : String(value) });
    if (advance && nextCell) setActive(nextCell);
    else closePad();
  };
  const numericCell = (index: number, field: typeof fields[number][0], label: string, placeholder: string, style: ViewStyle) => {
    const row = rows[index];
    const focused = active?.index === index && active.field === field;
    const value = inputFor(index)[field];
    const compact = effectiveLoadMode(drafts[index].planSet) === 'free_weight' && !allowsRIR;
    const size = compact ? fontMetrics.size13 : field === 'rpeText' && !value && typeof row.rpePlaceholder !== 'string' ? fontMetrics.size11 : fontMetrics.size15;
    return <Pressable key={field} accessibilityRole="button" accessibilityLabel={label} accessibilityValue={{ text: value }} accessibilityHint={placeholder || undefined}
      disabled={readOnly || batchBusy || busyRows.has(row.stableSetId)} onPress={() => setActive({ index, field })}
      style={{ ...style, justifyContent: 'center', ...(focused ? { borderWidth: spacing.point2, borderColor: colors.gold500 } : {}) }}>
      <Text style={{ ...font.mono(size, value && !compact ? 'bold' : 'regular'), textAlign: 'center', color: value ? colors.textPrimary : colors.textMuted }}>{value || placeholder}</Text>
    </Pressable>;
  };
  const isCancel = (index: number) => rows[index].status === 'complete' && fields.every(([field]) => inputFor(index)[field] === rows[index][field]);
  const saveRow = async (index: number) => {
    const row = rows[index];
    if (readOnly || !onSave || batch.current || saving.current.has(row.stableSetId)) return;
    setAttempted(current => new Set(current).add(row.stableSetId));
    if (!isCancel(index) && !accessoryRowWritable(row, inputFor(index)).writable) return;
    if (isCancel(index) && row.hasVideo) { showToast(t('student.accessory.videoWarning')); return; }
    if (!isCancel(index)) Vibration.vibrate(15);
    saving.current.add(row.stableSetId);
    setBusyRows(new Set(saving.current));
    try { await onSave(drafts[index], added ? studentAddedLogRequest(drafts[index], row, inputFor(index), isCancel(index) ? 'cancel' : 'complete', gymDayText(new Date())) : accessoryLogRequest(row, inputFor(index), { planExerciseId: drafts[index].exercise.id, action: isCancel(index) ? 'cancel' : 'complete' }), 'single'); }
    catch { /* The page owns the existing save-failure alert; keep the inputs for retry. */ }
    finally { saving.current.delete(row.stableSetId); setBusyRows(new Set(saving.current)); }
  };
  const completeAll = async () => {
    if (readOnly || !onSave || batch.current || saving.current.size) return;
    const editedById = Object.fromEntries(rows.map((row, index) => [row.stableSetId, inputFor(index)]));
    const { toWrite } = rowsToCompleteAll(rows, editedById);
    setShowSkipped(true);
    batch.current = true;
    setBatchBusy(true);
    try {
      for (const row of toWrite) {
        const draft = drafts.find(candidate => candidate.stableSetId === row.stableSetId)!;
        await onSave(draft, accessoryLogRequest(row, editedById[row.stableSetId], { planExerciseId: draft.exercise.id }), 'all');
      }
    } catch { /* Stop at the first failure. Successful rows remain in the page's saved drafts. */ }
    finally { batch.current = false; setBatchBusy(false); }
  };
  const firstPending = rows.findIndex((_, index) => !drafts[index].sourceLog);
  const headerKind = inputFor(firstPending < 0 ? 0 : firstPending)?.effortKind ?? 'rpe';
  const switchEffort = () => {
    const effortKind = headerKind === 'rpe' ? 'rir' : 'rpe';
    setEffortOverride(effortKind);
    rows.forEach((_, index) => { if (!drafts[index].sourceLog) change(index, { effortKind, rpeText: '' }); });
  };
  const skippedCount = showSkipped ? rowsToCompleteAll(rows, Object.fromEntries(rows.map((row, index) => [row.stableSetId, inputFor(index)]))).skipped.length : 0;
  return <View style={{ gap: spacing.point6 }}>
    {rows.some(row => row.isBodyweight) ? <Text style={{ ...font.body(fontMetrics.size12), color: colors.textSecondary }}>{t('loadTypes.extraWeight', [unit])}</Text> : null}
    {rows.some((_, index) => allowsRIR || effectiveLoadMode(drafts[index].planSet) !== 'free_weight') ? <View style={{ flexDirection: 'row', gap: spacing.point6 }}>
      {[t('student.accessory.set'), t('student.accessory.last'), unit.toUpperCase(), t('student.setEntrySheet.copy003'), headerKind.toUpperCase(), t('student.workoutCompletionFlowView.copy003')].map((label, index) =>
        index === 4 ? <View key={index} style={{ ...column(index), flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flexShrink: 0, minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
            {allowsRIR ? <Pressable accessibilityRole="button" accessibilityLabel={t('training.effort.switch')} accessibilityValue={{ text: label }} disabled={readOnly || batchBusy || busyRows.size > 0 || firstPending < 0} onPress={switchEffort} style={{ minHeight: spacing.minimumHitTarget, justifyContent: 'center', alignItems: 'center' }}><EffortToggleLabel label={label} compact /></Pressable>
              : <Text style={{ ...font.mono(fontMetrics.size10), color: colors.textMuted }}>{label}</Text>}
            <EffortHelpButton kind={headerKind} superscript />
          </View>
        </View> : <Text key={index} style={{ ...column(index), ...font.mono(fontMetrics.size10), color: colors.textMuted, textAlign: 'center', alignSelf: 'center' }}>{label}</Text>)}
    </View> : null}
    {rows.map((row, index) => {
      const input = inputFor(index);
      const validation = accessoryRowWritable(row, input);
      const complete = row.status === 'complete';
      const weightEdited = edits[row.stableSetId]?.revision === revision(index) && edits[row.stableSetId].weightEdited;
      const invalidFields = validation.invalidFields.filter(field => field !== 'weightText' || input.weightText !== '' || weightEdited || ((showSkipped || attempted.has(row.stableSetId)) && row.status === 'pending'));
      const canAct = isCancel(index) || validation.writable;
      const loadMode = effectiveLoadMode(drafts[index].planSet);
      if (loadMode === 'free_weight' && !allowsRIR) {
        const weightError = validation.invalidFields.includes('weightText') && (attempted.has(row.stableSetId) || showSkipped || weightEdited);
        const disabled = readOnly || batchBusy || busyRows.has(row.stableSetId);
        const weightLabel = t('loadTypes.requiredWeight', [unit]);
        return <View key={row.stableSetId} ref={node => { rowViews.current[row.stableSetId] = node; }} collapsable={false} testID={`accessory-row-${row.stableSetId}`} style={{ gap: spacing.xs, borderRadius: radius.inset, backgroundColor: active?.index === index ? colors.goldSoft : undefined }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('student.accessory.details', [row.setIndex + 1])} disabled={disabled} onPress={() => onRecord(drafts[index])} style={{ minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
              <Text style={{ ...font.body(fontMetrics.size12), color: colors.textPrimary }}>{t('loadTypes.set', [row.setIndex + 1])}</Text>
            </Pressable>
            <View style={{ flex: 2, gap: spacing.xs }}>
              <Text style={{ ...font.body(fontMetrics.size11), color: weightError ? colors.danger : colors.textMuted }}>{weightLabel}</Text>
              {numericCell(index, 'weightText', weightLabel, t('loadTypes.requiredPlaceholder'), { minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderRadius: radius.inset, borderColor: weightError ? colors.danger : colors.borderStrong })}
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ ...font.body(fontMetrics.size11), color: colors.textMuted }}>{t('student.setEntrySheet.copy004')}</Text>
              {numericCell(index, 'repsText', t('student.accessory.repsLabel', [row.setIndex + 1]), '', { minHeight: spacing.minimumHitTarget, backgroundColor: colors.surfaceCard, borderWidth: 1, borderRadius: radius.inset, borderColor: attempted.has(row.stableSetId) && validation.invalidFields.includes('repsText') ? colors.danger : colors.borderStrong })}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t(isCancel(index) ? 'student.accessory.undo' : 'student.accessory.complete', [row.setIndex + 1])} disabled={disabled}
              onPress={() => void saveRow(index)} style={{ minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.sm, justifyContent: 'center', borderRadius: radius.inset, backgroundColor: complete ? colors.success : colors.ctaFill }}>
              <Text style={{ ...font.body(fontMetrics.size12, 'bold'), color: colors.inkOnCTAFill }}>{complete ? '✓' : t('loadTypes.complete')}</Text>
            </Pressable>
          </View>
          {row.extraNote ? <Text style={{ ...font.body(fontMetrics.size12), color: colors.textMuted }}>{row.extraNote}</Text> : null}
          {weightError && loadMode === 'free_weight' && !input.weightText.trim() ? <Text accessibilityLiveRegion="polite" style={{ ...font.body(fontMetrics.size12), color: colors.danger }}>{t('loadTypes.missingWeight', [row.setIndex + 1])}</Text> : null}
        </View>;
      }
      return <View key={row.stableSetId} ref={node => { rowViews.current[row.stableSetId] = node; }} collapsable={false} testID={`accessory-row-${row.stableSetId}`} style={{ gap: spacing.xs, borderRadius: radius.inset, backgroundColor: active?.index === index ? colors.goldSoft : undefined }}>
        {input.effortKind !== headerKind ? <Text style={{ ...font.mono(fontMetrics.size10), color: colors.textSecondary }}>{drafts[index].sourceLog ? t('training.effort.saved', [row.setIndex + 1, input.effortKind?.toUpperCase() ?? 'RPE']) : input.effortKind?.toUpperCase()}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.point6, paddingVertical: spacing.xs, borderRadius: radius.inset, backgroundColor: active?.index === index ? undefined : complete ? colors.successTint : colors.bgInset }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.accessory.details', [row.setIndex + 1])} disabled={readOnly || added || batchBusy || busyRows.has(row.stableSetId)} onPress={() => onRecord(drafts[index])}
            style={{ ...column(0), minHeight: spacing.minimumHitTarget, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.inset }}>
            <Text style={{ ...font.mono(fontMetrics.size15, 'bold'), color: colors.textPrimary }}>{row.kind === 'extra' ? t('student.added.extra') : row.setIndex + 1}</Text>
            {row.hasVideo ? <MaterialCommunityIcons name="video-outline" size={spacing.point14} color={colors.success} /> : null}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.accessory.useLast', [row.setIndex + 1])} disabled={readOnly || !row.previous || batchBusy || busyRows.has(row.stableSetId)}
            onPress={() => row.previous && change(index, { weightText: row.previous.weightText, repsText: String(row.previous.reps) })}
            style={{ ...column(1), minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
            <PreviousLogText text={row.previousText} />
          </Pressable>
          {fields.map(([field, , label], offset) => numericCell(index, field,
            field === 'rpeText' && input.effortKind === 'rir' ? t('training.effort.rirLabel', [row.setIndex + 1]) : t(label, [row.setIndex + 1]),
            field === 'weightText' ? row.weightPlaceholder : field === 'rpeText' && !complete && input.effortKind === row.effortKind ? typeof row.rpePlaceholder === 'string' ? row.rpePlaceholder : t('student.accessory.rir', [row.rpePlaceholder.value]) : '',
            { ...column(offset + 2), minHeight: spacing.minimumHitTarget, paddingVertical: spacing.xs, backgroundColor: complete ? undefined : colors.surfaceCard, borderRadius: radius.inset, borderWidth: complete && !invalidFields.includes(field) ? 0 : spacing.point1, borderColor: invalidFields.includes(field) ? colors.danger : colors.borderStrong }))}          <Pressable accessibilityRole="button" accessibilityLabel={t(isCancel(index) ? 'student.accessory.undo' : 'student.accessory.complete', [row.setIndex + 1])}
            accessibilityHint={!canAct ? t('student.accessory.needsWeightOne') : undefined} disabled={readOnly || batchBusy || !canAct || busyRows.has(row.stableSetId)} onPress={() => void saveRow(index)}
            accessibilityState={{ disabled: readOnly || batchBusy || !canAct || busyRows.has(row.stableSetId), busy: busyRows.has(row.stableSetId) }}
            style={{ ...column(5), aspectRatio: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: spacing.point2, borderColor: !canAct ? colors.textGhost : complete ? colors.success : colors.textPrimary, backgroundColor: complete ? colors.success : colors.surfaceCard }}>
            <MaterialCommunityIcons name="check" size={spacing.lg} color={!canAct ? colors.textGhost : complete ? colors.inkOnCTAFill : colors.textPrimary} />
          </Pressable>
        </View>
        {!readOnly && row.kind && onRemoveSet ? <Pressable accessibilityRole="button" accessibilityLabel={t('student.added.removeSet')} disabled={batchBusy || busyRows.has(row.stableSetId)} onPress={() => onRemoveSet(drafts[index])} style={{ alignSelf: 'flex-end', minHeight: spacing.minimumHitTarget, minWidth: spacing.minimumHitTarget, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.textMuted }}>×</Text></Pressable> : null}
        {row.extraNote ? <Text style={{ ...font.body(fontMetrics.size12), color: colors.textMuted }}>{row.extraNote}</Text> : null}
      </View>;
    })}
    {skippedCount > 0 ? <Text accessibilityLiveRegion="polite" style={{ ...font.body(fontMetrics.size12), color: colors.goldText }}>{t(skippedCount === 1 ? 'student.accessory.needsWeightOne' : 'student.accessory.needsWeightMany', [skippedCount])}</Text> : null}
    {!added && !readOnly ? <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center', marginTop: spacing.xs }}>
      <MaterialCommunityIcons name="video-outline" size={spacing.base} color={colors.textSecondary} />
      <Text style={{ flex: 1, ...font.body(fontMetrics.size12), color: colors.textSecondary }}>{t('student.accessory.hint')}</Text>
    </View> : null}
    {!readOnly && onAddSet ? <AppButton variant="link" label={t('student.added.addSet')} disabled={batchBusy || busyRows.size > 0 || (added ? rows.length : rows.filter(row => row.kind === 'extra').length) >= 10} onPress={onAddSet} /> : null}
    {!readOnly && !added && rows.some(row => !row.kind && row.status === 'pending') ? <AppButton label={t('student.accessory.completeAll')} labelStyle={{ textAlign: 'center' }}  disabled={batchBusy} onPress={() => void completeAll()} /> : null}
    {active ? <Modal transparent visible animationType="none" onRequestClose={closePad}>
      <NumberPad key={`${rows[active.index].stableSetId}:${active.field}`} mode="accessory" field={fieldKind(active.index, active.field)}
        initialValue={inputFor(active.index)[active.field]} unit={unit}
        onPanelLayout={(top, height) => setPanelLayout(current => current?.top === top && current.height === height ? current : { top, height })}
        contextText={t('student.accessory.pad.context', [exerciseName, rows[active.index].setIndex + 1, fieldTitle(active.index, active.field)])}
        nextTitle={nextCell ? t('student.accessory.pad.next', [fieldTitle(nextCell.index, nextCell.field)]) : undefined}
        onNext={nextCell ? value => commitPad(value, true) : undefined} onCancel={closePad} onCommit={commitPad} />
    </Modal> : null}
  </View>;
}
