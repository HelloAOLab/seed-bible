import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import { useSocialSection } from "../../hooks/useSocialSection";
import { TitledSection } from "../ui/TitledSection";

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
  } = useSocialSection();

  return (
    <TitledSection title={title}>
      <div className="history-card">
        <div
          onClick={() => handleUserFilterClick()}
          className="user-filter-container"
        >
          <span className="user-filter-label">Everyone</span>
          <MaterialIcon>{userFilterIcon}</MaterialIcon>
          {userFilterOpen && (
            <div className="user-filter-options">
              <button>User 1</button>
              <button>User 2</button>
              <button>User 3</button>
              <button>User 4</button>
              <button>User 5</button>
              <button>User 6</button>
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
      </div>
    </TitledSection>
  );
};
