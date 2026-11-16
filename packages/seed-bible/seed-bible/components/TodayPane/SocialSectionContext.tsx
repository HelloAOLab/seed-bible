import type { Timespan } from "../../managers/TodayReadingHistory";

import { createContext } from "preact";
import { useContext } from "preact/hooks";

export interface SocialSectionUserProfile {
  name: string;
  pictureUrl?: string | null | undefined;
  color: string;
  icon: string;
}

export interface SocialSectionContextType {
  /** Map of community member id → whether their reading is currently shown. */
  userFilters: Map<string, boolean>;
  /** Map of community member id → their visual profile. */
  userProfileMap: Map<string, SocialSectionUserProfile>;
  /** Year the timeline shows while the "all" window is selected. */
  year: number;
  /** The day picked in the timeline; `undefined` means no day is picked. */
  timespan: Timespan | undefined;
  /** Selects a timeline year: sets `year` and clears `timespan`. */
  selectYear: (year: number) => void;
  /** Selects a timeline day: sets `timespan` to that day's range. */
  selectDay: (timespan: Timespan | undefined) => void;
}

interface SocialSectionProviderProps {
  children: React.ReactNode;
  value: SocialSectionContextType;
}

const SocialSectionContext = createContext<
  SocialSectionContextType | undefined
>(undefined);

export const SocialSectionProvider = ({
  children,
  value,
}: SocialSectionProviderProps) => {
  return (
    <SocialSectionContext.Provider value={value}>
      {children}
    </SocialSectionContext.Provider>
  );
};

export const useSocialSectionContext = () => {
  const context = useContext(SocialSectionContext);

  if (!context) {
    throw new Error(
      "useSocialSectionContext must be used within a SocialSectionProvider"
    );
  }

  return context;
};
