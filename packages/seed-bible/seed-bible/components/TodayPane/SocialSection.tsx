import { useSocialSection } from "./useSocialSection";
import { SocialSectionProvider } from "./SocialSectionContext";
import { TitledSection } from "./TitledSection";
import { HistoryCard } from "./HistoryCard";

export const SocialSection = () => {
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
  } = useSocialSection();

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
        <HistoryCard />
      </TitledSection>
    </SocialSectionProvider>
  );
};
