import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadsRepository } from '@/api/domains/uploads';
import { setsRepository, type SetLog } from '@/api/domains/sets';
import { sortedMarkers, videoMarkersRepository, type VideoMarker } from '@/api/domains/video-markers';
import { SliceRequests } from '@/domain/coach/queue-navigator';
import type { PendingVideo } from '@/domain/coach/pending-videos';
import { localDateText } from '@/domain/plan/workout-date-policy';
import { ApiError } from '@/api/client';
export function useVideoFeedbackSlice(item: PendingVideo, now: Date) {
  const requests = useRef(new SliceRequests());
  const [url, setURL] = useState<string | null>(null);
  const [urlFailed, setURLFailed] = useState(false);
  const [setInfo, setSetInfo] = useState<SetLog | 'loading' | 'unlinked' | 'failed'>(item.setLogID ? 'loading' : 'unlinked');
  const [markers, setMarkers] = useState<VideoMarker[] | null>(null);
  const [markerError, setMarkerError] = useState<'load' | 'save' | 'delete' | null>(null);
  const [markerBusy, setMarkerBusy] = useState(false);
  const clock = useRef(now);
  const markerInFlight = useRef(false);
  const loadURL = useCallback(() => {
    const ticket = requests.current.begin('url');
    return uploadsRepository.url(item.id).then(result => {
      if (requests.current.accepts(ticket)) setURL(result.url);
    }).catch(() => { if (requests.current.accepts(ticket)) setURLFailed(true); });
  }, [item.id]);
  const loadMarkers = useCallback(() => {
    const ticket = requests.current.begin('markers');
    return videoMarkersRepository.list(item.id).then(result => {
      if (requests.current.accepts(ticket)) { setMarkers(sortedMarkers(result.markers)); setMarkerError(null); }
    }).catch((error: unknown) => {
      if (requests.current.accepts(ticket)) {
        setMarkers(null);
        // Canonical state table: only the unavailable endpoint disappears; other errors remain visible.
        const unavailable = error instanceof ApiError && error.status === 404;
        setMarkerError(unavailable ? null : 'load');
      }
    });
  }, [item.id]);
  useEffect(() => {
    const guard = requests.current;
    guard.select(item.id);
    void loadURL(); void loadMarkers();
    const ticket = guard.begin('set');
    if (item.setLogID) {
      const from = new Date(clock.current); from.setFullYear(from.getFullYear() - 5);
      const to = new Date(clock.current); to.setDate(to.getDate() + 1);
      void setsRepository.range(item.studentID, { from: localDateText(from), to: localDateText(to), scope: 'plan' }).then(result => {
        if (guard.accepts(ticket)) setSetInfo(result.logs.find(log => log.plan_exercise_id === item.planExerciseID && log.id === item.setLogID) ?? 'failed');
      }).catch(() => { if (guard.accepts(ticket)) setSetInfo('failed'); });
    }
    return () => guard.select(null);
  }, [item.id, item.planExerciseID, item.setLogID, item.studentID, loadMarkers, loadURL]);
  async function mutateMarker(operation: () => Promise<VideoMarker | void>, kind: 'save' | 'delete', deletedID?: string) {
    if (markerInFlight.current || markers === null) return false;
    const ticket = requests.current.begin('markers');
    markerInFlight.current = true;
    setMarkerBusy(true); setMarkerError(null);
    try {
      const marker = await operation();
      if (!requests.current.accepts(ticket)) return false;
      setMarkers(previous => sortedMarkers(marker ? [...(previous ?? []).filter(value => value.id !== marker.id), marker] : (previous ?? []).filter(value => value.id !== deletedID)));
      return true;
    } catch { if (requests.current.accepts(ticket)) setMarkerError(kind); return false; }
    finally { markerInFlight.current = false; if (requests.current.accepts(ticket)) setMarkerBusy(false); }
  }
  return { url, urlFailed, setURLFailed, loadURL: () => { setURL(null); setURLFailed(false); return loadURL(); }, setInfo, markers, markerError, markerBusy, loadMarkers,
    addMarker: (seconds: number, note: string) => mutateMarker(() => videoMarkersRepository.create(item.id, Math.max(0, Math.round(seconds * 1000)), note), 'save'),
    deleteMarker: (id: string) => mutateMarker(() => videoMarkersRepository.remove(item.id, id), 'delete', id),
  };
}
