import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { Card, font, Screen, useColors } from '@/design';
import { NumberPad } from '@/design/NumberPad';
import type { NumberPadField } from '@/design/number-pad';
import { decodePrescription, prescriptionSummary } from '@/domain/plan/prescription';
import { localDateText } from '@/domain/plan/workout-date-policy';
import { getLocale } from '@/i18n';
import { training22 as copy } from './build22-strings';
import { HoldToCompleteButton } from './HoldToCompleteButton';
import { localNoon, type QuickLogOutcome, type QuickLogPlan } from './quick-log';

type Cell = { id: string; field: NumberPadField };
const fieldKey = { weight: 'weightText', reps: 'repsText', rpe: 'rpeText' } as const;
export function QuickLogSheet({ initialPlan, dayCode, subtitle, exerciseName, onSubmit, onClose }: {
  initialPlan: QuickLogPlan; dayCode: string; subtitle: string;
  exerciseName: (exerciseId: string) => string;
  onSubmit: (plan: QuickLogPlan) => Promise<QuickLogOutcome>; onClose: () => void;
}) {
  const colors = useColors();
  const [plan, setPlan] = useState(initialPlan);
  const [cell, setCell] = useState<Cell | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [locked, setLocked] = useState(false);
  const groups = [...new Set(plan.rows.map(row => row.draft.exercise.id))].map(id => ({ id, rows: plan.rows.filter(row => row.draft.exercise.id === id) }));
  const included = plan.rows.filter(row => row.included);
  const selected = cell ? plan.rows.find(row => row.draft.stableSetId === cell.id) : null;
  const update = (value: number, sync = false) => {
    if (!cell || locked || busy) return;
    setPlan(previous => ({ ...previous, rows: previous.rows.map(row => row.draft.stableSetId === cell.id || (sync && cell.field === 'weight' && row.draft.exercise.id === selected?.draft.exercise.id)
      ? { ...row, automaticWeight: cell.field === 'weight' ? false : row.automaticWeight, draft: { ...row.draft, [fieldKey[cell.field]]: String(value) } } : row) }));
  };
  const next = (value: number) => {
    update(value);
    if (!cell) return;
    const fields: NumberPadField[] = ['weight', 'reps', 'rpe'];
    const index = fields.indexOf(cell.field);
    const rowIndex = plan.rows.findIndex(row => row.draft.stableSetId === cell.id);
    if (index < 2) setCell({ ...cell, field: fields[index + 1] });
    else { const row = plan.rows.slice(rowIndex + 1).find(item => item.included); setCell(row ? { id: row.draft.stableSetId, field: 'weight' } : null); }
  };
  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setCell(null);
    try {
      const outcome = await onSubmit(plan);
      if (outcome.kind === 'partialFailure') { setLocked(outcome.written > 0); Alert.alert(copy.title(dayCode), copy.partial(outcome.written, outcome.remaining)); }
      else if (outcome.kind === 'completionFailed') { setLocked(true); Alert.alert(copy.title(dayCode), copy.completionFailed); }
      else if (outcome.kind === 'invalid') Alert.alert(copy.title(dayCode), copy.invalid);
    } finally { inFlight.current = false; setBusy(false); }
  };
  const close = () => { if (!inFlight.current) onClose(); };
  const pressed = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }], minWidth: 48, minHeight: 48, justifyContent: 'center' as const });
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { if (cell) setCell(null); else close(); }}>
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ paddingHorizontal: 18, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.back} disabled={busy} onPress={close} style={pressed}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} /></Pressable>
        <View style={{ flex: 1, alignItems: 'center', paddingRight: 48 }}><Text style={{ ...font.display(20), color: colors.textPrimary }}>{copy.title(dayCode)}</Text><Text style={{ ...font.body(12), color: colors.textMuted }}>{subtitle}</Text></View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 32 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${copy.date}: ${plan.selectedDate}`} disabled={busy || locked} onPress={() => setCalendarOpen(true)} style={({ pressed }) => ({ minHeight: 56, opacity: pressed ? 0.85 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 16, backgroundColor: colors.surfaceCard, gap: 10 })}>
          <View style={{ flex: 1, gap: 4 }}><Text style={{ ...font.body(14, 'semibold'), color: colors.textPrimary }}>{copy.date}</Text><Text style={{ ...font.body(10), color: colors.textMuted }}>{plan.minimumDate} – {plan.maximumDate}</Text></View>
          <Text style={{ ...font.mono(12), color: colors.textPrimary, backgroundColor: colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 }}>{localNoon(plan.selectedDate).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', weekday: 'short' })}</Text>
        </Pressable>
        {locked ? <Text style={{ ...font.body(13), color: colors.textSecondary }}>{copy.locked}</Text> : null}
        {groups.map((group, ordinal) => {
          const count = group.rows.filter(row => row.included).length;
          const visible = count > 0 || expanded[group.id];
          return <Card key={group.id} style={{ padding: 14, gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={exerciseName(group.rows[0].draft.exercise.exercise_id)} onPress={() => setExpanded(previous => ({ ...previous, [group.id]: !previous[group.id] }))} style={{ minHeight: 48, justifyContent: 'center', gap: 4 }}>
              <Text style={{ ...font.body(15, 'bold'), color: colors.textPrimary }}>{ordinal + 1} · {exerciseName(group.rows[0].draft.exercise.exercise_id)}</Text>
              <Text style={{ ...font.mono(11), color: colors.textSecondary }}>{prescriptionSummary(group.rows.map(row => ({ prescription: decodePrescription(row.draft.planSet) })))}</Text>
              <Text style={{ ...font.mono(11), color: colors.textMuted }}>{copy.count(count, group.rows.length)}{count === 0 ? ` · ${copy.skipped}` : ''}</Text>
            </Pressable>
            {visible ? <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>{['#', copy.weight, copy.reps, 'RPE', copy.include].map((label, index) => <Text key={label} style={{ flex: index === 0 ? 0.45 : 1, textAlign: 'center', ...font.mono(10), color: colors.textMuted }}>{label}</Text>)}</View>
              {group.rows.map(row => <View key={row.draft.stableSetId} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ flex: 0.45, textAlign: 'center', ...font.mono(12), color: colors.textMuted }}>{row.draft.setIndex + 1}</Text>
                {(['weight', 'reps', 'rpe'] as NumberPadField[]).map(field => <Pressable key={field} accessibilityRole="button" accessibilityLabel={`${exerciseName(row.draft.exercise.exercise_id)}, set ${row.draft.setIndex + 1}, ${field}, ${row.draft[fieldKey[field]] || '—'}`} disabled={busy || locked || !row.included} onPress={() => setCell({ id: row.draft.stableSetId, field })} style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: cell?.id === row.draft.stableSetId && cell.field === field ? colors.gold500 : 'transparent', opacity: row.included ? pressed ? 0.85 : 1 : 0.35 })}>
                  <Text style={{ ...font.mono(15, 'semibold'), color: colors.textPrimary, textDecorationLine: row.included ? 'none' : 'line-through' }}>{row.draft[fieldKey[field]] || '—'}</Text>
                  {field === 'weight' && row.automaticWeight ? <Text style={{ ...font.body(9), color: colors.textMuted }}>{copy.auto}</Text> : null}
                </Pressable>)}
                <Pressable accessibilityRole="checkbox" accessibilityLabel={`${copy.include} set ${row.draft.setIndex + 1}`} accessibilityState={{ checked: row.included, disabled: busy || locked }} disabled={busy || locked} onPress={() => setPlan(previous => ({ ...previous, rows: previous.rows.map(item => item === row ? { ...item, included: !item.included } : item) }))} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name={row.included ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} color={row.included ? colors.success : colors.textMuted} size={24} /></Pressable>
              </View>)}
              {count === 0 ? <Pressable disabled={busy || locked} accessibilityRole="button" onPress={() => setPlan(previous => ({ ...previous, rows: previous.rows.map(row => row.draft.exercise.id === group.id ? { ...row, included: true } : row) }))} style={pressed}><Text style={{ color: colors.goldText, ...font.body(13) }}>{copy.restore}</Text></Pressable> : null}
            </> : null}
          </Card>;
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: 18, paddingVertical: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.borderDefault }}>
        <Text style={{ ...font.body(12), color: colors.textSecondary, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong }}>{included.length ? copy.summary(new Set(included.map(row => row.draft.exercise.id)).size, included.length) : copy.empty}</Text>
        {busy ? <View style={{ minHeight: 58, justifyContent: 'center', alignItems: 'center', gap: 5 }}><ActivityIndicator color={colors.gold500} /><Text style={{ ...font.body(12), color: colors.textMuted }}>{copy.saving}</Text></View> : <HoldToCompleteButton label={copy.hold} disabled={!included.length} onComplete={() => void submit()} />}
      </View>
      {cell && selected ? <NumberPad key={`${cell.id}:${cell.field}`} field={cell.field} initialValue={selected.draft[fieldKey[cell.field]] || '0'} minimumWeight={0} contextText={`${selected.draft.setIndex + 1} · ${cell.field}`} syncTitle={copy.sync(groups.find(group => group.id === selected.draft.exercise.id)?.rows.length ?? 0)} nextTitle={copy.next} commitTitle={copy.done} onSync={cell.field === 'weight' ? value => update(value, true) : undefined} onNext={next} onCancel={() => setCell(null)} onCommit={value => { update(value); setCell(null); }} /> : null}
      {calendarOpen ? <QuickLogCalendar selected={plan.selectedDate} minimum={plan.minimumDate} maximum={plan.maximumDate} onClose={() => setCalendarOpen(false)} onSelect={date => { setPlan(previous => ({ ...previous, selectedDate: date })); setCalendarOpen(false); }} /> : null}
    </Screen>
  </Modal>;
}

function QuickLogCalendar({ selected, minimum, maximum, onSelect, onClose }: { selected: string; minimum: string; maximum: string; onSelect: (date: string) => void; onClose: () => void }) {
  const colors = useColors();
  const [month, setMonth] = useState(() => { const date = localNoon(selected); date.setDate(1); return date; });
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const dates = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1, 12));
  return <Modal visible transparent animationType="none" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: colors.numberPadScrim, justifyContent: 'center', padding: 12 }}>
      <Card style={{ padding: 0, gap: 8, overflow: 'hidden' }}><ScrollView horizontal contentContainerStyle={{ minWidth: 336, flexGrow: 1 }}><View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.previousMonth} disabled={localDateText(new Date(month.getFullYear(), month.getMonth(), 0, 12)) < minimum} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} /></Pressable>
          <Text style={{ flex: 1, textAlign: 'center', color: colors.textPrimary, ...font.body(16, 'bold') }}>{month.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' })}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.nextMonth} disabled={localDateText(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12)) > maximum} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="chevron-right" size={24} color={colors.textPrimary} /></Pressable>
        </View>
        {Array.from({ length: 6 }, (_, week) => <View key={week} style={{ flexDirection: 'row' }}>{dates.slice(week * 7, week * 7 + 7).map(date => {
          const value = localDateText(date); const disabled = value < minimum || value > maximum || date.getMonth() !== month.getMonth();
          return <Pressable key={value} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString(getLocale(), { dateStyle: 'full' })} accessibilityState={{ selected: value === selected, disabled }} disabled={disabled} onPress={() => onSelect(value)} style={{ flex: 1, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: value === selected ? colors.gold500 : 'transparent', opacity: disabled ? 0.25 : 1 }}><Text style={{ ...font.mono(14), color: value === selected ? colors.ctaText : colors.textPrimary }}>{date.getDate()}</Text></Pressable>;
        })}</View>)}
        </View></ScrollView><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" onPress={() => onSelect(maximum)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}><Text style={{ color: colors.goldText, ...font.body(14) }}>{copy.today}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}><Text style={{ color: colors.textSecondary, ...font.body(14) }}>{copy.back}</Text></Pressable>
        </View>
      </Card>
    </View>
  </Modal>;
}
