import type { TodayContextType } from "./TodayContext";
import type { TodayConfig } from "../../components/Today";

// const { useState, useCallback, useMemo, useEffect } = os.appHooks;

type UseTodayProvider = (config: TodayConfig) => TodayContextType;

export const useTodayProvider: UseTodayProvider = (config) => {
  // const {} = config;

  // const isMobile = useIsMobile(768);

  return {
    ...config,
  };
};
