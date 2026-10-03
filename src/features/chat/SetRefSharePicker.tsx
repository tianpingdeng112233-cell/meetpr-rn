import { useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { BrandSwitch } from '@/design/BrandSwitch';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { font, fontMetrics, radius, spacing, Screen, useColors } from '@/design';
import { exerciseDisplayName, t } from '@/i18n';
import { createUUID } from '@/analytics/uuid';
import { plansRepository } from '@/api/domains/plans';
import { setsRepository } from '@/api/domains/sets';
import { exercisesRepository } from '@/api/domains/exercises';
import { cursorDay, dayCode, recommendedDate, selectCurrentPlan } from '@/domain/plan/sequence';
import { gymDayText } from '@/features/training/policy';
import { useVideoUploadStore } from '@/features/training/video-upload/store';
import { buildCandidates, canonicalBody, setRefBodyAllowed, SetRefPickerPresentation, type SetRefCandidate } from './set-ref';
import { useSetRefStagingStore } from './set-ref-staging';

/** Both entry points load today's cursor and gym-day logs, independent of the viewed calendar day. */
export async function loadTodaySetRefCandidates(studentId: string): Promise<SetRefCandidate[]> {
  const summary = selectCurrentPlan((await plansRepository.list(studentId)).plans);
  if (!summary) return [];
  const plan = await plansRepository.detail(summary.id);
  const planDay = cursorDay(plan.days);
  if (!planDay) return [];
  const today = gymDayText(new Date());
  const [{ logs }, { exercises }] = await Promise.all([
    setsRepository.range(studentId, { from: today, to: today }), exercisesRepository.list(),
  ]);
  const todayLogs = logs.filter(log => log.logged_date === today);
  // Keep additional/repeated recorded sets too: iOS shares every returned log, not just prescription slots.
  const recordedDrafts = todayLogs.flatMap(log => {
    const exercise = planDay.exercises.find(item => item.id === log.plan_exercise_id);
    return exercise ? [{ exercise, setIndex: log.set_index, sourceLog: log }] : [];
  });
  const videos = Object.fromEntries(Object.entries(useVideoUploadStore.getState().records).filter(([key]) => key.startsWith(`${studentId}:`)));
  return buildCandidates({ planDay, drafts: recordedDrafts, dayDate: recommendedDate(plan, planDay),
    exerciseNames: new Map(exercises.map(exercise => [exercise.id, exerciseDisplayName(exercise)])), videos }).map(candidate => ({ ...candidate, dayLabel: dayCode(planDay, plan.days) }));
}

export function SetRefSharePicker({ conversationId, initialSetLogID, loadCandidates, onClose, onStaged }: {
  conversationId: string;
  initialSetLogID?: string | null;
  loadCandidates: () => Promise<SetRefCandidate[]>;
  onClose: () => void;
  onStaged?: () => void;
}) {
  const colors = useColors();
  const [presentation] = useState(() => new SetRefPickerPresentation());
  const [, redraw] = useReducer(value => value + 1, 0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [includesVideo, setIncludesVideo] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const confirmLock = useRef(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  useEffect(() => {
    let live = true;
    void loadCandidates().then(candidates => {
      if (live) { presentation.load(candidates, initialSetLogID); setIncludesVideo(presentation.selectedCandidate?.video?.state !== 'failed'); setLoading(false); }
    }).catch(() => { if (live) { setLoadFailed(true); setLoading(false); } });
    return () => { live = false; };
  }, [loadCandidates, initialSetLogID, presentation]);
  const selected = presentation.selectedCandidate;
  const setRef = presentation.selectedReference;
  const canSend = setRef !== null && setRefBodyAllowed(canonicalBody(setRef, question));
  function confirm() {
    if (!selected || !setRef || !canSend || confirmLock.current) return;
    confirmLock.current = true; setConfirming(true); setError('');
    try {
      let video = includesVideo && selected.video?.state !== 'failed' ? selected.video ?? null : null;
      if (video?.state === 'uploading') {
        const current = useVideoUploadStore.getState().records[video.recordKey];
        if (!current || current.createdAt !== video.createdAt || current.status === 'failed' || current.status === 'none') {
          setError(t('chat.videoUnavailable')); confirmLock.current = false; setConfirming(false); return;
        }
        if (current.status === 'uploaded') {
          if (!current.attachmentId) { setError(t('chat.videoUnavailable')); confirmLock.current = false; setConfirming(false); return; }
          video = { state: 'ready', videoId: current.attachmentId };
        }
      }
      useSetRefStagingStore.getState().stage({ conversationId, clientId: createUUID(), setRef, body: canonicalBody(setRef, question), video, autoSend: true });
      onClose(); onStaged?.();
    } catch { setError(t('chat.trainingShareFailed')); confirmLock.current = false; setConfirming(false); }
  }
  return <Modal visible animationType="slide" onRequestClose={onClose}><Screen><KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    <View style={{ padding: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
      <Text style={{ ...font.body(fontMetrics.size17, 'bold'), color: colors.textPrimary, flex: 1 }}>{t('student.askCoach')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('chat.close')} onPress={onClose} style={{ minHeight: spacing.minimumHitTarget, minWidth: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="close" size={spacing.lg} color={colors.textPrimary} />
      </Pressable>
    </View>
    {loading ? <ActivityIndicator color={colors.gold500} style={{ flex: 1 }} /> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.base, gap: spacing.lg }}>
      <Text style={{ ...font.body(fontMetrics.size17), color: colors.textPrimary }}>{t('chat.whichSet')}</Text>
      {!presentation.candidates.length ? <View style={{ gap: spacing.base }}>
        <Text style={{ ...font.body(fontMetrics.size20, 'bold'), color: colors.textPrimary }}>{t(loadFailed ? 'chat.trainingLoadFailed' : 'chat.noShareableSets')}</Text>
        {!loadFailed ? <Text style={{ ...font.body(fontMetrics.size15), color: colors.textSecondary }}>{t('chat.noShareableSetsDescription')}</Text> : null}
      </View> : null}
      {presentation.groups.map(group => <View key={group.id} style={{ padding: spacing.md, gap: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: radius.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ ...font.body(fontMetrics.size17, 'bold'), color: colors.textPrimary, flex: 1 }}>{group.exerciseName}</Text>
          <Text style={{ ...font.mono(fontMetrics.size12), color: colors.textSecondary }}>{group.dayLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {group.cells.map(cell => <View key={cell.id} style={{ width: '33.333%', padding: spacing.point2 }}>
            <Pressable accessibilityRole="radio" accessibilityLabel={`${cell.title}, ${cell.metrics}, ${cell.status}`} accessibilityState={{ selected: cell.id === selected?.id }}
              onPress={() => { presentation.select(cell.id); setIncludesVideo(presentation.selectedCandidate?.video?.state !== 'failed'); setError(''); redraw(); }}
              style={{ flex: 1, padding: spacing.sm, gap: spacing.xs, borderRadius: radius.control, borderWidth: spacing.point2, borderColor: cell.id === selected?.id ? colors.textPrimary : colors.borderDefault, backgroundColor: colors.surfaceCard }}>
              <Text style={{ ...font.body(fontMetrics.size13, 'bold'), color: colors.textPrimary }}>{cell.title}</Text>
              <Text style={{ ...font.body(fontMetrics.size12), color: colors.textPrimary }}>{cell.metrics}</Text>
              <Text style={{ ...font.body(fontMetrics.size11), color: colors.textSecondary }}>{cell.status}</Text>
            </Pressable>
          </View>)}
        </View>
      </View>)}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...font.body(fontMetrics.size17, 'bold'), color: colors.textPrimary }}>{t('chat.yourQuestion')}</Text>
        <TextInput accessibilityLabel={t('chat.yourQuestion')} multiline value={question} onChangeText={setQuestion} maxLength={4000}
          placeholder={t('chat.questionPlaceholder')} placeholderTextColor={colors.textTertiary}
          style={{ ...font.body(fontMetrics.size17), color: colors.textPrimary, padding: spacing.md, minHeight: spacing.minimumHitTarget * 2, textAlignVertical: 'top', borderWidth: spacing.point1, borderColor: colors.borderDefault, borderRadius: radius.control }} />
      </View>
      {selected?.video ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.xs }}><Text style={{ ...font.body(fontMetrics.size17), color: colors.textPrimary }}>{t('chat.includeVideo')}</Text><Text style={{ ...font.body(fontMetrics.size12), color: colors.textSecondary }}>{t(selected.video.state === 'ready' ? 'chat.videoReady' : selected.video.state === 'uploading' ? 'chat.videoUploading' : 'chat.videoFailed')}</Text></View>
        <BrandSwitch accessibilityLabel={t('chat.includeVideo')} value={includesVideo} disabled={selected.video.state === 'failed'} onValueChange={setIncludesVideo} />
      </View> : null}
      {error || (selected && !canSend) ? <Text style={{ ...font.body(fontMetrics.size13), color: colors.danger }}>{error || t(setRef ? 'student.studentBlackGoldChatView.copy005' : 'chat.invalidSetRecord')}</Text> : null}
      <Text style={{ ...font.body(fontMetrics.size12), color: colors.textSecondary }}>{presentation.sendSummary}</Text>
      <PickerButton label={t('chat.sendToCoach')} onPress={confirm} disabled={!canSend || confirming} busy={confirming} />
    </ScrollView>}
  </KeyboardAvoidingView></Screen></Modal>;
}

function PickerButton({ label, onPress, disabled, busy = false }: { label: string; onPress: () => void; disabled: boolean; busy?: boolean }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{ minHeight: spacing.xxl, padding: spacing.md, backgroundColor: colors.goldCTA, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
    {busy ? <ActivityIndicator color={colors.ctaText} /> : <Text style={{ ...font.body(fontMetrics.size17, 'bold'), color: colors.ctaText }}>{label}</Text>}
  </Pressable>;
}
