import { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ChatMessage, ExerciseRef } from '@/api/domains/chat';
import { plansRepository, type PlanDetail } from '@/api/domains/plans';
import { setsRepository } from '@/api/domains/sets';
import { useSessionStore } from '@/api/session';
import { font, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { showToast } from '@/design/Toast';
import { useStudentTabsStore } from '@/features/student-tabs';
import { CoachDayDetailView } from '@/features/coach/student-detail/CoachDayDetailView';
import { addDays, localDate, localDay, type ExecutionDay } from '@/domain/coach/detail-week';
import { exercisesRepository } from '@/api/domains/exercises';
import { exerciseDisplayName, t } from '@/i18n';

export function exerciseNoteTitle(reference: ExerciseRef) {
  const [, month, day] = reference.day_date.split('-').map(Number);
  return `${month}/${day} · ${reference.exercise_name}`;
}
export function ChatExerciseNoteCard({ message, outgoing, student = false }: { message: Pick<ChatMessage, 'body' | 'exercise_ref' | 'sender_id'>; outgoing: boolean; student?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const userId = useSessionStore(state => state.user?.id ?? '');
  const [opening, setOpening] = useState(false);
  const [detail, setDetail] = useState<{ day: ExecutionDay; plan: PlanDetail | null; names: Map<string, string> } | null>(null);
  const reference = message.exercise_ref;
  if (!reference) return null;
  const open = async () => {
    if (opening) return;
    setOpening(true);
    const studentId = student ? userId : message.sender_id;
    try {
      const date = localDate(reference.day_date);
      const logs = (await setsRepository.range(studentId, { from: reference.day_date, to: localDay(addDays(date, 1)), scope: 'all' })).logs;
      const plans = (await plansRepository.list(studentId)).plans;
      let plan: PlanDetail | null = null;
      for (const summary of plans) {
        const candidate = await plansRepository.detail(summary.id);
        if (candidate.days.some(day => day.id === reference.plan_day_id)) { plan = candidate; break; }
      }
      if (useSessionStore.getState().user?.id !== userId) return;
      const planDay = plan?.days.find(day => day.id === reference.plan_day_id) ?? null;
      if (student && plan && planDay) {
        useStudentTabsStore.getState().handoffTraining({ plan, dayID: planDay.id, existingLogs: logs });
        router.navigate('/(student)/training');
      } else if (!student) {
        const exercises = (await exercisesRepository.list()).exercises;
        setDetail({ day: { date, planDay, logs }, plan, names: new Map(exercises.map(exercise => [exercise.id, exerciseDisplayName(exercise)])) });
      } else showToast(t('student.trainingShareConversationFailed'));
    } catch { showToast(t('student.trainingShareConversationFailed')); }
    finally { setOpening(false); }
  };
  const body = message.body ?? '';
  const note = /^\[(?:Exercise note|\u52a8\u4f5c\u7559\u8a00)\]/.test(body) ? body.split('\n').slice(1).join('\n') : body;
  return <View style={{ maxWidth: '88%', alignSelf: outgoing ? 'flex-end' : 'flex-start', gap: 6 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={exerciseNoteTitle(reference)} disabled={opening} onPress={() => void open()} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: student && outgoing ? colors.goldSoft : colors.surfaceCard, gap: 8 }}>
      <Text style={{ ...font.body(14, 'semibold'), color: colors.goldText }}>{exerciseNoteTitle(reference)}</Text>
      <Text style={{ ...font.body(14), color: colors.textPrimary }}>{note}</Text>
    </Pressable>
    {detail ? <Modal visible onRequestClose={() => setDetail(null)}><CoachDayDetailView day={detail.day} planDays={detail.plan?.days ?? []} exerciseName={id => detail.names.get(id) ?? reference.exercise_name} onClose={() => setDetail(null)} /></Modal> : null}
  </View>;
}
