import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSessionStore } from '@/api/session';
import { useStudentVideos } from '@/api/domains/videos';
import { font, radius, Screen, spacing, useColors } from '@/design';
import { getLocale, t } from '@/i18n';
import { useFeedbackInboxViewModel } from '@/features/dashboard/feedback-inbox';
import { FeedbackEmpty, FeedbackHeader, FeedbackLoadError, FeedbackLoading, FeedbackVideoCard, FeedbackVideoUnavailable, PlaybackLinkError } from './FeedbackComponents';
import { FeedbackPlaybackModal } from './FeedbackPlaybackModal';
import { useFeedbackPlayback } from './use-feedback-playback';
import { feedbackVideoAssociation } from './video-presentation';

export function FeedbackDetailScreen() {
  const colors = useColors();
  const { feedbackId } = useLocalSearchParams<{ feedbackId: string }>();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const inbox = useFeedbackInboxViewModel(studentId);
  const videos = useStudentVideos(studentId);
  const playback = useFeedbackPlayback();
  const item = inbox.items.find(value => value.id === feedbackId);
  const id = item?.id;
  const markRead = playback.markRead;
  useEffect(() => { if (id) void markRead(id).catch(() => {}); }, [id, markRead]);
  const association = feedbackVideoAssociation(item?.video_id, videos.data?.videos ?? [], item?.video);
  const dateText = (timestamp: string) => new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short' }).format(new Date(timestamp));
  return <Screen edges={['top', 'left', 'right']}>
    <FeedbackHeader detail />
    {inbox.isLoading ? <FeedbackLoading /> : inbox.isError ? <FeedbackLoadError retry={() => void inbox.reload()} /> : !item ? <FeedbackEmpty /> :
      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.point10 }}>
          <MaterialCommunityIcons name="account-circle" size={28} color={colors.gold500} />
          <View style={{ gap: spacing.point2 }}>
            <Text style={{ ...font.display(20), color: colors.textPrimary }}>{t('student.feedbackDetailView.copy001')}</Text>
            <Text style={{ ...font.mono(11, 'medium'), color: colors.textMuted }}>{dateText(item.posted_at)}</Text>
          </View>
        </View>
        {item.day_date ? <Text style={{ ...font.body(15), color: colors.textSecondary }}>{t('student.feedbackDetailView.copy002')}{dateText(`${item.day_date}T12:00:00`)}</Text> : null}
        {association.kind === 'available' ? <FeedbackVideoCard detail video={association.video} resolving={playback.resolvingFeedbackId === item.id}
          disabled={playback.resolvingFeedbackId !== null} play={() => void playback.session.open(item.id, association.video.id)} />
          : association.kind === 'unavailable' ? videos.isPending ? <FeedbackLoading /> : videos.isError ? <FeedbackLoadError retry={() => void videos.refetch()} /> : <FeedbackVideoUnavailable /> : null}
        {playback.errorFeedbackId === item.id ? <PlaybackLinkError detail /> : null}
        <Text style={{ ...font.body(17), color: colors.textPrimary, padding: spacing.point14, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: radius.lg }}>{item.text}</Text>
      </ScrollView>}
    <FeedbackPlaybackModal item={playback.playbackItem} session={playback.session} />
  </Screen>;
}
