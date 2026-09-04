import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import { colors, resolveColors, type Colors, type Scheme } from './tokens';

export { resolveColors, colors } from './tokens';
export type Appearance = 'system' | 'light' | 'dark';
type ThemeValue = {
  colors: Colors;
  scheme: Scheme;
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
};
const ThemeContext = createContext<ThemeValue>({
  colors,
  scheme: 'light',
  appearance: 'light',
  setAppearance: () => undefined,
});
const APPEARANCE_KEY = 'meetpr.appearance';

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [appearance, updateAppearance] = useState<Appearance>('light');
  const preferenceChanged = useRef(false);
  const pendingWrites = useRef(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(APPEARANCE_KEY)
      .then((stored) => {
        // A late storage read must not overwrite a preference selected this session.
        if (
          mounted && !preferenceChanged.current &&
          (stored === 'light' || stored === 'dark' || stored === 'system')
        ) {
          updateAppearance(stored);
        }
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const setAppearance = useCallback((next: Appearance) => {
    preferenceChanged.current = true;
    updateAppearance(next);
    // Preserve the last selection even when storage writes complete slowly.
    pendingWrites.current = pendingWrites.current
      .then(() => AsyncStorage.setItem(APPEARANCE_KEY, next))
      .catch(() => undefined);
  }, []);

  const scheme = appearance === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : appearance;
  const value = useMemo(
    () => ({ colors: resolveColors(scheme), scheme, appearance, setAppearance }),
    [scheme, appearance, setAppearance],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  return useTheme().colors;
}
