import { Fragment } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StudentVideo } from '@/api/domains/videos';
import type { FeedbackItem } from '@/api/domains/feedback';
import { localDay } from '@/domain/coach/detail-week';
import { radius, useColors } from '@/design';
import { t } from '@/i18n';
import { Copy, Empty, SectionCard, styles } from './components';
import { relativeText, videoDayTitle } from './presentation';

export function VideosSection({ videos, feedback, now, title, loadingId, onPlay }: { videos: readonly StudentVideo[]; feedback: readonly FeedbackItem[]; now: Date; title: (video: StudentVideo) => string; loadingId: string | null; onPlay: (video: StudentVideo) => void }) {
  const colors = useColors();
  const groups = new Map<string, StudentVideo[]>();
  for (const video of [...videos].sort((a, b) => new Date(b.logged_at ?? b.created_at).getTime() - new Date(a.logged_at ?? a.created_at).getTime())) {
    const day = localDay(new Date(video.logged_at ?? video.created_at));
    groups.set(day, [...(groups.get(day) ?? []), video]);
  }
  if (!videos.length) return <Empty title={t('coach.video.emptyTitle')} subtitle={t('coach.video.emptySubtitle')} icon="videocam-outline" />;
  return <View style={styles.stack}>{[...groups].map(([day, items]) => <Fragment key={day}>
    <Copy mono size={12} tone="textTertiary">{videoDayTitle(day, now)}</Copy>
    <SectionCard>{items.map((video) => {
      const answered = feedback.some((item) => item.video_id === video.id || (!item.video_id && item.plan_exercise_id != null && item.plan_exercise_id === video.plan_exercise_id));
      return <Pressable testID={`coach.detail.video.${video.id}`} key={video.id} accessibilityRole="button" accessibilityLabel={title(video)} disabled={loadingId != null} onPress={() => onPlay(video)} style={({ pressed }) => [styles.row, { paddingVertical: 4 }, pressed && { transform: [{ scale: 0.97 }] }]}>
        <View style={{ width: 72, height: 56, borderRadius: radius.inset, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' }}>{loadingId === video.id ? <ActivityIndicator color={colors.inkOnCTAFill} /> : <Ionicons name="play" size={20} color={colors.inkOnCTAFill} />}</View>
        <View style={{ flex: 1, gap: 4 }}><Copy size={14} bold numberOfLines={1}>{title(video)}</Copy><Copy size={11} bold tone={answered ? 'success' : 'gold500'}>{t(answered ? 'coach.video.feedbackSent' : 'coach.video.awaitingFeedback')}</Copy><Copy size={11} tone="textTertiary">{relativeText(video.created_at, now)}</Copy></View>
      </Pressable>;
    })}</SectionCard>
  </Fragment>)}</View>;
}
