import type { FeedbackVideoPlaybackItem } from '@/features/video-player/types';
import { applyMarkersOutcome, markerLoadError, type VideoMarkerLoadOutcome } from './markers-outcome';

type PlaybackState = {
  playbackItem: FeedbackVideoPlaybackItem | null;
  resolvingFeedbackId: string | null;
  errorFeedbackId: string | null;
};
/** Screen-owned session. Optional markers never gate opening the player. */
export class FeedbackPlaybackSession {
  private state: PlaybackState = { playbackItem: null, resolvingFeedbackId: null, errorFeedbackId: null };
  private listeners = new Set<() => void>();
  private generation = 0;
  private markersGeneration = 0;
  constructor(private readonly repository: {
    markRead: (feedbackId: string) => Promise<unknown>;
    url: (videoId: string) => Promise<string>;
    markers: (videoId: string) => Promise<VideoMarkerLoadOutcome>;
  }) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<PlaybackState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  close = () => {
    this.generation += 1;
    this.markersGeneration += 1;
    this.update({ playbackItem: null, resolvingFeedbackId: null });
  };
  async open(feedbackId: string, videoId: string) {
    if (this.state.resolvingFeedbackId) return;
    const generation = ++this.generation;
    this.update({ resolvingFeedbackId: feedbackId, errorFeedbackId: null });
    // iOS markRead is best effort; failure must not block a playable video.
    try { await this.repository.markRead(feedbackId); } catch {}
    if (generation !== this.generation) return;
    let url: string;
    try {
      url = await this.repository.url(videoId);
      if (!url) throw new Error('Playback unavailable');
    } catch {
      if (generation === this.generation) this.update({ resolvingFeedbackId: null, errorFeedbackId: feedbackId });
      return;
    }
    if (generation !== this.generation) return;
    this.update({ playbackItem: { id: videoId, url, markers: null, markersFailed: false }, resolvingFeedbackId: null });
    await this.refreshMarkers(videoId);
  }
  refreshMarkers = async (videoId: string) => {
    const generation = this.generation;
    const request = ++this.markersGeneration;
    let outcome: VideoMarkerLoadOutcome;
    try { outcome = await this.repository.markers(videoId); }
    catch (error) { outcome = markerLoadError(error); }
    if (generation !== this.generation || request !== this.markersGeneration) return;
    this.update({ playbackItem: applyMarkersOutcome(this.state.playbackItem, videoId, outcome) });
  };
}
