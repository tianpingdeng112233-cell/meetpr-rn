import { useEffect, useRef, useState } from 'react';
import { deleteLocalVideo } from './native';
import { copyTrimSource, trainingVideoTrim } from './trim-native';
import { TrimSession, type TrimOutcome } from './trim-session';
import { useTrimPlayback } from './useTrimPlayback';

export function warnTrimPreparation(step: string, error: unknown) {
  const detail = error && typeof error === 'object' ? error as { name?: unknown; message?: unknown } : {};
  const safeText = (value: unknown, fallback: string) => {
    if (typeof value !== 'string') return fallback;
    // Native errors can embed source paths, including filenames with spaces.
    // Omit the whole field in that case; never log the error object or stack.
    return /[/\\]|\b[a-z][a-z0-9+.-]*:/i.test(value) ? '[redacted]' : value;
  };
  console.warn(`[VideoTrim] ${step}`, {
    name: safeText(detail.name, 'Error'),
    message: safeText(detail.message ?? error, 'Unknown error'),
  });
}

/** Owns only trim work files; the caller retains ownership of the original video. */
export function useTrimSource(uri: string | null, onOutcome: (outcome: TrimOutcome) => void, mode: 'standalone' | 'review' = 'standalone') {
  const session = useRef<TrimSession | null>(null);
  const callback = useRef(onOutcome);
  useEffect(() => { callback.current = onOutcome; }, [onOutcome]);
  const [workingUri, setWorkingUri] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [status, setStatus] = useState<'preparing' | 'ready' | 'failed'>('preparing');
  const playback = useTrimPlayback(mode === 'review');
  const { initialize, reset } = playback;
  useEffect(() => {
    if (!uri) return;
    let source: string | null = null;
    let step = 'copyTrimSource';
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
      source = await copyTrimSource(uri);
      current.own(source);
      if (!current.active) return;
      step = 'trimInfo';
      const info = await trainingVideoTrim().trimInfo(source);
      if (!current.active) return;
      if (info.videoTrackCount !== 1 || !Number.isFinite(info.durationMs) || info.durationMs <= 0) {
        throw new Error('Invalid trim source');
      }
      initialize(info.durationMs / 1000);
      if (mode === 'standalone') setStatus('ready');
      setWorkingUri(source);
      // Standalone keeps its decorative-thumbnail fallback; review falls back to the original clip.
      step = 'thumbnails';
      const images = await trainingVideoTrim().thumbnails(source, 10).catch(error => {
        if (mode === 'review') throw error;
        warnTrimPreparation('thumbnails', error);
        return [];
      });
      images.forEach(image => current.own(image));
      if (current.active) {
        setThumbnails(images);
        setStatus('ready');
      }
    })().catch(error => {
      warnTrimPreparation(step, error);
      if (current.active) setStatus('failed');
      current.failed();
    });
    return () => current.dispose();
  }, [uri, initialize, reset, mode]);

  return { session, workingUri, thumbnails, status, playback };
}
