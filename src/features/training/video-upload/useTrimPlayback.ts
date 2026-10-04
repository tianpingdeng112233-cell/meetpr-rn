import { useCallback, useRef, useState } from 'react';
import { type VideoRef } from 'react-native-video';
import { VIDEO_MAX_DURATION_SECONDS } from './model';
import { createTrimSelection, isTrimSelectionValid, moveTrimEnd, moveTrimStart } from './trim-selection';

/** The same seek gate, handle rules and playback bounds serve both trim presentations. */
export function useTrimPlayback(loop: boolean) {
  const player = useRef<VideoRef>(null);
  const [selection, setSelection] = useState(() => createTrimSelection(0, VIDEO_MAX_DURATION_SECONDS));
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(loop);
  const position = useRef(0);
  const pendingSeek = useRef<number | null>(null);
  const ready = loaded && isTrimSelectionValid(selection);
  const initialize = useCallback((duration: number) => {
    setSelection(createTrimSelection(duration, VIDEO_MAX_DURATION_SECONDS));
    position.current = 0;
    pendingSeek.current = null;
  }, []);
  const reset = useCallback(() => {
    initialize(0);
    setLoaded(false);
    setPlaying(loop);
  }, [initialize, loop]);
  const seek = (seconds: number) => {
    pendingSeek.current = seconds;
    position.current = seconds;
    player.current?.seek(seconds, 0);
  };
  const rewind = () => { setPlaying(loop); seek(selection.startSeconds); };
  const move = (edge: 'start' | 'end', seconds: number) => {
    setPlaying(false);
    const next = edge === 'start' ? moveTrimStart(selection, seconds) : moveTrimEnd(selection, seconds);
    setSelection(next);
    seek(edge === 'start' ? next.startSeconds : next.endSeconds);
  };
  const toggle = () => {
    if (playing) { setPlaying(false); return; }
    if (isTrimSelectionValid(selection) && (!Number.isFinite(position.current) || position.current < selection.startSeconds || position.current >= selection.endSeconds)) seek(selection.startSeconds);
    setPlaying(true);
  };
  const onSeek = ({ seekTime }: { seekTime: number }) => {
    // Superseded handle seeks must not unlock a newer seek.
    if (pendingSeek.current !== null && Math.abs(seekTime - pendingSeek.current) < 0.002) {
      position.current = pendingSeek.current;
      pendingSeek.current = null;
    }
  };
  const onProgress = ({ currentTime }: { currentTime: number }) => {
    if (pendingSeek.current !== null || !Number.isFinite(currentTime)) return;
    position.current = currentTime;
    if (playing && isTrimSelectionValid(selection) && currentTime >= selection.endSeconds - 0.03) rewind();
  };
  const onEnd = () => { if (playing && pendingSeek.current === null && isTrimSelectionValid(selection)) rewind(); };
  return { player, selection, ready, playing, setPlaying, initialize, reset, move, toggle,
    onLoad: () => setLoaded(true), onSeek, onProgress, onEnd };
}
