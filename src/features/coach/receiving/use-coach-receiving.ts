import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/api/session';
import { chatRepository, inboxConversation } from '@/api/domains/chat';
import { feedbackKeys, feedbackRepository } from '@/api/domains/feedback';
import { inboxCount, inboxRows, receivingContentState } from '@/domain/coach/inbox';
import { studentVideoGroups, type PendingVideo } from '@/domain/coach/pending-videos';
import { fetchPendingVideos } from './receiving-api';
import { useReceivingNow } from './use-receiving-now';
export const receivingKeys = {
  videos: (userID: string) => ['coach-receiving', userID, 'videos'] as const,
  chats: (userID: string) => ['coach-receiving', userID, 'chats'] as const,
};
export function useCoachReceiving() {
  const user = useSessionStore(state => state.user);
  const userID = user?.id ?? '';
  const client = useQueryClient();
  const now = useReceivingNow();
  const enabled = Boolean(userID) && user?.role === 'coach';
  const videos = useQuery({ queryKey: receivingKeys.videos(userID), queryFn: fetchPendingVideos, enabled, staleTime: Infinity, retry: false });
  const chat = useQuery({ queryKey: receivingKeys.chats(userID), queryFn: chatRepository.list, enabled, staleTime: 30_000, refetchInterval: 30_000, retry: false });
  const items = videos.data ?? [];
  const conversations = (chat.data?.conversations ?? []).map(inboxConversation);
  const rows = inboxRows({ conversations, videoGroups: studentVideoGroups(items), now });
  const status = videos.data ? 'loaded' : videos.isError ? 'failed' : 'loading';
  return {
    items, rows, now, userID, conversations,
    count: inboxCount(conversations, items.length),
    state: receivingContentState(status, rows.length, chat.isError),
    loaded: videos.data !== undefined,
    refreshing: videos.isFetching || chat.isFetching,
    refresh: () => Promise.all([videos.refetch(), chat.refetch()]),
    async sendFeedback(item: PendingVideo, text: string) {
      await feedbackRepository.post({ student_id: item.studentID, day_date: item.dayDate, plan_exercise_id: item.planExerciseID, video_id: item.id, text });
      await client.cancelQueries({ queryKey: receivingKeys.videos(userID) });
      client.setQueryData<PendingVideo[]>(receivingKeys.videos(userID), previous => previous?.filter(video => video.id !== item.id) ?? []);
      void client.invalidateQueries({ queryKey: feedbackKeys.list(item.studentID) });
      return client.getQueryData<PendingVideo[]>(receivingKeys.videos(userID)) ?? [];
    },
  };
}
/** W2-a shell integration point. Count and header both use inboxCount's folded conversations. */
export function useCoachMessagesBadge(): number { return useCoachReceiving().count; }
