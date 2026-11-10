import { prescriptionDifferences } from '@/domain/plan/prescription-result';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { font, GradientFill, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { NumberPad, type NumberPadHandle } from '@/design/NumberPad';
import { accessoryValue, type NumberPadField } from '@/design/number-pad';
import { t } from '@/i18n';
import type { PlanExercise } from '@/api/domains/plans';
import { decodePrescription } from '@/domain/plan/prescription';
import type { AllDaySheet } from './all-day-sheet';
import type { WorkoutSetDraft } from './model';
import { VideoAttachmentControls } from './video-upload/VideoAttachmentControls';
import { allDayLogRequest } from './all-day-sheet';
import { summarizeExercise, type ExerciseSummaryActual } from './exercise-summary';
import { metricDisplay, metricStored, POUNDS_PER_KG } from '@/domain/measurement';

function displayWeight(text: string, unit: 'kg' | 'lb') {
  return text && unit === 'lb' ? metricDisplay(text, POUNDS_PER_KG) || '0' : text;
}

export function AllDayBody({ sheet, editable, studentId, title, exerciseName, allowsRIR, onSave, onToggle, onExpand, onNote, onAddSet, onRemoveSet, onAddExercise, onRemoveExercise, ensureSetLog, editor, unit = 'kg' }: {
  unit?: 'kg' | 'lb'; onExpand: (id: string) => void;
  sheet: AllDaySheet; editable: boolean; studentId: string; title: string;
  exerciseName: (id: string) => string; allowsRIR: (id: string) => boolean;
  onSave: (row: WorkoutSetDraft) => void; onToggle: (id: string) => void; onNote?: (row: WorkoutSetDraft) => void;
  onAddSet: (exercise: PlanExercise) => void; onRemoveSet: (row: WorkoutSetDraft) => void;
  onAddExercise: () => void; onRemoveExercise: (exercise: PlanExercise) => void;
  ensureSetLog: (row: WorkoutSetDraft) => Promise<string>;
  editor: ReturnType<typeof useAllDayEditor>;
}) {
  const colors = useColors();
  const { editing, edit, pad, rowViews } = editor;
  const count = sheet.exercises.reduce((n, block) => n + block.rows.length, 0);
  return <>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ ...font.body(15, 'semibold'), color: colors.textPrimary }}>{t('training.allDay.summary', [title, sheet.exercises.length])}</Text>
      <Text style={{ ...font.body(12), color: colors.textMuted, flexShrink: 1 }}>{t(editable ? 'training.allDay.hint' : 'training.allDay.setCount', [count])}</Text>
    </View>
    {sheet.exercises.map(block => {
      const name = exerciseName(block.exercise.exercise_id);
      const done = block.node === 'complete';
      const expanded = !block.collapsed;
      const current = block.node === 'current';
      const nodeColor = done ? colors.success : current ? colors.gold500 : colors.textGhost;
      const summary = summarizeExercise(block.exercise.sets,
        block.rows.flatMap<ExerciseSummaryActual>(row => row.sourceLog ? [row.sourceLog] : row.kind && (row.weightText || row.repsText || row.rpeText) ? [allDayLogRequest(row)] : []),
        block.rows.filter(row => !row.sourceLog && row.weightText).map(row => ({ plan_set_id: row.planSet.id, weight_kg: row.weightText })),
        { unit, labels: { bodyweight: t('loadTypes.bodyweight'), freeWeight: t('training.allDay.freeWeight'), topSet: t('training.allDay.topSet'), unrecorded: t('training.allDay.unrecorded') } });
      const toggleExpanded = () => { pad.current?.dismiss(); onExpand(block.exercise.id); };
      return <View key={block.exercise.id} style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 22, alignItems: 'center' }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: nodeColor, alignItems: 'center', justifyContent: 'center', marginTop: 5, outlineColor: colors.goldSoft, outlineWidth: current ? 4 : 0 }}>
            {current ? <GradientFill direction="vertical" stops={[{ color: colors.goldGradientStart, offset: 0 }, { color: colors.goldGradientEnd, offset: 1 }]} /> : null}
            {done ? <MaterialCommunityIcons name="check" size={15} color={colors.inkOnCTAFill} /> : null}
          </View>
          <View style={{ flex: 1, width: 3, backgroundColor: nodeColor, minHeight: 12, overflow: 'hidden' }}>{current ? <GradientFill direction="vertical" stops={[{ color: colors.goldGradientStart, offset: 0 }, { color: colors.goldGradientEnd, offset: 1 }]} /> : null}</View>
        </View>
        <View style={{ flex: 1, gap: 8, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: expanded ? colors.gold500 : 'transparent', backgroundColor: expanded ? colors.goldSoft : undefined }}>
            <Pressable testID={`all-day-exercise-${block.exercise.id}`} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ expanded }} onPress={toggleExpanded} style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                {!block.repeatName ? <Text numberOfLines={2} testID={`all-day-name-${block.exercise.id}`} style={{ ...font.body(15, 'bold'), color: done ? colors.textSecondary : colors.textPrimary }}>{name}{block.rows[0]?.kind === 'added' ? ` · ${t('student.added.added')}` : ''}</Text> : null}
              </View>
              <View style={{ flex: 1.4, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 4 }}>
                {summary.map((segment, index) => <Text key={index} style={{ flexShrink: 1 }}>
                  {index ? <Text style={{ color: colors.textMuted }}> · </Text> : null}
                  <Text style={{ ...font.mono(14), color: segment.short ? colors.danger : segment.repsChanged ? colors.goldText : colors.textSecondary }}>{segment.setsReps}</Text>
                  {segment.setsReps ? '  ' : ''}
                  <Text style={{ ...font.mono(segment.intensityOnly ? 13 : 15, 'bold') }}>{segment.loadParts.map((part, partIndex) => <Text key={partIndex} style={{ color: part.changed || segment.intensityOnly ? colors.goldText : colors.textPrimary }}>{part.text}</Text>)}</Text>
                </Text>)}
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ expanded }} onPress={toggleExpanded} style={{ minHeight: 48, width: 16, justifyContent: 'center' }}><MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textSecondary} /></Pressable>
            {editable ? <Pressable testID={`all-day-check-${block.exercise.id}`} accessibilityRole="checkbox" accessibilityLabel={t(done ? 'training.allDay.expand' : 'training.allDay.completeExercise')} accessibilityState={{ checked: done }} onPress={() => { pad.current?.dismiss(); onToggle(block.exercise.id); }} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: done ? colors.success : colors.textSecondary, backgroundColor: done ? colors.success : undefined, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="check" size={17} color={done ? colors.inkOnCTAFill : colors.textSecondary} /></Pressable> : null}
          </View>
          {expanded ? <>
            {editable && block.rows[0]?.kind === 'added' ? <Pressable onPress={() => onRemoveExercise(block.exercise)}><Text style={{ color: colors.danger }}>{t('student.added.remove')}</Text></Pressable> : null}
            {block.exercise.notes ? <Text numberOfLines={1} style={{ ...font.body(12), color: colors.goldText }}>{t('training.allDay.coachNote', [block.exercise.notes])}</Text> : null}
            <View style={{ borderRadius: 12, backgroundColor: colors.surfaceCard, overflow: 'hidden' }}>
              {block.rows.map(row => {
                const active = editing?.row.stableSetId === row.stableSetId;
                const display = active ? editing.row : row;
                const prescription = decodePrescription(row.planSet);
                const short = !row.kind && Number(display.repsText) < prescription.reps;
                const differences = row.kind ? null : prescriptionDifferences(allDayLogRequest(display), row.planSet);
                const weightChanged = differences?.weight != null;
                const textColor = weightChanged ? colors.goldText : colors.textPrimary;
                return <View onTouchEnd={event => event.stopPropagation()} testID={`all-day-row-${row.stableSetId}`} key={row.stableSetId} ref={view => { if (view) rowViews.current.set(row.stableSetId, view); else rowViews.current.delete(row.stableSetId); }} style={{ borderBottomWidth: 1, borderBottomColor: colors.borderDefault, backgroundColor: active ? colors.goldSoft : short ? colors.dangerSoft : undefined }}>
                  {active ? <View style={{ flexDirection: 'row', padding: 8, gap: 8 }}>
                    {(['weight', 'reps', display.effortKind === 'rir' ? 'rir' : 'rpe'] as const).map(field => <View key={field} style={{ flex: field === 'weight' ? 1.5 : 1, gap: 4 }}>
                      <Pressable disabled={field === 'weight' || field === 'reps' || !allowsRIR(row.exercise.exercise_id)} onPress={() => {
                        const switched = { ...display, effortKind: display.effortKind === 'rir' ? 'rpe' as const : 'rir' as const, rpeText: '' };
                        onSave(switched); edit(switched, switched.effortKind);
                      }}><Text style={{ ...font.body(11), color: colors.textSecondary }}>{field === 'weight' ? t('training.allDay.weightUnit', [unit]) : field === 'reps' ? t('student.accessory.pad.reps') : field.toUpperCase()}</Text></Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={field} onPress={() => edit(display, field)} style={{ minHeight: 38, borderRadius: 8, borderWidth: 1.5, borderColor: editing.field === field ? colors.gold500 : colors.borderDefault, outlineWidth: editing.field === field ? 2 : 0, outlineColor: colors.goldSoft, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ ...font.mono(16), color: colors.textPrimary }}>{(field === 'weight' ? editing.weightInput ?? displayWeight(display.weightText, unit) : field === 'reps' ? display.repsText : display.rpeText) || '—'}</Text></Pressable>
                    </View>)}
                  </View> : <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 38 }}>
                    <Pressable disabled={!editable} accessibilityRole="button" accessibilityLabel={t('training.allDay.editSet', [row.setIndex + 1])} onPress={() => edit(row)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 38, paddingHorizontal: 8, gap: 8 }}>
                      <Text style={{ ...font.mono(12), color: colors.textMuted, width: 18 }}>{row.setIndex + 1}</Text>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 3 }}>
                        <Text style={{ ...font.mono(15, 'semibold'), color: textColor }}>{displayWeight(display.weightText, unit) || '—'}</Text><Text style={{ ...font.body(12), color: colors.textMuted }}>{unit}</Text>
                        {weightChanged ? <Text style={{ ...font.body(11), color: colors.textMuted }}>{t('training.allDay.original', [unit === 'lb' ? differences!.weight!.replace(/\d+(?:\.\d+)?/g, value => displayWeight(value, unit)) : differences!.weight!])}</Text> : null}
                        <Text style={{ ...font.mono(15, 'semibold'), color: short ? colors.danger : differences?.reps ? colors.goldText : colors.textPrimary }}>× {short ? `${display.repsText}/${prescription.reps}` : display.repsText || '—'}</Text>
                        {differences?.reps && !short ? <Text style={{ ...font.body(11), color: colors.textMuted }}>{t('training.allDay.original', [differences.reps])}</Text> : null}
                      </View>
                      <View><Text style={{ ...font.mono(13), color: differences?.effort ? colors.goldText : colors.textSecondary }}>{display.rpeText ? `${display.effortKind === 'rir' ? 'RIR' : 'RPE'} ${display.rpeText}` : '—'}</Text>{differences?.effort ? <Text style={{ ...font.body(11), color: colors.textMuted }}>{t('training.allDay.original', [differences.effort])}</Text> : null}</View>
                    </Pressable>
                    {editable ? <VideoAttachmentControls compact studentId={studentId} stableSetId={row.stableSetId} editable buildLogRequest={() => allDayLogRequest(row)} ensureSetLog={() => ensureSetLog(row)} /> : null}
                    {editable && row.kind === 'extra' ? <Pressable accessibilityLabel={t('student.added.removeSet')} onPress={() => onRemoveSet(row)}><MaterialCommunityIcons name="close" size={18} color={colors.textMuted} /></Pressable> : null}
                  </View>}
                  {row.planSet.coach_note ? <Text style={{ paddingHorizontal: 8, ...font.body(11), color: colors.goldText }}>{t('training.allDay.coachNote', [row.planSet.coach_note])}</Text> : null}
                </View>;
              })}
            </View>
            {editable ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pressable onPress={() => onAddSet(block.exercise)}><Text style={{ ...font.body(13), color: colors.goldText }}>{t('student.added.addSet')}</Text></Pressable>
              {onNote && block.rows[0] ? <Pressable accessibilityRole="button" accessibilityLabel={t('training.allDay.note', [name])} onPress={() => onNote(block.rows[0])} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40 }}><MaterialCommunityIcons name="message-outline" size={16} color={colors.textSecondary} /><Text style={{ ...font.body(13), color: colors.textSecondary }}>{t('training.allDay.askCoach')}</Text></Pressable> : null}
            </View> : null}
          </> : null}
        </View>
      </View>;
    })}
    {editable ? <Pressable accessibilityRole="button" onPress={onAddExercise}><Text style={{ color: colors.goldText, ...font.body(14) }}>{t('student.added.addExercise')}</Text></Pressable> : null}

  </>;
}


export function useAllDayEditor(onSave: (row: WorkoutSetDraft) => void, exerciseName: (id: string) => string,
  onPadLayout: (row: View | null, panel: { top: number; height: number } | null) => void, scopeKey: string, unit: 'kg' | 'lb' = 'kg') {
  const [editing, setEditing] = useState<{ row: WorkoutSetDraft; field: NumberPadField; weightInput?: string } | null>(null);
  const [previousScope, setPreviousScope] = useState(scopeKey);
  if (previousScope !== scopeKey) {
    setPreviousScope(scopeKey);
    setEditing(null);
  }
  const input = useRef(editing);
  useLayoutEffect(() => { input.current = editing; }, [editing]);
  useLayoutEffect(() => {
    input.current = null;
    onPadLayout(null, null);
  }, [scopeKey, onPadLayout]);
  const rowViews = useRef(new Map<string, View>());
  const pad = useRef<NumberPadHandle>(null);
  const close = () => { setEditing(null); onPadLayout(null, null); };
  const edit = (row: WorkoutSetDraft, field: NumberPadField = 'weight') => {
    setEditing({ row, field });
  };
  const change = (text: string) => {
    const current = input.current;
    if (!current) return;
    const key = current.field === 'weight' ? 'weightText' : current.field === 'reps' ? 'repsText' : 'rpeText';
    const value = current.field === 'weight' && unit === 'lb' && text.trim() && Number(text) !== 0 ? metricStored(text, POUNDS_PER_KG) : text;
    const row = { ...current.row, [key]: value };
    input.current = { ...current, row, ...(current.field === 'weight' ? { weightInput: text } : {}) }; setEditing(input.current);
    if (accessoryValue(text, current.field) !== undefined) onSave(row);
  };
  useEffect(() => {
    if (!editing) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { pad.current?.dismiss(); return true; });
    return () => back.remove();
  }, [editing]);
  const panel = editing ? <NumberPad ref={pad} key={`${editing.row.stableSetId}:${editing.field}`} layout="allDay" unit={unit} mode="accessory" field={editing.field} minimumWeight={0}
      initialValue={editing.field === 'weight' ? editing.weightInput ?? displayWeight(editing.row.weightText, unit) : editing.field === 'reps' ? editing.row.repsText : editing.row.rpeText}
      contextText={t('student.accessory.pad.context', [exerciseName(editing.row.exercise.exercise_id), editing.row.setIndex + 1, editing.field === 'weight' ? t('training.allDay.weightUnit', [unit]) : editing.field === 'reps' ? t('student.accessory.pad.reps') : editing.field.toUpperCase()])}
      nextTitle={t('student.accessory.pad.next', [editing.field === 'weight' ? t('student.accessory.pad.reps') : editing.row.effortKind === 'rir' ? 'RIR' : 'RPE']) + ' →'}
      onNext={editing.field === 'weight' || editing.field === 'reps' ? () => edit(input.current!.row, editing.field === 'weight' ? 'reps' : editing.row.effortKind === 'rir' ? 'rir' : 'rpe') : undefined}
      onPanelLayout={(top, height) => onPadLayout(rowViews.current.get(editing.row.stableSetId) ?? null, { top, height })}
      onChangeText={change} onCancel={close} onDismiss={close} onCommit={close} commitTitle={t('training.allDay.done')} /> : null;
  return { editing, edit, pad, rowViews, panel, close };
}
