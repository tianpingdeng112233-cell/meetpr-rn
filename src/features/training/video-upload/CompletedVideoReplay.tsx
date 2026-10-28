import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Modal, View } from 'react-native';
import { useRouter } from 'expo-router';
import { feedbackRepository, type FeedbackItem } from '@/api/domains/feedback';
import { VideoPlayback } from './VideoPlayback';
import { File } from 'expo-file-system';
import { videosRepository, type StudentVideo } from '@/api/domains/videos';
import { spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import type { VideoBadgeInfo } from '@/features/video-player/types';
import { hydrateVideoUploads, useVideoUploadStore } from './store';
import { EMPTY_VIDEO_UPLOAD, type VideoUploadRecord } from './model';
import { latestVideoFeedbackId, playableSetVideo, type ReplayVideo } from './completed-replay';
import { SetVideoUploadIndicator } from './VideoStatusIcon';

type ReplaySelection = ReplayVideo & { badge: VideoBadgeInfo };
const ReplayContext = createContext<{ studentId: string; videos: readonly StudentVideo[]; play: (selection: ReplaySelection) => void }>({ studentId: '', videos: [], play: () => {} });

/** One list request for all rows, kept separate from editable attachment hydration. */
export function CompletedVideoReplayProvider({ studentId, children, onNavigate }: { studentId: string; children: ReactNode; onNavigate?: () => void }) {
  const router = useRouter();
  const [selection, setSelection] = useState<ReplaySelection | null>(null);
  const [feedback, setFeedback] = useState<{ studentId: string; items: FeedbackItem[] } | null>(null);
  const videoId = selection?.attachmentId ?? null;
  useEffect(() => {
    let live = true;
    if (studentId && videoId) void feedbackRepository.list(studentId).then(({ items }) => { if (live) setFeedback({ studentId, items }); }).catch(() => {});
    return () => { live = false; };
  }, [studentId, videoId]);
  const feedbackId = latestVideoFeedbackId(videoId, feedback?.studentId === studentId ? feedback.items : []);
  const [result, setResult] = useState<{ studentId: string; videos: StudentVideo[] } | null>(null);
  const uploads = useVideoUploadStore(state => Object.entries(state.records)
    .filter(([key, record]) => key.startsWith(`${studentId}:`) && record.status === 'uploaded')
    .map(([key, record]) => `${key}:${record.attachmentId}`).join('|'));
  useEffect(() => {
    let live = true;
    void hydrateVideoUploads();
    if (studentId) void videosRepository.list(studentId).then(({ videos }) => {
      if (live) setResult({ studentId, videos });
    }).catch(() => { /* Video availability must not block the existing day. */ });
    return () => { live = false; };
  }, [studentId, uploads]);
  return <ReplayContext.Provider value={{ studentId, videos: result?.studentId === studentId ? result.videos : [], play: setSelection }}>
    {children}
    {selection ? <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setSelection(null)}>
      <VideoPlayback {...selection} readOnly onClose={() => setSelection(null)} onReview={feedbackId ? () => {
        setSelection(null);
        onNavigate?.();
        router.push({ pathname: '/(student)/feedback/[feedbackId]', params: { feedbackId } });
      } : undefined} />
    </Modal> : null}
  </ReplayContext.Provider>;
}

type ReplaySet = { setLogId: string | null; stableSetId?: string };
const VideoColumnContext = createContext(false);

function resolveSetVideo(studentId: string, videos: readonly StudentVideo[], records: Record<string, VideoUploadRecord>, { setLogId, stableSetId }: ReplaySet) {
  const direct = stableSetId ? records[`${studentId}:${stableSetId}`] : undefined;
  const entry = direct && (!direct.setLogId || direct.setLogId === setLogId)
    ? direct : Object.entries(records).find(([key, record]) => key.startsWith(`${studentId}:`) && setLogId && record.setLogId === setLogId)?.[1] ?? EMPTY_VIDEO_UPLOAD;
  const indicatorSetId = stableSetId ?? Object.keys(records).find(key => records[key] === entry)?.slice(studentId.length + 1);
  const localUri = entry.localUri ?? entry.source?.uri;
  let exists = false;
  try { exists = Boolean(localUri && new File(localUri).exists); } catch { /* Missing retained file falls back to remote. */ }
  return { entry, indicatorSetId, video: playableSetVideo(setLogId, videos, entry, exists) };
}

/** Reserve the same trailing width across one exercise, only while it has a playable video. */
export function CompletedVideoGroup({ sets, children }: { sets: readonly ReplaySet[]; children: (hasVideo: boolean) => ReactNode }) {
  const { studentId, videos } = useContext(ReplayContext);
  const records = useVideoUploadStore(state => state.records);
  const hasVideo = sets.some(set => resolveSetVideo(studentId, videos, records, set).video !== null);
  return <VideoColumnContext.Provider value={hasVideo}>{children(hasVideo)}</VideoColumnContext.Provider>;
}

export function CompletedSetVideo({ setLogId, stableSetId, badge }: ReplaySet & { badge: VideoBadgeInfo }) {
  const { studentId, videos, play } = useContext(ReplayContext);
  const reserveColumn = useContext(VideoColumnContext);
  const colors = useColors();
  const records = useVideoUploadStore(state => state.records);
  const { entry, indicatorSetId, video } = resolveSetVideo(studentId, videos, records, { setLogId, stableSetId });
  if (entry.status !== 'none' && entry.status !== 'uploaded' && indicatorSetId) {
    const indicator = <SetVideoUploadIndicator studentId={studentId} stableSetId={indicatorSetId} />;
    return reserveColumn ? <CompletedVideoSlot>{indicator}</CompletedVideoSlot> : indicator;
  }
  if (!video) return reserveColumn ? <CompletedVideoSlot /> : null;
  return <CompletedVideoSlot>
    <Pressable accessibilityRole="button" accessibilityLabel={t('chat.playVideo')} hitSlop={(spacing.minimumHitTarget - 22) / 2}
      onPress={() => play({ ...video, badge })}
      style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="play-circle-outline" size={22} color={colors.completedVideoIcon} />
    </Pressable>
  </CompletedVideoSlot>;
}

/** The 44pt native parent contains hitSlop without contributing to row height. */
function CompletedVideoSlot({ children }: { children?: ReactNode }) {
  return <View style={{ width: 22, alignSelf: 'stretch' }}>
    {children ? <View collapsable={false} pointerEvents="box-none" style={{ position: 'absolute', top: '50%',
      left: (22 - spacing.minimumHitTarget) / 2, marginTop: -spacing.minimumHitTarget / 2,
      width: spacing.minimumHitTarget, height: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View> : null}
  </View>;
}
