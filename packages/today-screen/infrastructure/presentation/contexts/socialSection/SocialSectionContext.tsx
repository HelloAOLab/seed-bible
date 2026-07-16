import type { Timespan } from "../../../../domain/models/commonTypes";
import type { FilteredReading } from "../../../../domain/models/readingHistory";

import { createContext } from "preact";
import { useContext } from "preact/hooks";

export interface SocialSectionUserProfile {
  name: string;
  pictureUrl?: string | null | undefined;
  color: string;
  icon: string;
}

export interface SocialSectionContextType {
  /** Map of subscribed user id → whether their reading is currently shown. */
  userFilters: Map<string, boolean>;
  /** Map of subscribed user id → their visual profile. */
  userProfileMap: Map<string, SocialSectionUserProfile>;
  /** Year of the currently selected time filter (for the timeline). */
  year: number;
  /** Currently selected time window; `undefined` means "all" (no window). */
  timespan: Timespan | undefined;
  /** Community reading for the selected `timespan` (empty when "all"). */
  communityReading: FilteredReading;
  /** Selects a timeline year: sets `year` and clears `timespan`. */
  selectYear: (year: number) => void;
  /** Selects a timeline day: sets `timespan` to that day's range. */
  selectDay: (timespan: Timespan | undefined) => void;
  /** Toggles whether the given subscribed user's reading is shown. */
  toggleUserFilter: (id: string) => void;
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
