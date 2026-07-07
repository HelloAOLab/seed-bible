import type { TimeContextType } from "./TimeContext";
import { useState, useEffect } from "preact/hooks";

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
