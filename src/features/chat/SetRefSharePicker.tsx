import { useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Switch, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { font, radius, Screen, useColors } from '@/design';
import { exerciseDisplayName, t } from '@/i18n';
import { createUUID } from '@/analytics/uuid';
import { plansRepository } from '@/api/domains/plans';
import { setsRepository } from '@/api/domains/sets';
import { exercisesRepository } from '@/api/domains/exercises';
import { cursorDay, recommendedDate, selectCurrentPlan } from '@/domain/plan/sequence';
import { gymDayText } from '@/features/training/policy';
import { useVideoUploadStore } from '@/features/training/video-upload/store';
import { buildCandidates, canonicalBody, displayFirstLine, normalizeSetRef, SetRefPickerPresentation, type SetRefCandidate } from './set-ref';
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
    exerciseNames: new Map(exercises.map(exercise => [exercise.id, exerciseDisplayName(exercise)])), videos });
}

function summary(candidate: SetRefCandidate): string {
  try { return displayFirstLine(normalizeSetRef(candidate.source)); }
  catch { return t('chat.invalidSetRecord'); }
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
  useEffect(() => {
    let live = true;
    void loadCandidates().then(candidates => {
      if (live) { presentation.load(candidates, initialSetLogID); setLoading(false); }
    }).catch(() => { if (live) { setLoadFailed(true); setLoading(false); } });
    return () => { live = false; };
  }, [loadCandidates, initialSetLogID, presentation]);
  const selected = presentation.selectedCandidate;
  function proceed() {
    if (!presentation.proceed()) return;
    setIncludesVideo(presentation.selectedCandidate?.video?.state !== 'failed');
    setError(''); redraw();
  }
  function confirm() {
    if (!selected || confirmLock.current) return;
    confirmLock.current = true; setConfirming(true); setError('');
    try {
      const setRef = normalizeSetRef(selected.source);
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
      useSetRefStagingStore.getState().stage({ conversationId, clientId: createUUID(), setRef, body: canonicalBody(setRef), video });
      onClose(); onStaged?.();
    } catch { setError(t('chat.trainingShareFailed')); confirmLock.current = false; setConfirming(false); }
  }
  return <Modal visible animationType="slide" onRequestClose={onClose}><Screen>
    <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      {presentation.page === 'confirmation' ? <Pressable accessibilityRole="button" accessibilityLabel={t('chat.back')} onPress={() => { presentation.showSelection(); setError(''); redraw(); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ ...font.body(17), color: colors.goldText }}>{t('chat.back')}</Text></Pressable> : null}
      <Text style={{ ...font.body(17, 'bold'), color: colors.textPrimary, flex: 1 }}>{t('chat.shareTodayTraining')}</Text>
    </View>
    {loading ? <ActivityIndicator color={colors.gold500} style={{ flex: 1 }} /> : !presentation.candidates.length ? <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <MaterialCommunityIcons name={loadFailed ? 'alert-outline' : 'dumbbell'} size={44} color={colors.textTertiary} />
      <Text style={{ ...font.body(20, 'bold'), color: colors.textPrimary, textAlign: 'center' }}>{t(loadFailed ? 'chat.trainingLoadFailed' : 'chat.noShareableSets')}</Text>
      {!loadFailed ? <Text style={{ ...font.body(15), color: colors.textSecondary, textAlign: 'center' }}>{t('chat.noShareableSetsDescription')}</Text> : null}
    </View> : presentation.page === 'selection' ? <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
        {(['logged', 'planned'] as const).map(source => {
          const candidates = presentation.candidates.filter(item => item.source.source === source);
          return candidates.length ? <View key={source} style={{ gap: 12 }}>
            <Text style={{ ...font.body(13), color: colors.textSecondary }}>{t(source === 'logged' ? 'chat.completedSection' : 'chat.todayPlanSection')}</Text>
            {candidates.map(candidate => <Pressable key={candidate.id} accessibilityRole="radio" accessibilityState={{ selected: candidate.id === selected?.id }} accessibilityLabel={summary(candidate)} onPress={() => { presentation.select(candidate.id); setError(''); redraw(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 60 }}>
              <View style={{ flex: 1, gap: 4 }}><Text style={{ ...font.body(17, 'bold'), color: colors.textPrimary }}>{candidate.source.exerciseName}</Text><Text style={{ ...font.body(13), color: colors.textSecondary }}>{summary(candidate)}</Text></View>
              <MaterialCommunityIcons name={candidate.id === selected?.id ? 'check-circle' : 'circle-outline'} size={24} color={candidate.id === selected?.id ? colors.gold500 : colors.textTertiary} />
            </Pressable>)}
          </View> : null;
        })}
      </ScrollView><View style={{ padding: 16 }}><PickerButton label={t('chat.continueSelection')} onPress={proceed} disabled={!selected} /></View>
    </> : selected ? <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ ...font.body(17, 'bold'), color: colors.textPrimary }}>{t(selected.source.source === 'logged' ? 'chat.sendCurrentSetRecord' : 'chat.sendCurrentSetPlan')}</Text>
      <Text style={{ ...font.body(17), color: colors.textPrimary, backgroundColor: colors.surfaceElevated, padding: 16, borderRadius: radius.lg }}>{summary(selected)}</Text>
      {selected.video ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}><Text style={{ ...font.body(17), color: colors.textPrimary }}>{t('chat.includeVideo')}</Text><Text style={{ ...font.body(12), color: colors.textSecondary }}>{t(selected.video.state === 'ready' ? 'chat.videoReady' : selected.video.state === 'uploading' ? 'chat.videoUploading' : 'chat.videoFailed')}</Text></View>
        <Switch accessibilityLabel={t('chat.includeVideo')} value={includesVideo} disabled={selected.video.state === 'failed'} onValueChange={setIncludesVideo} trackColor={{ true: colors.gold500, false: colors.borderStrong }} />
      </View> : null}
      {error ? <Text style={{ ...font.body(13), color: colors.gold500 }}>{error}</Text> : null}
      <PickerButton label={t('chat.continueToChat')} onPress={confirm} disabled={confirming} busy={confirming} />
    </ScrollView> : null}
  </Screen></Modal>;
}

function PickerButton({ label, onPress, disabled, busy = false }: { label: string; onPress: () => void; disabled: boolean; busy?: boolean }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{ height: 48, backgroundColor: colors.goldCTA, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
    {busy ? <ActivityIndicator color={colors.ctaText} /> : <Text style={{ ...font.body(17, 'bold'), color: colors.ctaText }}>{label}</Text>}
  </Pressable>;
}
