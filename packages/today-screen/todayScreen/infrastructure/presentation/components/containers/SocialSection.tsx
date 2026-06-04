import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { useSocialSection } from "../../hooks/useSocialSection";
import { useReadingHistoryTimeline } from "../../hooks/useReadingHistoryTimeline";
import { useTodayContext } from "../../contexts/today/TodayContext";
import { SocialSectionProvider } from "../../contexts/socialSection/SocialSectionContext";
import { TitledSection } from "../ui/TitledSection";
import { FilteredReading } from "./FilteredReading";

const ReadingHistoryTimelineSection = () => {
  const { ReadingHistoryTimeline } = useTodayContext();
  const { itemsData, timelineRef } = useReadingHistoryTimeline();

  return (
    <ReadingHistoryTimeline itemsData={itemsData} timelineRef={timelineRef} />
  );
};

export interface TimespanFilterOptionData {
  label: string;
  id: CommunityReadingSpanId | "all";
  onClick: () => void;
  isSelected: boolean;
}

export const SocialSection = () => {
  const {
    title,
    MaterialIcon,
    handleUserFilterClick,
    userFilterOpen,
    userFilterIcon,
    timespanFilterOptionsData,
    selectedTimespanOptionId,
    userFilters,
    userProfileMap,
    handleFilterOptionClick,
    userFilterText,
    optionsRef,
    optionsContainerRef,
  } = useSocialSection();

  return (
    <SocialSectionProvider value={{ userFilters, userProfileMap }}>
      <TitledSection title={title}>
        <div className="history-card">
          <div
            onClick={(e) => handleUserFilterClick(e)}
            className="user-filter-container"
            ref={optionsContainerRef}
          >
            <span className="user-filter-label">{userFilterText}</span>
            <MaterialIcon>{userFilterIcon}</MaterialIcon>
            {userFilterOpen && (
              <div
                ref={optionsRef}
                className="user-filter-options"
                onClick={(e) => e.stopPropagation()}
              >
                {[...userFilters.entries()].map(([id, selected]) => {
                  const profile = userProfileMap.get(id)!;
                  return (
                    <button
                      onClick={(e) => {
                        handleFilterOptionClick(e, id);
                      }}
                      className={`user-filter-option${selected ? " user-filter-option-selected" : ""}`}
                    >
                      <div style={{ backgroundColor: profile.color }}></div>
                      {profile.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="timespan-filter-container">
            {timespanFilterOptionsData.map((data) => {
              return (
                <button
                  onClick={data.onClick}
                  key={data.id}
                  className={`timespan-filter-option${data.isSelected ? " timespan-filter-option-selected" : ""}`}
                >
                  {data.label}
                </button>
              );
            })}
          </div>
          {selectedTimespanOptionId === "all" && (
            <ReadingHistoryTimelineSection />
          )}
          <FilteredReading timespanId={selectedTimespanOptionId} />
        </div>
      </TitledSection>
    </SocialSectionProvider>
  );
};
