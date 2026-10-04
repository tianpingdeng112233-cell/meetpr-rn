import { useCallback, useEffect, useRef, useState } from 'react';
import { type VideoRef } from 'react-native-video';
import { VIDEO_MAX_DURATION_SECONDS } from './model';
import { createTrimSelection, isTrimSelectionValid, moveTrimEnd, moveTrimStart } from './trim-selection';

/** The same seek gate, handle rules and playback bounds serve both trim presentations. */
export function useTrimPlayback(loop: boolean) {
  const player = useRef<VideoRef>(null);
  const [selection, setSelection] = useState(() => createTrimSelection(0, VIDEO_MAX_DURATION_SECONDS));
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(loop);
  const positionRef = useRef(0);
  const [position, setPosition] = useState(0);
  const updatePosition = (seconds: number) => { positionRef.current = seconds; setPosition(seconds); };
  const pendingSeek = useRef<number | null>(null);
  const dragSeekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedSeek = useRef<number | null>(null);
  const dragging = useRef(false);
  const clearDragSeek = useCallback(() => {
    if (dragSeekTimer.current !== null) clearTimeout(dragSeekTimer.current);
    dragSeekTimer.current = null;
    queuedSeek.current = null;
    dragging.current = false;
  }, []);
  useEffect(() => clearDragSeek, [clearDragSeek]);
  const ready = loaded && isTrimSelectionValid(selection);
  const initialize = useCallback((duration: number) => {
    clearDragSeek();
    setSelection(createTrimSelection(duration, VIDEO_MAX_DURATION_SECONDS));
    positionRef.current = 0;
    setPosition(0);
    pendingSeek.current = null;
  }, [clearDragSeek]);
  const reset = useCallback(() => {
    initialize(0);
    setLoaded(false);
    setPlaying(loop);
  }, [initialize, loop]);
  const seek = (seconds: number, exact = true) => {
    pendingSeek.current = seconds;
    updatePosition(seconds);
    if (exact) {
      clearDragSeek();
      player.current?.seek(seconds, 0);
      return;
    }
    dragging.current = true;
    // A leading seek plus one trailing latest target per 100 ms window.
    const flush = () => {
      if (queuedSeek.current === null) { dragSeekTimer.current = null; return; }
      const target = queuedSeek.current;
      queuedSeek.current = null;
      player.current?.seek(target, 0.1);
      dragSeekTimer.current = setTimeout(flush, 100);
    };
    queuedSeek.current = seconds;
    if (dragSeekTimer.current === null) flush();
  };
  const rewind = () => { setPlaying(loop); seek(selection.startSeconds); };
  const move = (edge: 'start' | 'end', seconds: number) => {
    setPlaying(false);
    const next = edge === 'start' ? moveTrimStart(selection, seconds) : moveTrimEnd(selection, seconds);
    setSelection(next);
    seek(edge === 'start' ? next.startSeconds : next.endSeconds);
  };
  const scrub = (seconds: number, exact = true) => {
    setPlaying(false);
    seek(Math.max(0, Math.min(selection.sourceDurationSeconds, seconds)), exact);
  };
  const toggle = () => {
    if (playing) { setPlaying(false); return; }
    if (isTrimSelectionValid(selection) && (!Number.isFinite(positionRef.current) || positionRef.current < selection.startSeconds || positionRef.current >= selection.endSeconds)) seek(selection.startSeconds);
    setPlaying(true);
  };
  const onSeek = ({ seekTime }: { seekTime: number }) => {
    // Superseded handle seeks must not unlock a newer seek.
    if (!dragging.current && pendingSeek.current !== null && Math.abs(seekTime - pendingSeek.current) < 0.002) {
      updatePosition(pendingSeek.current);
      pendingSeek.current = null;
    }
  };
  const onProgress = ({ currentTime }: { currentTime: number }) => {
    if (!playing || dragging.current || pendingSeek.current !== null || !Number.isFinite(currentTime)) return;
    updatePosition(currentTime);
    if (playing && isTrimSelectionValid(selection) && currentTime >= selection.endSeconds - 0.03) rewind();
  };
  const onEnd = () => { if (playing && pendingSeek.current === null && isTrimSelectionValid(selection)) rewind(); };
  return { player, position, scrub, selection, ready, playing, setPlaying, initialize, reset, move, toggle,
    onLoad: () => setLoaded(true), onSeek, onProgress, onEnd };
}
