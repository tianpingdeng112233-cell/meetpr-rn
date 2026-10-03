import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

type OverlayHost = {
  isFallback: false;
  present: (node: ReactNode, onRequestClose?: () => void) => void;
  dismiss: () => void;
};

const fallback = { isFallback: true } as const;
const OverlayHostContext = createContext<OverlayHost | typeof fallback>(
  fallback,
);

export type OverlayHostHandle = {
  dismiss: () => void;
  requestClose: () => boolean;
};

export function OverlayHostProvider({
  children,
  ref,
}: {
  children: ReactNode;
  ref?: Ref<OverlayHostHandle>;
}) {
  const [overlay, setOverlay] = useState<{
    node: ReactNode;
    onRequestClose: () => void;
  } | null>(null);
  const dismiss = useCallback(() => setOverlay(null), []);
  const present = useCallback(
    (node: ReactNode, onRequestClose = dismiss) =>
      setOverlay({ node, onRequestClose }),
    [dismiss],
  );
  const requestClose = useCallback(() => {
    if (!overlay) return false;
    overlay.onRequestClose();
    return true;
  }, [overlay]);
  // Android Modal consumes native back events before BackHandler receives them.
  // Its owner forwards onRequestClose through this handle.
  useImperativeHandle(ref, () => ({ dismiss, requestClose }), [
    dismiss,
    requestClose,
  ]);
  useEffect(() => {
    if (!overlay) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      requestClose,
    );
    return () => subscription.remove();
  }, [overlay, requestClose]);
  const host = useMemo<OverlayHost>(
    () => ({ isFallback: false, present, dismiss }),
    [present, dismiss],
  );

  return (
    <OverlayHostContext.Provider value={host}>
      <View style={styles.root}>
        {children}
        {overlay !== null ? (
          <View style={[StyleSheet.absoluteFill, styles.overlay]}>
            {overlay.node}
          </View>
        ) : null}
      </View>
    </OverlayHostContext.Provider>
  );
}

export function useOverlayHost() {
  return useContext(OverlayHostContext);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { zIndex: 1000, elevation: 24 },
});
