import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { Animated, StyleSheet, View, type ScrollView } from 'react-native';

type Entry = { node: ReactNode; anchor: RefObject<View | null>; expanded: boolean; collapse: () => void; togglePlayback: () => void };
type Host = { update: (entry: Entry) => void; clear: () => void; measure: () => void; togglePlayback: () => void };
const Context = createContext<Host | null>(null);
export const useSetVideoPlayerHost = () => useContext(Context);
export type SetVideoPlayerHostHandle = { measure: () => void; requestClose: () => boolean };
type Frame = { left: number; top: number; width: number; viewportTop: number; viewportHeight: number };

/** The player lives here for its entire lifetime; the scrolling row supplies the inline touch target. */
export function SetVideoPlayerHost({ children, viewport, scrollY, obscured = false, ref }: {
  children: ReactNode;
  viewport: RefObject<ScrollView | null>;
  scrollY: Animated.Value;
  obscured?: boolean;
  ref?: Ref<SetVideoPlayerHostHandle>;
}) {
  const root = useRef<View>(null);
  const active = useRef<Entry | null>(null);
  const offset = useRef(0);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const measure = useCallback(() => {
    const anchor = active.current?.anchor.current;
    if (!anchor || !root.current || !viewport.current) return;
    root.current.measureInWindow((rootX, rootY) => {
      viewport.current?.getNativeScrollRef()?.measureInWindow((_x, viewportY, _width, viewportHeight) => {
        anchor.measureInWindow((x, y, width) => {
          if (anchor !== active.current?.anchor.current) return;
          setFrame({ left: x - rootX, top: y - viewportY + offset.current, width, viewportTop: viewportY - rootY, viewportHeight });
        });
      });
    });
  }, [viewport]);
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => { offset.current = value; });
    return () => scrollY.removeListener(listener);
  }, [scrollY]);
  const update = useCallback((next: Entry) => {
    const changedAnchor = active.current?.anchor !== next.anchor;
    active.current = next;
    setEntry(next);
    if (changedAnchor) measure();
  }, [measure]);
  const clear = useCallback(() => { active.current = null; setEntry(null); setFrame(null); }, []);
  const togglePlayback = useCallback(() => { active.current?.togglePlayback(); }, []);
  const host = useMemo(() => ({ update, clear, measure, togglePlayback }), [update, clear, measure, togglePlayback]);
  useImperativeHandle(ref, () => ({ measure, requestClose: () => {
    if (!active.current?.expanded) return false;
    active.current.collapse();
    return true;
  } }), [measure]);
  const [scrollFactor] = useState(() => new Animated.Value(-1));
  const translation = useMemo(() => Animated.multiply(scrollY, scrollFactor), [scrollY, scrollFactor]);
  const expanded = entry?.expanded ?? false;
  useLayoutEffect(() => {
    // Fabric does not reset detached native animation props. Keep the same graph
    // connected and explicitly zero its output so full screen cannot retain -scrollY.
    scrollFactor.setValue(expanded ? 0 : -1);
  }, [expanded, scrollFactor]);
  return <Context.Provider value={host}>
    <View ref={root} collapsable={false} style={styles.root} onLayout={measure}>
      <View style={styles.root} pointerEvents={expanded ? 'none' : 'auto'} importantForAccessibility={expanded ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      <View pointerEvents={obscured ? 'none' : 'box-none'} importantForAccessibility={obscured ? 'no-hide-descendants' : 'auto'} style={[styles.layer, { opacity: obscured ? 0 : 1 }, expanded ? StyleSheet.absoluteFill : { left: 0, right: 0, top: frame?.viewportTop ?? 0, height: frame?.viewportHeight ?? 0 }]}>
        <Animated.View pointerEvents="box-none" style={[
          expanded ? styles.root : { position: 'absolute', left: frame?.left ?? 0, top: frame?.top ?? 0, width: frame?.width ?? 0 },
          { transform: [{ translateY: translation }] },
        ]}>
          {entry?.node}
        </Animated.View>
      </View>
    </View>
  </Context.Provider>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, layer: { position: 'absolute', overflow: 'hidden' } });
