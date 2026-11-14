import { reportVideoProcessingFailure } from './diagnostics';
import { useEffect, useRef, useState } from 'react';
import { deleteLocalVideo } from './native';
import { copyTrimSource, trainingVideoTrim } from './trim-native';
import { TrimSession, type TrimOutcome } from './trim-session';
import { useTrimPlayback } from './useTrimPlayback';

const trimStages = {
  copyTrimSource: 'trim_copy', trimInfo: 'trim_info', thumbnails: 'trim_thumbnails',
  export: 'trim_export', 'player.onError': 'trim_preview',
} as const;
export function warnTrimPreparation(step: keyof typeof trimStages, error: unknown) {
  reportVideoProcessingFailure(trimStages[step], error);
}

/** Owns only trim work files; the caller retains ownership of the original video. */
export function useTrimSource(uri: string | null, onOutcome: (outcome: TrimOutcome) => void, mode: 'standalone' | 'review' = 'standalone') {
  const session = useRef<TrimSession | null>(null);
  const callback = useRef(onOutcome);
  useEffect(() => { callback.current = onOutcome; }, [onOutcome]);
  const [workingUri, setWorkingUri] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [previewAvailable, setPreviewAvailable] = useState(true);
  const [status, setStatus] = useState<'preparing' | 'ready' | 'failed'>('preparing');
  const playback = useTrimPlayback(mode === 'review');
  const { initialize, reset } = playback;
  useEffect(() => {
    if (!uri) return;
    let source: string | null = null;
    let step: keyof typeof trimStages = 'copyTrimSource';
    const current = new TrimSession({
      remove: deleteLocalVideo,
      cancelExport: () => {
        const pendingSource = source;
        if (pendingSource) void Promise.resolve().then(() => trainingVideoTrim().cancelTrim(pendingSource)).catch(() => undefined);
      },
      onOutcome: outcome => callback.current(outcome),
    });
    session.current = current;
    void (async () => {
      await Promise.resolve();
      if (!current.active) return;
      reset();
      setWorkingUri(null);
      setThumbnails([]);
      setStatus('preparing');
      setPreviewAvailable(true);
      source = await copyTrimSource(uri);
      current.own(source);
      if (!current.active) return;
      step = 'trimInfo';
      const info = await trainingVideoTrim().trimInfo(source);
      if (!current.active) return;
      if (info.videoTrackCount !== 1 || !Number.isFinite(info.durationMs) || info.durationMs <= 0) {
        throw Object.assign(new Error('Invalid trim source'), { code: 'INVALID_SOURCE' });
      }
      initialize(info.durationMs / 1000);
      if (mode === 'standalone') setStatus('ready');
      setWorkingUri(source);
      // Album editing remains usable without preview; camera review keeps its existing fallback.
      step = 'thumbnails';
      const images = await trainingVideoTrim().thumbnails(source, 10).catch(error => {
        if (mode === 'review') throw error;
        if (current.active) {
          warnTrimPreparation('thumbnails', error);
        }
        return [];
      });
      images.forEach(image => current.own(image));
      if (current.active) {
        setThumbnails(images);
        setStatus('ready');
      }
    })().catch(error => {
      if (!current.active) return;
      warnTrimPreparation(step, error);
      setStatus('failed');
      current.failed();
    });
    return () => current.dispose();
  }, [uri, initialize, reset, mode]);

  return { session, workingUri, thumbnails, status, previewAvailable, playback };
}
