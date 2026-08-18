import type { ReadonlySignal } from "@preact/signals";
import { Fragment } from "preact/jsx-runtime";
import { useHistoryCard } from "./useHistoryCard";
import { useReadingHistoryTimeline } from "./useReadingHistoryTimeline";
import { MaterialIcon } from "../icons";
import { ReadingHistoryTimeline } from "../ReadingHistoryTimeline/ReadingHistoryTimeline";
import { FilteredReading } from "./FilteredReading";
import { Tooltip } from "./Tooltip";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

const ReadingHistoryTimelineSection = (props: {
  today: TodayManager;
  theme: ReadonlySignal<BibleTheme>;
}) => {
  const { itemsData, timelineRef, footer } = useReadingHistoryTimeline(props);

  return (
    <ReadingHistoryTimeline
      itemsData={itemsData}
      timelineRef={timelineRef}
      footer={footer}
      Tooltip={Tooltip}
    />
  );
};

export const HistoryCard = (props: {
  today: TodayManager;
  theme: ReadonlySignal<BibleTheme>;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const {
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
          <ReadingHistoryTimelineSection
            today={props.today}
            theme={props.theme}
          />
          {dateLabel && <span className="date-label">{dateLabel}</span>}
        </Fragment>
      )}
      <FilteredReading
        today={props.today}
        onOpenPassage={props.onOpenPassage}
      />
    </div>
  );
};
