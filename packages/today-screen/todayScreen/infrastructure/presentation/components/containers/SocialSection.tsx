import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { useSocialSection } from "../../hooks/useSocialSection";
import { TitledSection } from "../ui/TitledSection";
import { ReadingHistoryTimeline } from "./ReadingHistoryTimeline";
import { FilteredReading } from "./FilteredReading";

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
    handleFilterOptionClick,
    userFilterText,
    optionsRef,
    optionsContainerRef,
  } = useSocialSection();

  return (
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
              {userFilters.map((filter) => {
                return (
                  <button
                    onClick={(e) => {
                      handleFilterOptionClick(e, filter.id);
                    }}
                    className={`user-filter-option${filter.selected ? " user-filter-option-selected" : ""}`}
                  >
                    <div style={{ backgroundColor: filter.color }}></div>
                    {filter.name}
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
        {selectedTimespanOptionId === "all" ? (
          <ReadingHistoryTimeline />
        ) : (
          <FilteredReading
            timespanId={selectedTimespanOptionId}
            userFilters={userFilters}
          />
        )}
      </div>
    </TitledSection>
  );
};
