import { useSocialSection } from "../../hooks/useSocialSection";
import { SocialSectionProvider } from "../../contexts/socialSection/SocialSectionContext";
import { TitledSection } from "../ui/TitledSection";
// import { PresenceCard } from "./PresenceCard";
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
        {/* <PresenceCard /> */}
        <HistoryCard />
      </TitledSection>
    </SocialSectionProvider>
  );
};
