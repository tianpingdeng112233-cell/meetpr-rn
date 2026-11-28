import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { uuid } from 'expo-modules-core';
import { AppState, PixelRatio } from 'react-native';
import { presentBadge } from '@/features/video-player/badge-presentation';
import type { VideoBadgeInfo } from '@/features/video-player/types';
import { videoBadgeLayout } from '@/features/video-player/video-badge-layout';
import type { CaptureVideoBadge } from '@/features/video-player/BadgeCaptureHost';
import { deleteLocalVideo, holdLocalVideo } from './native';
import { trainingVideoTrim } from './trim-native';
import { reportVideoProcessingFailure } from './diagnostics';
import { pendingRecordingSave, pendingUploadPreparation, startRecordingSave, videoTranscodes } from './recording-gallery';

export async function galleryPermission(): Promise<boolean> {
  const current = await MediaLibrary.getPermissionsAsync(true, ['video']);
  return current.granted || (current.canAskAgain && (await MediaLibrary.requestPermissionsAsync(true, ['video'])).granted);
}

type ReplayStage = 'JOIN_RECORDING' | 'PERMISSION' | 'DOWNLOAD' | 'REFRESH_URL' | 'INSPECT' | 'WAIT_UPLOAD'
  | 'DIMENSIONS' | 'CAPTURE' | 'TRANSCODE_QUEUE' | 'BURN' | 'PUBLISH' | 'BACKGROUND' | 'TIMEOUT';
type SetReplayStage = (stage: ReplayStage) => void;

const remoteVideo = /^https?:\/\//i;

type BurnHooks = { onStart?: () => void; onYield?: () => void };

async function burn(uri: string, badge: VideoBadgeInfo, capture: CaptureVideoBadge, watch: ReturnType<typeof watchExport>, jobId: string, onDuration?: (durationMs: number) => void, setStage?: SetReplayStage, hooks?: BurnHooks) {
  const { signal } = watch;
  // Cancellation can publish the original while a late native callback is still settling.
  const release = holdLocalVideo(uri);
  try {
    setStage?.('INSPECT');
    const native = trainingVideoTrim();
    const { displayWidth, displayHeight, durationMs } = await native.trimInfo(uri);
    onDuration?.(durationMs);
    const preparation = pendingUploadPreparation(uri);
    if (preparation) {
      setStage?.('WAIT_UPLOAD');
      await Promise.race([preparation, watch.interrupted]);
    }
    setStage?.('DIMENSIONS');
    const { scale, left, bottom } = videoBadgeLayout(displayWidth, displayHeight, 'export');
    if (!(scale > 0) || signal.aborted) throw new Error('Badge dimensions unavailable');
    setStage?.('CAPTURE');
    const bitmap = await capture(badge, scale / PixelRatio.get(), signal);
    try {
      if (signal.aborted) throw new Error('Badge capture interrupted');
      setStage?.('TRANSCODE_QUEUE');
      // Burning is background work: it yields to a trim the user is waiting on and starts over afterwards.
      const result = await videoTranscodes.enqueuePreemptible(async yielded => {
        if (signal.aborted) throw new Error('Badge export interrupted');
        const cancel = () => { void native.cancelBadge(uri, jobId).catch(() => {}); };
        const yieldToUser = () => { hooks?.onYield?.(); cancel(); };
        signal.addEventListener('abort', cancel, { once: true });
        yielded.addEventListener('abort', yieldToUser, { once: true });
        setStage?.('BURN');
        hooks?.onStart?.();
        try { return await native.burnBadge(uri, bitmap, left, bottom, 1, jobId); }
        finally {
          signal.removeEventListener('abort', cancel);
          yielded.removeEventListener('abort', yieldToUser);
        }
      });
      if (signal.aborted) {
        deleteLocalVideo(result.uri);
        throw new Error('Badge export interrupted');
      }
      return result.uri;
    } finally { bitmap.release(); }
  } finally { release(); }
}

function watchExport(timeoutMs?: number) {
  const controller = new AbortController();
  let reason = 'BADGE_INTERRUPTED';
  let stop!: () => void;
  const interrupted = new Promise<null>(resolve => {
    stop = () => { controller.abort(); resolve(null); };
  });
  let timer: ReturnType<typeof setTimeout>;
  const reset = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => { reason = 'BADGE_TIMEOUT'; stop(); }, ms);
  };
  if (timeoutMs !== undefined) reset(timeoutMs);
  const subscription = AppState.addEventListener('change', state => { if (state === 'background') stop(); });
  if (AppState.currentState === 'background') stop();
  return { signal: controller.signal, interrupted, reset, reason: () => ({ code: reason }),
    close: () => { clearTimeout(timer); subscription.remove(); } };
}

const deadline = (durationMs: number) => Math.max(60_000, 4 * (durationMs || 0));

/** The burn budget starts when the burn does. Waiting for upload preparation and the queue has this looser cap. */
export const badgeTiming = { waitCapMs: 600_000 };

/** Staging proceeds immediately. Only the optional encode waits for upload preparation. */
export function saveRecordingVideo(uri: string, badge: VideoBadgeInfo | null | undefined, capture: CaptureVideoBadge,
  permission: Promise<boolean>, durationMs: number) {
  const release = holdLocalVideo(uri);
  return startRecordingSave(uri, JSON.stringify(badge && presentBadge(badge, 'export')), async prepared => {
    if (!(await permission)) throw new Error('Photos permission denied');
    if (badge && presentBadge(badge, 'export')) {
      const burnBudget = deadline(durationMs);
      // The native reservation publishes the original when this outer bound passes.
      const timeout = badgeTiming.waitCapMs + burnBudget;
      const watch = watchExport(timeout);
      let exported: string | null = null;
      try {
        const jobId = uuid.v4();
        const reservation = await trainingVideoTrim().reserveGalleryOriginal(uri, timeout, jobId);
        try {
          if (!watch.signal.aborted) {
            try {
              await Promise.race([prepared, watch.interrupted]);
              if (!watch.signal.aborted) exported = await Promise.race([burn(uri, badge, capture, watch, jobId, undefined, undefined, {
                onStart: () => watch.reset(burnBudget),
                onYield: () => watch.reset(badgeTiming.waitCapMs),
              }), watch.interrupted]);
            } catch (error) { reportVideoProcessingFailure('badge_export', error); }
          }
          if (watch.signal.aborted) reportVideoProcessingFailure('badge_export', watch.reason());
          if (!exported) return await reservation.finish(null);
          const result = await Promise.race([reservation.finish(exported), watch.interrupted]);
          // A pending replacement copy can finish after the native watchdog published the original.
          const savedBadge = result ?? await reservation.finish(null);
          if (!savedBadge) reportVideoProcessingFailure('badge_export', { code: 'BADGE_PUBLICATION_FALLBACK' });
          return savedBadge;
        } finally { reservation.release(); }
      } catch (error) { reportVideoProcessingFailure('badge_export', error); }
      finally { watch.close(); if (exported) deleteLocalVideo(exported); }
    }
    await MediaLibrary.Asset.create(uri);
    return false;
  }).finally(release);
}

const replays = new Map<string, Promise<void>>();

/** Only identical visible badge fields can share an existing Photos publication. */
export function saveReplayVideo(uri: string, badge: VideoBadgeInfo, capture: CaptureVideoBadge,
  permission: () => Promise<boolean>, refreshURL?: () => Promise<string>, videoId = uri) {
  const presentation = JSON.stringify(presentBadge(badge, 'export'));
  const key = JSON.stringify([videoId, presentation]);
  const existing = replays.get(key);
  if (existing) return existing;

  const release = holdLocalVideo(uri);
  const recording = pendingRecordingSave(uri) ?? pendingRecordingSave(videoId);
  let stage: ReplayStage = 'JOIN_RECORDING';
  const save = (async () => {
    if (recording) {
      const badged = await recording.savedBadge;
      if (recording.presentation === presentation) {
        if (!badged) throw new Error('Badge export unavailable');
        return;
      }
    }
    await exportReplay(uri, badge, capture, permission, refreshURL, next => { stage = next; });
  })().catch(error => {
    console.warn('[video.replay_save]', stage);
    throw error;
  }).finally(() => { replays.delete(key); release(); });
  replays.set(key, save);
  return save;
}

async function exportReplay(uri: string, badge: VideoBadgeInfo, capture: CaptureVideoBadge,
  permission: () => Promise<boolean>, refreshURL: (() => Promise<string>) | undefined, setStage: SetReplayStage) {
  let download: File | undefined;
  let releaseRenewedSource: (() => void) | undefined;
  let exported: string | null = null;
  let watch: ReturnType<typeof watchExport> | undefined;
  try {
    setStage('PERMISSION');
    if (!(await permission())) throw new Error('Photos permission denied');
    watch = watchExport();
    let source = uri;
    if (remoteVideo.test(uri)) {
      setStage('DOWNLOAD');
      download = new File(Paths.cache, `training-trim-gallery-${uuid.v4()}.mp4`);
      try {
        await File.downloadFileAsync(uri, download, { signal: watch.signal });
        source = download.uri;
      } catch (error) {
        if (watch.signal.aborted || !refreshURL) throw error;
        deleteLocalVideo(download.uri); // Android can leave a partial download.
        setStage('REFRESH_URL');
        const renewed = await Promise.race([refreshURL(), watch.interrupted]);
        if (!renewed) throw new Error('Badge export interrupted');
        if (remoteVideo.test(renewed)) {
          setStage('DOWNLOAD');
          await File.downloadFileAsync(renewed, download, { signal: watch.signal });
          source = download.uri;
        } else {
          source = renewed;
          releaseRenewedSource = holdLocalVideo(renewed);
        }
      }
    }
    if (watch.signal.aborted) throw new Error('Badge export interrupted');
    const active = watch;
    let durationMs = 0;
    active.reset(badgeTiming.waitCapMs);
    exported = await Promise.race([burn(source, badge, capture, active, uuid.v4(), ms => { durationMs = ms; }, setStage, {
      onStart: () => { if (!active.signal.aborted) active.reset(deadline(durationMs)); },
      onYield: () => { if (!active.signal.aborted) active.reset(badgeTiming.waitCapMs); },
    }), active.interrupted]);
    if (!exported) throw new Error('Badge export interrupted');
    setStage('PUBLISH');
    await MediaLibrary.Asset.create(exported);
  } catch (error) {
    if (watch?.signal.aborted) setStage(watch.reason().code === 'BADGE_TIMEOUT' ? 'TIMEOUT' : 'BACKGROUND');
    throw error;
  } finally {
    watch?.close();
    if (exported) deleteLocalVideo(exported);
    if (download) deleteLocalVideo(download.uri);
    releaseRenewedSource?.();
  }
}
