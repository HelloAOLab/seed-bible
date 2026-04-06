import { useTimeProvider } from "scriptureMap2D.contexts.Time.useTimeProvider";

const { createContext, useContext } = os.appHooks;

export interface TimeProviderProps {
  children: React.ReactNode;
}

export interface TimeContextType {
  tick: number;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export const TimeProvider = ({ children }: TimeProviderProps) => {
  const contextValue = useTimeProvider();

  return (
    <TimeContext.Provider value={contextValue}>{children}</TimeContext.Provider>
  );
};

export const useTimeContext = () => {
  const context = useContext(TimeContext);

  if (!context) {
    throw new Error("useTimeContext must be used within a TimeContext");
  }

  return context;
};
