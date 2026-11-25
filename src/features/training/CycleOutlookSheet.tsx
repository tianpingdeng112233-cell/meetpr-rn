import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, PanResponder, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppButton, font, radius, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { cycleOutlook, OUTLOOK_MATH, type OutlookCell, type OutlookInput } from '@/domain/plan/cycle-outlook';
import { t } from '@/i18n';
import type { ExerciseMetadataResolver } from './exercise-metadata';
import { useCurrentE1RM } from './use-current-e1rm';

const COLUMN_WIDTH = 56;
const COLUMN_GAP = 4;
const MIN_BAR_HEIGHT = 12;
const MAX_BAR_HEIGHT = 72;
const DONE_OPACITY = 0.32;
export const outlookCopy = () => ({ approximate: t('cycleOutlook.approximate'), skipped: t('cycleOutlook.skipped'), unscheduled: t('cycleOutlook.unscheduled'), notTrained: t('cycleOutlook.notTrained') });

function Column({ cell, family, width, onSelect }: { family: string; cell: OutlookCell; width: number; onSelect: (dayId: string) => void }) {
  const colors = useColors();
  const height = cell.state === 'notTrained' ? 2 : cell.state === 'unscheduled' ? 20 : MIN_BAR_HEIGHT + (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * (cell.ratio ?? OUTLOOK_MATH.equalRatio);
  const textColor = cell.isTop ? colors.goldText : cell.done ? colors.textPrimary : cell.state === 'scheduled' ? colors.textSecondary : colors.textMuted;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !cell.dayId }} disabled={!cell.dayId}
    accessibilityLabel={`W${cell.week}${cell.isCurrent ? ` ${t('cycleOutlook.current')}` : ''} ${cell.main} ${cell.sub}`}
    testID={`cycle-outlook-${family}-${cell.week}`} onPress={() => { if (cell.dayId) onSelect(cell.dayId); }}
    style={{ width, justifyContent: 'flex-end', minHeight: 144 }}>
    <View style={{ height: 112, justifyContent: 'flex-end' }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...font.mono(12, 'semibold'), color: textColor, textAlign: 'center' }}>{cell.main}</Text>
      {cell.sub ? <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...font.mono(10), color: cell.isTop ? colors.goldText : colors.textMuted, textAlign: 'center', paddingBottom: 4 }}>
        {cell.shortReps ? <>×<Text style={{ color: colors.danger }}>{cell.shortReps}</Text>{cell.sub.slice(1 + cell.shortReps.length)}</> : cell.sub}
      </Text> : <View style={{ height: 4 }} />}
      <View style={{ height, borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: 'hidden', borderWidth: cell.isCurrent || cell.state === 'unscheduled' ? 1.5 : 0, borderColor: cell.isCurrent ? colors.gold500 : colors.textMuted, borderStyle: cell.state === 'unscheduled' ? 'dashed' : 'solid' }}>
        {cell.isTop ? <Svg width="100%" height="100%"><Defs><LinearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.goldGradientEnd} /><Stop offset="1" stopColor={colors.gold500} /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#gold)" /></Svg>
          : cell.state !== 'unscheduled' ? <View style={{ flex: 1, backgroundColor: cell.done ? colors.gold500 : colors.borderDefault, opacity: cell.done ? DONE_OPACITY : 1 }} /> : null}
      </View>
    </View>
    <View style={{ minHeight: 32, borderTopWidth: 1, borderTopColor: colors.borderDefault, paddingTop: 5 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...font.mono(11, 'semibold'), textAlign: 'center', color: cell.isTop ? colors.goldText : cell.isCurrent ? colors.textPrimary : colors.textMuted }}>
        {cell.done ? <Text style={{ color: colors.goldText }}>✓ </Text> : null}W{cell.week}{cell.isCurrent ? <Text style={font.body(10)}> {t('cycleOutlook.current')}</Text> : null}
      </Text>
    </View>
  </Pressable>;
}

export function CycleOutlookSheet({ input, studentId, resolveExercise, onClose, onSelect }: {
  input: Omit<OutlookInput, 'e1rmByExercise' | 'copy'>; studentId: string; resolveExercise: ExerciseMetadataResolver; onClose: () => void; onSelect: (id: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const ids = [...new Set(input.plan?.days.flatMap(d => d.exercises.map(e => e.exercise_id)) ?? [])];
  const estimates = useCurrentE1RM(studentId, ids, resolveExercise);
  const outlook = useMemo(() => cycleOutlook({ ...input, e1rmByExercise: estimates.data?.byExercise ?? {}, copy: outlookCopy() }), [input, estimates.data]);
  const [width, setWidth] = useState(0);
  const scrolls = useRef<(ScrollView | null)[]>([]);
  const activeRow = useRef<number | null>(null);
  const long = outlook.totalWeeks > 5;
  const columnWidth = long ? COLUMN_WIDTH : Math.max(0, (width - COLUMN_GAP * (outlook.totalWeeks - 1)) / Math.max(1, outlook.totalWeeks));
  const initialX = long && !input.preview ? Math.max(0, (input.currentWeek ?? 1) - 2) * (COLUMN_WIDTH + COLUMN_GAP) : 0;
  const offset = useRef<number | null>(null);
  const scroll = (index: number, event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (activeRow.current !== index) return;
    offset.current = event.nativeEvent.contentOffset.x;
    scrolls.current.forEach((node, other) => { if (other !== index) node?.scrollTo({ x: offset.current!, animated: false }); });
  };
  const pan = useMemo(() => PanResponder.create({ onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 10 && gesture.dy > Math.abs(gesture.dx) * 1.5, onPanResponderRelease: (_, gesture) => { if (gesture.dy > 40) onClose(); } }), [onClose]);
  return <Modal transparent visible animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.numberPadScrim }}>
      <Pressable feedback="none" accessibilityRole="button" accessibilityLabel={t('cycleOutlook.close')} onPress={onClose} style={{ flex: 1 }} />
      <View testID="cycle-outlook-sheet" accessibilityViewIsModal style={{ maxHeight: '90%', backgroundColor: colors.surfaceCard, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingHorizontal: spacing.base, paddingBottom: Math.max(insets.bottom, spacing.base) }}>
        <View {...pan.panHandlers} style={{ paddingTop: 10, paddingBottom: 6 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderDefault, alignSelf: 'center', marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text style={{ ...font.body(17, 'bold'), color: colors.textPrimary }}>{t('cycleOutlook.title')}</Text>
            <Text numberOfLines={2} style={{ ...font.body(12), flexShrink: 1, textAlign: 'right', color: outlook.scheduledWeeks < outlook.totalWeeks ? colors.goldText : colors.textMuted }}>{outlook.scheduledWeeks < outlook.totalWeeks ? t('cycleOutlook.partial', [outlook.scheduledWeeks, outlook.totalWeeks]) : t('training.handoff.subtitle', [outlook.name, outlook.totalWeeks])}</Text>
          </View>
        </View>
        {estimates.isPending ? <ActivityIndicator color={colors.gold500} style={{ padding: spacing.xl }} /> : estimates.isError ? <AppButton label={t('student.bindGateView.copy003')} onPress={() => void estimates.refetch()} /> :
          <ScrollView onLayout={event => setWidth(event.nativeEvent.layout.width)} showsVerticalScrollIndicator={false}>
            {outlook.rows.map((row, index) => <View key={row.family} style={{ paddingTop: 10, borderTopWidth: index ? 1 : 0, borderTopColor: colors.borderDefault }}>
              <Text style={{ ...font.body(14, 'bold'), color: colors.textPrimary }}>{row.name}</Text>
              <ScrollView horizontal scrollEnabled={long} showsHorizontalScrollIndicator={false} ref={node => { scrolls.current[index] = node; }}
                testID={`cycle-outlook-scroll-${row.family}`} onScrollBeginDrag={() => { activeRow.current = index; }} onScroll={event => scroll(index, event)} scrollEventThrottle={16}
                onContentSizeChange={() => scrolls.current[index]?.scrollTo({ x: offset.current ?? initialX, animated: false })}
                contentContainerStyle={{ gap: COLUMN_GAP, paddingRight: long ? Math.max(0, width - 2 * (COLUMN_WIDTH + COLUMN_GAP)) : 0 }}>
                {row.cells.map(cell => <Column key={cell.week} family={row.family} cell={cell} width={columnWidth} onSelect={onSelect} />)}
              </ScrollView>
            </View>)}
          </ScrollView>}
      </View>
    </View>
  </Modal>;
}
