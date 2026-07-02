import { useTodayProvider } from "./useTodayProvider";
import type { TodayConfig } from "../../components/Today";

interface TodayProviderProps {
  children: React.ReactNode;
  config: TodayConfig;
}

export interface TodayContextType extends TodayConfig {
  test?: string;
}

import { createContext } from "preact";
import { useContext } from "preact/hooks";

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
