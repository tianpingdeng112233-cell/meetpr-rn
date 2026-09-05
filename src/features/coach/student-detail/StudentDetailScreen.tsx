import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, font, useColors } from '@/design';
import { t, exerciseDisplayName } from '@/i18n';
import type { StudentVideo } from '@/api/domains/videos';
import type { SetLog } from '@/api/domains/sets';
import { setsRepository } from '@/api/domains/sets';
import { uploadsRepository } from '@/api/domains/uploads';
import { addDays, localDay, type ExecutionDay } from '@/domain/coach/detail-week';
import { useStudentDetail } from './use-student-detail';
import { planCardState } from './plan-card-state';
import { Badge, Capsule, Copy, Empty, Loading, Progress, SectionCard, styles } from './components';
import { naturalWeekNumber, statusPresentation } from './presentation';
import { CoachDayDetailView } from './CoachDayDetailView';
import { CoachVideoPlayer } from './CoachVideoPlayer';
import { OverviewSection } from './OverviewSection';
import { VideosSection } from './VideosSection';
import { GrowthSection } from './GrowthSection';
import { FeedbackSection } from './FeedbackSection';
import { ProfileSection } from './ProfileSection';
import { openStudentConversation } from '../receiving/open-conversation';

const sections = ['overview', 'videos', 'growth', 'feedback', 'profile'] as const;
type Section = typeof sections[number];
export function StudentDetailScreen({ studentId, now, onBack, coachName = t('coach.profile.fallbackName') }: { studentId: string; now: Date; onBack: () => void; coachName?: string }) {
  const colors = useColors();
  const [section, setSection] = useState<Section>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [day, setDay] = useState<ExecutionDay | null>(null);
  const [playback, setPlayback] = useState<{ video: StudentVideo; log: SetLog | null } | null>(null);
  const [loadingVideo, setLoadingVideo] = useState<string | null>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const request = useRef(0);
  const model = useStudentDetail(studentId, now, section === 'growth');
  useEffect(() => () => { request.current += 1; }, [studentId]);
  const plan = model.main.data?.plan ?? null;
  const feedback = model.main.data?.feedback ?? [];
  const exerciseName = (id: string) => {
    const exercise = model.main.data?.exercises.find((entry) => entry.id === id);
    return exercise ? exerciseDisplayName(exercise) : t('coach.detail.training');
  };
  const planExerciseName = (id: string | null) => {
    const exercise = plan?.days.flatMap((entry) => entry.exercises).find((entry) => entry.id === id);
    return exercise ? exerciseName(exercise.exercise_id) : null;
  };
  const videoTitle = (video: StudentVideo) => planExerciseName(video.plan_exercise_id) ?? video.filename ?? t('coach.video.trainingVideo');
  const status = model.student ? statusPresentation(model.student, now) : null;
  const cardState = planCardState(model.state, Boolean(plan));
  const progress = model.overview.plannedTrainingDays ? model.overview.completedTrainingDays / model.overview.plannedTrainingDays : 0;
  const play = async (video: StudentVideo) => {
    const generation = ++request.current;
    setLoadingVideo(video.id);
    setPlaybackFailed(false);
    try {
      // Preflight reports acquisition failures in the wall; playback owns fresh short links and Retry.
      await uploadsRepository.url(video.id);
      let log = model.main.data?.logs.find((entry) => entry.id === video.set_log_id) ?? null;
      if (!log && video.set_log_id) {
        const date = new Date(video.logged_at ?? video.created_at);
        // Badge enrichment is optional: it must not prevent a valid clip from playing.
        try {
          log = (await setsRepository.range(studentId, { from: localDay(addDays(date, -1)), to: localDay(addDays(date, 2)), scope: 'plan' })).logs.find((entry) => entry.id === video.set_log_id) ?? null;
        } catch { /* Missing set metadata is rendered as a dash. */ }
      }
      if (request.current === generation) setPlayback({ video, log });
    } catch {
      if (request.current === generation) setPlaybackFailed(true);
    } finally {
      if (request.current === generation) setLoadingVideo(null);
    }
  };
  const refresh = async () => {
    setRefreshing(true);
    try { await model.refresh(); } finally { setRefreshing(false); }
  };
  const [openingChat, setOpeningChat] = useState(false);
  const openChat = async (draft?: string) => {
    if (openingChat) return;
    setOpeningChat(true);
    try { await openStudentConversation({ studentId, studentName: model.student?.displayName, draft, status: model.student?.status }); } finally { setOpeningChat(false); }
  };
  return <Screen>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.gold500} colors={[colors.gold500]} />}>
      <View style={styles.between}>
        <Pressable testID="coach.detail.back" accessibilityRole="button" onPress={onBack} style={[styles.row, { minHeight: 44, alignSelf: 'flex-start' }]}><Ionicons name="chevron-back" size={20} color={colors.textSecondary} /><Copy size={14} tone="textSecondary">{t('coach.detail.backToStudents')}</Copy></Pressable>
        <Pressable testID="coach.detail.chat" accessibilityRole="button" accessibilityLabel={t('coach.chat.sendMessage')} disabled={openingChat} onPress={() => void openChat()} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceCard, opacity: openingChat ? 0.5 : 1 }}><Ionicons name="chatbubble-outline" size={18} color={colors.textPrimary} /></Pressable>
      </View>
      <View style={styles.between}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...font.display(32), color: colors.textPrimary, flex: 1 }}>{model.student?.displayName ?? t('coach.profile.notProvided')}</Text>{status && <Badge label={status.label} tone={status.tone} />}</View>
      <SectionCard>
        {cardState === 'loading' ? <Loading /> : cardState === 'failed' ? <Empty title={t('coach.detail.planLoadFailed')} icon="warning-outline" danger /> : cardState === 'empty' ? <><View style={styles.row}><Ionicons name="calendar-outline" size={22} color={colors.gold500} /><Copy bold>{t('coach.detail.noPlan')}</Copy></View><Copy size={12} tone="textTertiary">{t('coach.detail.noPlanSubtitle')}</Copy></> : <>
          <View style={styles.row}><Copy bold>{t('coach.detail.weekRunningTitle %lld', [naturalWeekNumber(now)])}</Copy><Copy size={12} tone="textTertiary" style={{ flexShrink: 1 }}>· {t('coach.detail.weekProgress %lld %lld', [model.overview.completedTrainingDays, model.overview.plannedTrainingDays])}</Copy></View>
          <Progress value={progress} /><View style={styles.row}><Capsule label={t('coach.detail.remindTraining')} disabled={openingChat} onPress={() => void openChat(t('coach.detail.trainingReminderDraft'))} /><Capsule label={t('coach.detail.weekSummary')} disabled hint={t('coach.detail.weekSummaryUnavailable')} /></View>
        </>}
      </SectionCard>
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{sections.map((entry) => <Capsule key={entry} testID={`coach.detail.tab.${entry}`} label={t(`coach.detail.section.${entry}`)} selected={section === entry} onPress={() => setSection(entry)} />)}</ScrollView>
      {model.state === 'loading' ? <Loading /> : model.state === 'failed' ? <SectionCard><Empty title={t('coach.detail.loadFailed')} subtitle={t('coach.studentDetail.error.load')} danger /><Copy size={12} tone="textTertiary">{t('coach.detail.pullToRetry')}</Copy></SectionCard> : <>
        {section === 'overview' && <OverviewSection plan={plan} days={model.days} feedback={feedback} readiness={model.readiness} now={now} exerciseName={exerciseName} onDay={setDay} onSection={setSection} onRemindReadiness={() => void openChat(t('coach.detail.readinessReminderDraft'))} />}
        {section === 'videos' && <>
          {playbackFailed && <SectionCard><Copy tone="danger">{t('coach.video.error.playback')}</Copy><Capsule label={t('coach.video.confirmation')} onPress={() => setPlaybackFailed(false)} /></SectionCard>}
          {model.videos.isPending ? <Loading /> : model.videos.isError ? <Empty title={t('coach.video.loadFailed')} subtitle={t('coach.video.pullToRetry')} icon="videocam-outline" /> : <VideosSection videos={model.videos.data.videos} feedback={feedback} now={now} title={videoTitle} loadingId={loadingVideo} onPlay={(video) => void play(video)} />}
        </>}
        {section === 'growth' && <GrowthSection stats={model.growth.data} state={model.growth.isPending ? 'loading' : model.growth.isError ? 'failed' : 'loaded'} onRetry={() => void model.growth.refetch()} />}
        {section === 'feedback' && <FeedbackSection items={feedback} planExerciseName={planExerciseName} now={now} />}
        {section === 'profile' && (model.profile.isPending ? <Loading /> : model.profile.isError || !model.profile.data ? <Empty title={t('coach.detail.profileUnavailable')} /> : <ProfileSection profile={model.profile.data} now={now} />)}
      </>}
    </ScrollView>
    <Modal visible={day != null || playback != null} onRequestClose={() => { setDay(null); setPlayback(null); }} animationType="slide">
      {playback ? <CoachVideoPlayer video={playback.video} log={playback.log} title={videoTitle(playback.video)} coachName={coachName} onClose={() => setPlayback(null)} /> : day ? <CoachDayDetailView day={day} exerciseName={exerciseName} onClose={() => setDay(null)} /> : null}
    </Modal>
  </Screen>;
}
