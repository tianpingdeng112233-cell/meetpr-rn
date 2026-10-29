import { useRef, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View, Vibration, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppButton, font, fontMetrics, radius, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { showToast } from '@/design/Toast';
import { append, type NumberPadField } from '@/design/number-pad';
import type { SetLog, SetLogUpsertRequest } from '@/api/domains/sets';
import { t } from '@/i18n';
import { effectiveLoadMode } from '@/domain/plan/prescription';
import { accessoryLogRequest, accessoryRows, accessoryRowWritable, rowsToCompleteAll } from './accessory-quick-log';
import type { SetLogInput } from './set-log-input';
import type { WorkoutSetDraft } from './model';
import { normalizeDecimalInput, gymDayText } from './policy';
import { studentAddedLogRequest } from './drafts';
import { useVideoUploadStore } from './video-upload/store';

// Keep the approved column proportions while allowing the six columns to fit small screens.
const columns = [fontMetrics.size36, spacing.xxxl + spacing.sm, spacing.xxxl, spacing.xxl, spacing.xxl, spacing.minimumHitTarget];
const column = (index: number): Pick<ViewStyle, 'flex' | 'minWidth'> => ({ flex: columns[index], minWidth: 0 });
const fields = [
  ['weightText', 'weight', 'student.accessory.weightLabel'],
  ['repsText', 'reps', 'student.accessory.repsLabel'],
  ['rpeText', 'rpe', 'student.accessory.rpeLabel'],
] as const;

export type AccessoryEdits = Record<string, { revision: string; input: SetLogInput; weightEdited: boolean }>;

export function AccessoryLogCard({ drafts, previousLogs, unit, studentId, onRecord, onSave, onInputFocus, onAddSet, onRemoveSet, inlineEdits, readOnly = false }: {
  onAddSet?: () => void;
  onRemoveSet?: (draft: WorkoutSetDraft) => void;
  inlineEdits?: { values: AccessoryEdits; onChange: (id: string, edit: AccessoryEdits[string]) => void };
  readOnly?: boolean;
  drafts: readonly WorkoutSetDraft[];
  previousLogs: readonly SetLog[];
  unit: 'kg' | 'lb';
  studentId: string;
  onRecord: (draft: WorkoutSetDraft) => void;
  onInputFocus?: (input: TextInput | null) => void;
  onSave?: (draft: WorkoutSetDraft, request: SetLogUpsertRequest, mode: 'single' | 'all') => Promise<unknown>;
}) {
  const colors = useColors();
  const inputs = useRef<Record<string, TextInput | null>>({});
  const batch = useRef(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [attempted, setAttempted] = useState<ReadonlySet<string>>(new Set());
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const saving = useRef(new Set<string>());
  const [busyRows, setBusyRows] = useState<ReadonlySet<string>>(new Set());
  const videos = useVideoUploadStore(state => state.records);
  const rows = accessoryRows({ drafts, previousLogs, unit, videoById: Object.fromEntries(drafts.map(draft => [draft.stableSetId, (videos[`${studentId}:${draft.stableSetId}`]?.status ?? 'none') !== 'none'])) });
  const [localEdits, setLocalEdits] = useState<AccessoryEdits>({});
  const edits = inlineEdits?.values ?? localEdits;
  const added = drafts[0]?.kind === 'added';
  const revision = (index: number) => JSON.stringify([drafts[index].sourceLog, rows[index].status, unit]);
  const inputFor = (index: number) => edits[rows[index].stableSetId]?.revision === revision(index) ? edits[rows[index].stableSetId].input : rows[index];
  const change = (index: number, patch: Partial<SetLogInput>) => {
    const id = rows[index].stableSetId;
    const next = { revision: revision(index), input: { ...inputFor(index), ...patch }, weightEdited: patch.weightText !== undefined || (edits[id]?.revision === revision(index) && edits[id].weightEdited) };
    if (inlineEdits) inlineEdits.onChange(id, next);
    else setLocalEdits(current => ({ ...current, [id]: next }));
  };
  const filter = (value: string, field: NumberPadField) => [...normalizeDecimalInput(value)].reduce((text, character) => append(text, character, field), '');
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
  const skippedCount = showSkipped ? rowsToCompleteAll(rows, Object.fromEntries(rows.map((row, index) => [row.stableSetId, inputFor(index)]))).skipped.length : 0;
  return <View style={{ gap: spacing.point6 }}>
    {rows.some((_, index) => !['free_weight', 'bodyweight'].includes(effectiveLoadMode(drafts[index].planSet) ?? '')) ? <View style={{ flexDirection: 'row', gap: spacing.point6 }}>
      {[t('student.accessory.set'), t('student.accessory.last'), unit.toUpperCase(), t('student.setEntrySheet.copy003'), t('chat.rpeMetric'), t('student.workoutCompletionFlowView.copy003')].map((label, index) =>
        <Text key={index} style={{ ...column(index), ...font.mono(fontMetrics.size10), color: colors.textMuted, textAlign: 'center' }}>{label}</Text>)}
    </View> : null}
    {rows.map((row, index) => {
      const input = inputFor(index);
      const validation = accessoryRowWritable(row, input);
      const complete = row.status === 'complete';
      const weightEdited = edits[row.stableSetId]?.revision === revision(index) && edits[row.stableSetId].weightEdited;
      const invalidFields = validation.invalidFields.filter(field => field !== 'weightText' || input.weightText !== '' || weightEdited || (showSkipped && row.status === 'pending'));
      const canAct = isCancel(index) || validation.writable;
      const loadMode = effectiveLoadMode(drafts[index].planSet);
      if (loadMode === 'free_weight' || loadMode === 'bodyweight') {
        const weightError = validation.invalidFields.includes('weightText') && (attempted.has(row.stableSetId) || showSkipped || weightEdited);
        const disabled = readOnly || batchBusy || busyRows.has(row.stableSetId);
        const weightLabel = t(loadMode === 'bodyweight' ? 'loadTypes.optionalWeight' : 'loadTypes.requiredWeight', [unit]);
        return <View key={row.stableSetId} style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('student.accessory.details', [row.setIndex + 1])} disabled={disabled} onPress={() => onRecord(drafts[index])} style={{ minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
              <Text style={{ ...font.body(fontMetrics.size12), color: colors.textPrimary }}>{t('loadTypes.set', [row.setIndex + 1])}</Text>
            </Pressable>
            <View style={{ flex: 2, gap: spacing.xs }}>
              <Text style={{ ...font.body(fontMetrics.size11), color: weightError ? colors.danger : colors.textMuted }}>{weightLabel}</Text>
              <TextInput ref={node => { inputs.current[`${row.stableSetId}:weightText`] = node; }}
                onFocus={() => { setFocusedInput(`${row.stableSetId}:weightText`); onInputFocus?.(inputs.current[`${row.stableSetId}:weightText`]); }}
                onBlur={() => { setFocusedInput(null); onInputFocus?.(null); }} accessibilityLabel={weightLabel} value={input.weightText}
                placeholder={t(loadMode === 'bodyweight' ? 'loadTypes.optionalPlaceholder' : 'loadTypes.requiredPlaceholder')}
                placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" editable={!disabled}
                onChangeText={value => change(index, { weightText: filter(value, 'weight') })}
                style={{ minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.sm, ...font.mono(fontMetrics.size13), color: colors.textPrimary, backgroundColor: colors.surfaceCard, borderWidth: 1, borderRadius: radius.inset, borderColor: weightError ? colors.danger : colors.borderStrong }} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ ...font.body(fontMetrics.size11), color: colors.textMuted }}>{t('student.setEntrySheet.copy004')}</Text>
              <TextInput ref={node => { inputs.current[`${row.stableSetId}:repsText`] = node; }}
                onFocus={() => { setFocusedInput(`${row.stableSetId}:repsText`); onInputFocus?.(inputs.current[`${row.stableSetId}:repsText`]); }}
                onBlur={() => { setFocusedInput(null); onInputFocus?.(null); }} accessibilityLabel={t('student.accessory.repsLabel', [row.setIndex + 1])} value={input.repsText}
                keyboardType="number-pad" editable={!disabled} onChangeText={value => change(index, { repsText: filter(value, 'reps') })}
                style={{ minHeight: spacing.minimumHitTarget, textAlign: 'center', ...font.mono(fontMetrics.size13), color: colors.textPrimary, backgroundColor: colors.surfaceCard, borderWidth: 1, borderRadius: radius.inset, borderColor: attempted.has(row.stableSetId) && validation.invalidFields.includes('repsText') ? colors.danger : colors.borderStrong }} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t(isCancel(index) ? 'student.accessory.undo' : 'student.accessory.complete', [row.setIndex + 1])} disabled={disabled}
              onPress={() => void saveRow(index)} style={{ minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.sm, justifyContent: 'center', borderRadius: radius.inset, backgroundColor: complete ? colors.success : colors.ctaFill }}>
              {busyRows.has(row.stableSetId) ? <ActivityIndicator color={colors.inkOnCTAFill} /> : <Text style={{ ...font.body(fontMetrics.size12, 'bold'), color: colors.inkOnCTAFill }}>{complete ? '✓' : t('loadTypes.complete')}</Text>}
            </Pressable>
          </View>
          {row.extraNote ? <Text style={{ ...font.body(fontMetrics.size12), color: colors.textMuted }}>{row.extraNote}</Text> : null}
          {weightError && loadMode === 'free_weight' && !input.weightText.trim() ? <Text accessibilityLiveRegion="polite" style={{ ...font.body(fontMetrics.size12), color: colors.danger }}>{t('loadTypes.missingWeight', [row.setIndex + 1])}</Text> : null}
        </View>;
      }
      return <View key={row.stableSetId} style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.point6, paddingVertical: spacing.xs, borderRadius: radius.inset, backgroundColor: complete ? colors.successTint : colors.bgInset }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.accessory.details', [row.setIndex + 1])} disabled={readOnly || added || batchBusy || busyRows.has(row.stableSetId)} onPress={() => onRecord(drafts[index])}
            style={{ ...column(0), minHeight: spacing.minimumHitTarget, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.inset }}>
            <Text style={{ ...font.mono(fontMetrics.size15, 'bold'), color: colors.textPrimary }}>{row.kind === 'extra' ? t('student.added.extra') : row.setIndex + 1}</Text>
            {row.hasVideo ? <MaterialCommunityIcons name="video-outline" size={spacing.point14} color={colors.goldText} /> : null}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.accessory.useLast', [row.setIndex + 1])} disabled={readOnly || !row.previous || batchBusy || busyRows.has(row.stableSetId)}
            onPress={() => row.previous && change(index, { ...(row.isBodyweight ? {} : { weightText: row.previous.weightText }), repsText: String(row.previous.reps) })}
            style={{ ...column(1), minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={{ ...font.mono(fontMetrics.size11), color: colors.textMuted, textAlign: 'center' }}>{row.previous ? `${row.isBodyweight ? t('student.accessory.bw') : row.previous.weightText} × ${row.previous.reps}` : '—'}</Text>
          </Pressable>
          {fields.map(([field, kind, label], offset) => row.isBodyweight && field === 'weightText'
            ? <Text key={field} style={{ ...column(2), ...font.mono(fontMetrics.size15, 'bold'), color: colors.textMuted, textAlign: 'center' }}>{t('student.accessory.bw')}</Text>
            : <TextInput key={field} ref={node => { inputs.current[`${row.stableSetId}:${field}`] = node; }}
              onFocus={() => { setFocusedInput(`${row.stableSetId}:${field}`); onInputFocus?.(inputs.current[`${row.stableSetId}:${field}`]); }}
              onBlur={() => { setFocusedInput(current => current === `${row.stableSetId}:${field}` ? null : current); onInputFocus?.(null); }} accessibilityLabel={t(label, [row.setIndex + 1])} value={input[field]}
              placeholder={field === 'weightText' ? row.weightPlaceholder : field === 'rpeText' && !complete ? typeof row.rpePlaceholder === 'string' ? row.rpePlaceholder : t('student.accessory.rir', [row.rpePlaceholder.value]) : ''}
              placeholderTextColor={colors.textMuted} keyboardType={kind === 'reps' ? 'number-pad' : 'decimal-pad'}
              editable={!readOnly && !batchBusy && !busyRows.has(row.stableSetId)} onChangeText={value => change(index, { [field]: filter(value, kind) })}
              style={{ ...column(offset + 2), minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.zero, paddingVertical: spacing.xs, textAlign: 'center', ...font.mono(field === 'rpeText' && !input[field] && typeof row.rpePlaceholder !== 'string' ? fontMetrics.size11 : fontMetrics.size15, input[field] ? 'bold' : 'regular'), color: colors.textPrimary, backgroundColor: complete ? undefined : colors.surfaceCard, borderRadius: radius.inset, borderWidth: complete && !invalidFields.includes(field) && focusedInput !== `${row.stableSetId}:${field}` ? 0 : spacing.point1, borderColor: invalidFields.includes(field) ? colors.danger : focusedInput === `${row.stableSetId}:${field}` ? colors.textPrimary : colors.borderStrong }} />)}
          <Pressable accessibilityRole="button" accessibilityLabel={t(isCancel(index) ? 'student.accessory.undo' : 'student.accessory.complete', [row.setIndex + 1])}
            accessibilityHint={!canAct ? t('student.accessory.needsWeightOne') : undefined} disabled={readOnly || batchBusy || !canAct || busyRows.has(row.stableSetId)} onPress={() => void saveRow(index)}
            accessibilityState={{ disabled: readOnly || batchBusy || !canAct || busyRows.has(row.stableSetId), busy: busyRows.has(row.stableSetId) }}
            style={{ ...column(5), aspectRatio: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: spacing.point2, borderColor: !canAct ? colors.textGhost : complete ? colors.success : colors.textPrimary, backgroundColor: complete ? colors.success : colors.surfaceCard }}>
            {busyRows.has(row.stableSetId) ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <MaterialCommunityIcons name="check" size={spacing.lg} color={!canAct ? colors.textGhost : complete ? colors.inkOnCTAFill : colors.textPrimary} />}
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
    {!readOnly && !added && rows.some(row => !row.kind && row.status === 'pending') ? <AppButton label={t('student.accessory.completeAll')} labelStyle={{ textAlign: 'center' }} loading={batchBusy} disabled={batchBusy || busyRows.size > 0} onPress={() => void completeAll()} /> : null}
  </View>;
}
