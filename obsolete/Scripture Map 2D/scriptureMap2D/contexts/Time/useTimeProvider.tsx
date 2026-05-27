import type { TimeContextType } from "scriptureMap2D.contexts.Time.TimeContext";
const { useState, useEffect } = os.appHooks;

export const useTimeProvider = (): TimeContextType => {
  const [tick, setTick] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return {
    tick,
  };
};
