import { useTodayContent } from "../../hooks/useTodayContent";
import { Header } from "./Header";

export type DividedSection =
  | "search"
  | "recommendations"
  | "social"
  | "bookmarks";

export const TodayContent = () => {
  const { Content, showResumeReading, dividedSectionsIds } = useTodayContent();

  return (
    <div className="today-content">
      <Header />
      <Content
        showResumeReading={showResumeReading}
        dividedSectionsIds={dividedSectionsIds}
      />
    </div>
  );
};
