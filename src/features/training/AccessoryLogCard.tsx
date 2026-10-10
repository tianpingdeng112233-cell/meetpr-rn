import { useRef, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppButton, font, fontMetrics, radius, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { showToast } from '@/design/Toast';
import { append, type NumberPadField } from '@/design/number-pad';
import type { SetLog, SetLogUpsertRequest } from '@/api/domains/sets';
import { t } from '@/i18n';
import { accessoryLogRequest, accessoryRows, accessoryRowWritable, rowsToCompleteAll } from './accessory-quick-log';
import type { SetLogInput } from './set-log-input';
import type { WorkoutSetDraft } from './model';
import { normalizeDecimalInput } from './policy';
import { useVideoUploadStore } from './video-upload/store';

// Keep the approved column proportions while allowing the six columns to fit small screens.
const columns = [fontMetrics.size36, spacing.xxxl + spacing.sm, spacing.xxxl, spacing.xxl, spacing.xxl, spacing.minimumHitTarget];
const column = (index: number): ViewStyle => ({ flex: columns[index], minWidth: 0 });
const fields = [
  ['weightText', 'weight', 'student.accessory.weightLabel'],
  ['repsText', 'reps', 'student.accessory.repsLabel'],
  ['rpeText', 'rpe', 'student.accessory.rpeLabel'],
] as const;

export function AccessoryLogCard({ drafts, previousLogs, unit, studentId, onRecord, onSave, onInputFocus }: {
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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const saving = useRef(new Set<string>());
  const [busyRows, setBusyRows] = useState<ReadonlySet<string>>(new Set());
  const videos = useVideoUploadStore(state => state.records);
  const rows = accessoryRows({ drafts, previousLogs, unit, videoById: Object.fromEntries(drafts.map(draft => [draft.stableSetId, (videos[`${studentId}:${draft.stableSetId}`]?.status ?? 'none') !== 'none'])) });
  const [edits, setEdits] = useState<Record<string, { revision: string; input: SetLogInput; weightEdited: boolean }>>({});
  const revision = (index: number) => JSON.stringify([drafts[index].sourceLog, rows[index].status, unit]);
  const inputFor = (index: number) => edits[rows[index].stableSetId]?.revision === revision(index) ? edits[rows[index].stableSetId].input : rows[index];
  const change = (index: number, patch: Partial<SetLogInput>) => setEdits(current => ({ ...current, [rows[index].stableSetId]: { revision: revision(index), input: { ...inputFor(index), ...patch }, weightEdited: patch.weightText !== undefined || (current[rows[index].stableSetId]?.revision === revision(index) && current[rows[index].stableSetId].weightEdited) } }));
  const filter = (value: string, field: NumberPadField) => [...normalizeDecimalInput(value)].reduce((text, character) => append(text, character, field), '');
  const isCancel = (index: number) => rows[index].status === 'complete' && fields.every(([field]) => inputFor(index)[field] === rows[index][field]);
  const saveRow = async (index: number) => {
    const row = rows[index];
    if (!onSave || batch.current || saving.current.has(row.stableSetId) || (!isCancel(index) && !accessoryRowWritable(row, inputFor(index)).writable)) return;
    if (isCancel(index) && row.hasVideo) { showToast(t('student.accessory.videoWarning')); return; }
    saving.current.add(row.stableSetId);
    setBusyRows(new Set(saving.current));
    try { await onSave(drafts[index], accessoryLogRequest(row, inputFor(index), { planExerciseId: drafts[index].exercise.id, action: isCancel(index) ? 'cancel' : 'complete' }), 'single'); }
    catch { /* The page owns the existing save-failure alert; keep the inputs for retry. */ }
    finally { saving.current.delete(row.stableSetId); setBusyRows(new Set(saving.current)); }
  };
  const completeAll = async () => {
    if (!onSave || batch.current || saving.current.size) return;
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
    <View style={{ flexDirection: 'row', gap: spacing.point6 }}>
      {[t('student.accessory.set'), t('student.accessory.last'), unit.toUpperCase(), t('student.setEntrySheet.copy003'), t('chat.rpeMetric'), t('student.workoutCompletionFlowView.copy003')].map((label, index) =>
        <Text key={index} style={{ ...column(index), ...font.mono(fontMetrics.size10), color: colors.textMuted, textAlign: 'center' }}>{label}</Text>)}
    </View>
    {rows.map((row, index) => {
      const input = inputFor(index);
      const validation = accessoryRowWritable(row, input);
      const complete = row.status === 'complete';
      const weightEdited = edits[row.stableSetId]?.revision === revision(index) && edits[row.stableSetId].weightEdited;
      const invalidFields = validation.invalidFields.filter(field => field !== 'weightText' || input.weightText !== '' || weightEdited || (showSkipped && row.status === 'pending'));
      const canAct = isCancel(index) || validation.writable;
      return <View key={row.stableSetId} style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.point6, paddingVertical: spacing.xs, borderRadius: radius.inset, backgroundColor: complete ? colors.successTint : colors.bgInset }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.accessory.details', [row.setIndex + 1])} disabled={batchBusy || busyRows.has(row.stableSetId)} onPress={() => onRecord(drafts[index])}
            style={{ ...column(0), minHeight: spacing.minimumHitTarget, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.inset }}>
            <Text style={{ ...font.mono(fontMetrics.size15, 'bold'), color: colors.textPrimary }}>{row.setIndex + 1}</Text>
            {row.hasVideo ? <MaterialCommunityIcons name="video-outline" size={spacing.point14} color={colors.goldText} /> : null}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.accessory.useLast', [row.setIndex + 1])} disabled={!row.previous || batchBusy || busyRows.has(row.stableSetId)}
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
              editable={!batchBusy && !busyRows.has(row.stableSetId)} onChangeText={value => change(index, { [field]: filter(value, kind) })}
              style={{ ...column(offset + 2), minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.zero, paddingVertical: spacing.xs, textAlign: 'center', ...font.mono(field === 'rpeText' && !input[field] && typeof row.rpePlaceholder !== 'string' ? fontMetrics.size11 : fontMetrics.size15, input[field] ? 'bold' : 'regular'), color: colors.textPrimary, backgroundColor: complete ? undefined : colors.surfaceCard, borderRadius: radius.inset, borderWidth: complete && !invalidFields.includes(field) && focusedInput !== `${row.stableSetId}:${field}` ? 0 : spacing.point1, borderColor: invalidFields.includes(field) ? colors.danger : focusedInput === `${row.stableSetId}:${field}` ? colors.textPrimary : colors.borderStrong }} />)}
          <Pressable accessibilityRole="button" accessibilityLabel={t(isCancel(index) ? 'student.accessory.undo' : 'student.accessory.complete', [row.setIndex + 1])}
            accessibilityHint={!canAct ? t('student.accessory.needsWeightOne') : undefined} disabled={batchBusy || !canAct || busyRows.has(row.stableSetId)} onPress={() => void saveRow(index)}
            accessibilityState={{ disabled: batchBusy || !canAct || busyRows.has(row.stableSetId), busy: busyRows.has(row.stableSetId) }}
            style={{ ...column(5), aspectRatio: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: spacing.point2, borderColor: !canAct ? colors.textGhost : complete ? colors.success : colors.textPrimary, backgroundColor: complete ? colors.success : colors.surfaceCard }}>
            {busyRows.has(row.stableSetId) ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <MaterialCommunityIcons name="check" size={spacing.lg} color={!canAct ? colors.textGhost : complete ? colors.inkOnCTAFill : colors.textPrimary} />}
          </Pressable>
        </View>
        {row.extraNote ? <Text style={{ ...font.body(fontMetrics.size12), color: colors.textMuted }}>{row.extraNote}</Text> : null}
      </View>;
    })}
    {skippedCount > 0 ? <Text accessibilityLiveRegion="polite" style={{ ...font.body(fontMetrics.size12), color: colors.goldText }}>{t(skippedCount === 1 ? 'student.accessory.needsWeightOne' : 'student.accessory.needsWeightMany', [skippedCount])}</Text> : null}
    <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center', marginTop: spacing.xs }}>
      <MaterialCommunityIcons name="video-outline" size={spacing.base} color={colors.textSecondary} />
      <Text style={{ flex: 1, ...font.body(fontMetrics.size12), color: colors.textSecondary }}>{t('student.accessory.hint')}</Text>
    </View>
    {rows.some(row => row.status === 'pending') ? <AppButton label={t('student.accessory.completeAll')} labelStyle={{ textAlign: 'center' }} loading={batchBusy} disabled={batchBusy || busyRows.size > 0} onPress={() => void completeAll()} /> : null}
  </View>;
}
