import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { feedbackKeys, feedbackRepository, type FeedbackResponse } from '@/api/domains/feedback';
import { uploadsRepository } from '@/api/domains/uploads';
import { sortedMarkers, videoMarkersRepository } from '@/api/domains/video-markers';
import { FeedbackPlaybackSession } from './playback-session';

export async function freshPlaybackURL(videoId: string) {
  return (await uploadsRepository.url(videoId)).url;
}
export function useFeedbackPlayback() {
  const queryClient = useQueryClient();
  const markRead = useCallback(async (feedbackId: string) => {
    await feedbackRepository.markRead(feedbackId);
    queryClient.setQueriesData<FeedbackResponse>({ queryKey: feedbackKeys.all }, previous => previous && ({
      ...previous, items: previous.items.map(item => item.id === feedbackId ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item),
    }));
  }, [queryClient]);
  const session = useMemo(() => new FeedbackPlaybackSession({
    markRead,
    url: freshPlaybackURL,
    markers: async videoId => ({
      kind: 'loaded',
      markers: sortedMarkers((await videoMarkersRepository.list(videoId)).markers).map(marker => ({
        id: marker.id, timeMs: marker.time_ms, note: marker.note, annotationURL: marker.annotation_url,
      })),
    }),
  }), [markRead]);
  useFocusEffect(useCallback(() => () => session.close(), [session]));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { ...state, session, markRead };
}
