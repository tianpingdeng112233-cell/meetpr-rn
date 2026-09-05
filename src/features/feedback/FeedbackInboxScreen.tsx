import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSessionStore } from '@/api/session';
import { useStudentVideos } from '@/api/domains/videos';
import { font, radius, Screen, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { useFeedbackInboxViewModel } from '@/features/dashboard/feedback-inbox';
import { relativeFeedbackTime } from '@/features/dashboard/model';
import { FeedbackEmpty, FeedbackHeader, FeedbackLoadError, FeedbackLoading, FeedbackVideoCard, PlaybackLinkError } from './FeedbackComponents';
import { FeedbackPlaybackModal } from './FeedbackPlaybackModal';
import { useFeedbackPlayback } from './use-feedback-playback';
import { feedbackVideoAssociation } from './video-presentation';

export function FeedbackInboxScreen() {
  const colors = useColors();
  const router = useRouter();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const inbox = useFeedbackInboxViewModel(studentId);
  const videos = useStudentVideos(studentId);
  const playback = useFeedbackPlayback();
  return <Screen edges={['top', 'left', 'right']}>
    <FeedbackHeader />
    {inbox.isLoading ? <FeedbackLoading /> : inbox.isError ? <FeedbackLoadError retry={() => void inbox.reload()} /> :
      <FlatList data={inbox.items} keyExtractor={item => item.id} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshing={false} onRefresh={() => { void inbox.reload(); void videos.refetch(); }}
        ListHeaderComponent={<View style={{ gap: spacing.sm }}>
          <Text style={{ ...font.mono(11), letterSpacing: 0.44, color: colors.textFaint }}>{t('student.feedbackInboxView.copy001', [inbox.items.length])}</Text>
          {videos.isError ? <FeedbackLoadError retry={() => void videos.refetch()} /> : null}
        </View>}
        ListEmptyComponent={<FeedbackEmpty />}
        renderItem={({ item }) => {
          const association = feedbackVideoAssociation(item.video_id, videos.data?.videos ?? []);
          return <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderLeftColor: item.read_at ? colors.borderStrong : colors.gold500 }]}>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(student)/feedback/[feedbackId]', params: { feedbackId: item.id } })} style={{ gap: spacing.sm }}>
              <View style={styles.row}>
                {!item.read_at ? <View style={[styles.unread, { backgroundColor: colors.gold500 }]} /> : null}
                <Text style={{ ...font.body(14, 'bold'), color: colors.textPrimary, flex: 1 }}>{association.kind === 'available' ? association.video.exercise_name || t('student.feedbackInboxView.copy003') : t('student.feedbackInboxView.copy003')}</Text>
                <Text style={{ ...font.mono(11), color: colors.textFaint }}>{relativeFeedbackTime(item.posted_at, new Date())}</Text>
              </View>
              <Text style={{ ...font.body(14), lineHeight: 21, color: colors.textPrimary }}>{item.text}</Text>
            </Pressable>
            {association.kind === 'available' ? <FeedbackVideoCard video={association.video} resolving={playback.resolvingFeedbackId === item.id}
              disabled={playback.resolvingFeedbackId !== null} play={() => void playback.session.open(item.id, association.video.id)} />
              : item.video_id && videos.isPending ? <FeedbackLoading /> : null}
            {playback.errorFeedbackId === item.id ? <PlaybackLinkError /> : null}
          </View>;
        }} />}
    <FeedbackPlaybackModal item={playback.playbackItem} session={playback.session} />
  </Screen>;
}
const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingHorizontal: spacing.point18, paddingTop: spacing.space4, paddingBottom: spacing.point28, gap: spacing.point11 },
  card: { borderRadius: radius.control, borderLeftWidth: spacing.point3, paddingHorizontal: spacing.point15, paddingVertical: spacing.point13, gap: spacing.point11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.point7 },
  unread: { width: spacing.point7, height: spacing.point7, borderRadius: radius.pill },
});
