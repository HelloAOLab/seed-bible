import { useTodayProvider } from "./useTodayProvider";
import type { TodayConfig } from "todayScreen.infrastructure.presentation.components.Today";

interface TodayProviderProps {
  children: React.ReactNode;
  config: TodayConfig;
}

export interface TodayContextType extends TodayConfig {
  test?: string;
}

const { createContext, useContext } = os.appHooks;

const TodayContext = createContext<TodayContextType | undefined>(undefined);

export const TodayProvider = ({ children, config }: TodayProviderProps) => {
  const value = useTodayProvider(config);

  return (
    <TodayContext.Provider value={value}>{children}</TodayContext.Provider>
  );
};

export const useTodayContext = () => {
  const context = useContext(TodayContext);

  if (!context) {
    throw new Error(
      "useTodayContext must be used within a ScriptureMapContext"
    );
  }

  return context;
};
