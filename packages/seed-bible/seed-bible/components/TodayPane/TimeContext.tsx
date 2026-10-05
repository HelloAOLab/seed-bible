import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";

export interface TimeContextType {
  tick: number;
}

/**
 * How often {@link TimeProvider} re-renders its subtree. Exported so tests can
 * advance the clock by the real cadence instead of a copy that could drift.
 */
export const TICK_INTERVAL_MS = 10000;

const TimeContext = createContext<TimeContextType | undefined>(undefined);

/**
 * Re-renders its subtree every ten seconds so that time-relative content — the
 * header's date and greeting, the timeline's day buckets — stays current
 * without each consumer running its own timer.
 */
export const TimeProvider = ({ children }: { children: React.ReactNode }) => {
  const [tick, setTick] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now());
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <TimeContext.Provider value={{ tick }}>{children}</TimeContext.Provider>
  );
};

export const useTimeContext = () => {
  const context = useContext(TimeContext);

  if (!context) {
    throw new Error("useTimeContext must be used within a TimeContext");
  }

  return context;
};
