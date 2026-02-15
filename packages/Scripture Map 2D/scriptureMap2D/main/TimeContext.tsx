import type {
  TimeProviderProps,
  TimeContextType,
} from "scriptureMap2D.main.interfaces";

const { createContext, useContext, useState, useEffect } = os.appHooks;

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export const TimeProvider: (args: TimeProviderProps) => React.JSX.Element = ({
  children,
}) => {
  const [tick, setTick] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TimeContext.Provider value={{ tick }}>{children}</TimeContext.Provider>
  );
};

export const useTimeContext: () => TimeContextType = () => {
  const context = useContext(TimeContext);

  if (!context) {
    throw new Error("useTimeContext must be used within a TimeContext");
  }

  return context as TimeContextType;
};
