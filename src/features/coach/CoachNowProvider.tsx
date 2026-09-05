import { AppState } from 'react-native';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
const Context = createContext<Date | null>(null);
/** The only wall-clock source in CoachKit. Active also handles clock/time-zone changes. */
export function CoachNowProvider({ children }: PropsWithChildren) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      clearTimeout(timer);
      const timestamp = new Date();
      setNow(timestamp);
      const midnight = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate() + 1);
      timer = setTimeout(advance, Math.max(1, midnight.getTime() - timestamp.getTime()));
    };
    advance();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') advance(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  return <Context.Provider value={now}>{children}</Context.Provider>;
}
export function useCoachNow(): Date {
  const now = useContext(Context);
  if (!now) throw new Error('CoachNowProvider is required');
  return now;
}
