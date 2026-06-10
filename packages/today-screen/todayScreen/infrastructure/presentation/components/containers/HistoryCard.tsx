import { Fragment } from "preact/jsx-runtime";
import { useHistoryCard } from "../../hooks/useHistoryCard";
import { useReadingHistoryTimeline } from "../../hooks/useReadingHistoryTimeline";
import { useTodayContext } from "../../contexts/today/TodayContext";
import { FilteredReading } from "./FilteredReading";

const ReadingHistoryTimelineSection = () => {
  const { ReadingHistoryTimeline } = useTodayContext();
  const { itemsData, timelineRef, footer } = useReadingHistoryTimeline();

  return (
    <ReadingHistoryTimeline
      itemsData={itemsData}
      timelineRef={timelineRef}
      footer={footer}
    />
  );
};

export const HistoryCard = () => {
  const {
    MaterialIcon,
    userFilterOpen,
    userFilterIcon,
    handleUserFilterClick,
    optionsRef,
    optionsContainerRef,
    userFilters,
    userProfileMap,
    handleFilterOptionClick,
    userFilterText,
    timespanFilterOptionsData,
    selectedTimespanOptionId,
    dateLabel,
    timespanFilterRef,
  } = useHistoryCard();

  return (
    <div className="history-card today-section-card">
      <div
        onClick={(e) => handleUserFilterClick(e)}
        className="user-filter-container clickable"
        ref={optionsContainerRef}
      >
        <span className="user-filter-label">{userFilterText}</span>
        <MaterialIcon>{userFilterIcon.value}</MaterialIcon>
        {userFilterOpen.value && (
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
                  className={`user-filter-option${selected ? " user-filter-option-selected" : ""} clickable`}
                >
                  <div style={{ backgroundColor: profile.color }}></div>
                  {profile.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="timespan-filter-container" ref={timespanFilterRef}>
        {timespanFilterOptionsData.value.map((data) => {
          return (
            <button
              onClick={data.onClick}
              key={data.id}
              className={`timespan-filter-option${data.isSelected ? " timespan-filter-option-selected" : ""} clickable`}
            >
              {data.label}
            </button>
          );
        })}
      </div>
      {selectedTimespanOptionId.value === "all" && (
        <Fragment>
          <ReadingHistoryTimelineSection />
          {dateLabel && <span className="date-label">{dateLabel}</span>}
        </Fragment>
      )}
      <FilteredReading />
    </div>
  );
};
