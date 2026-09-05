import { useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Video, { type VideoRef } from 'react-native-video';
import { font, radius, useColors } from '@/design';
import { t } from '@/i18n';
import type { VideoMarker } from '@/api/domains/video-markers';
import { Pill } from '../receiving/ReceivingUI';
export function markerTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
/** Same native playback engine as training/VideoPlayback; no training-owned API changes. */
export function VideoWorkbenchPlayer({ url, failed, markers, onProgress, onFailure, onRetry, onAddMarker, onAnnotation }: { url: string | null; failed: boolean; markers: VideoMarker[] | null; onProgress: (seconds: number) => void; onFailure: () => void; onRetry: () => void; onAddMarker: () => void; onAnnotation: (url: string) => void }) {
  const colors = useColors();
  const video = useRef<VideoRef>(null);
  return <View style={{ borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.surfaceCard }}>
    <View style={{ height: 270, backgroundColor: colors.surfaceFocus, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      {failed ? <><Text style={{ ...font.body(15), color: colors.inkOnCTAFill }}>{t('coach.videoFeedback.playFailed')}</Text><Pill testID="coach.video.retry" label={t('coach.videoFeedback.retry')} onPress={onRetry} /></> : url ? <Video key={url} ref={video} source={{ uri: url }} controls resizeMode="contain" playInBackground={false} style={StyleSheet.absoluteFill} onError={onFailure} onProgress={event => onProgress(event.currentTime)} /> : <ActivityIndicator accessibilityLabel={t('coach.videoFeedback.loading')} color={colors.gold500} />}
    </View>
    {markers !== null ? <View style={{ padding: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{markers.map(marker => <Pressable key={marker.id} accessibilityRole="button" accessibilityLabel={t('chat.seekToVideoMarker', [markerTime(marker.time_ms / 1000)])} onPress={() => { video.current?.seek(marker.time_ms / 1000); onProgress(marker.time_ms / 1000); if (marker.annotation_url) onAnnotation(marker.annotation_url); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.gold500 }}><Text style={{ ...font.mono(12, 'bold'), color: colors.gold500 }}>{markerTime(marker.time_ms / 1000)}</Text></Pressable>)}</View>
      <Pill label={t('chat.addVideoMarker')} disabled={!url || failed} onPress={onAddMarker} />
    </View> : null}
  </View>;
}
