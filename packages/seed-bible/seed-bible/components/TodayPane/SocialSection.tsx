import type { ReadonlySignal } from "@preact/signals";
import { useSocialSection } from "./useSocialSection";
import { SocialSectionProvider } from "./SocialSectionContext";
import { TitledSection } from "./TitledSection";
import { HistoryCard } from "./HistoryCard";
import type { LoginManager } from "../../managers/LoginManager";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

export const SocialSection = (props: {
  today: TodayManager;
  login: LoginManager;
  theme: ReadonlySignal<BibleTheme>;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const {
    title,
    userFilters,
    userProfileMap,
    toggleUserFilter,
    year,
    timespan,
    communityReading,
    selectYear,
    selectDay,
  } = useSocialSection(props);

  return (
    <SocialSectionProvider
      value={{
        userFilters,
        userProfileMap,
        toggleUserFilter,
        year,
        timespan,
        communityReading,
        selectYear,
        selectDay,
      }}
    >
      <TitledSection title={title}>
        <HistoryCard
          today={props.today}
          theme={props.theme}
          onOpenPassage={props.onOpenPassage}
        />
      </TitledSection>
    </SocialSectionProvider>
  );
};
