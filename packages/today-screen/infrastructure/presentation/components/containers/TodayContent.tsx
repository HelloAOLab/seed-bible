import { useTodayContent } from "../../hooks/useTodayContent";
import { Header } from "./Header";
import { ResumeReadingSection } from "./ResumeReadingSection";
import { Divider } from "../ui/Divider";
import { Fragment } from "preact/jsx-runtime";
import { RecommendationsSection } from "./RecommendationsSection";
import { SearchSection } from "./SearchSection";
import { SocialSection } from "./SocialSection";
import { BookmarksSection } from "./BookmarksSection";

export type DividedSection =
  | "search"
  | "recommendations"
  | "social"
  | "bookmarks";

const sectionComponentMap: Record<DividedSection, () => preact.JSX.Element> = {
  recommendations: RecommendationsSection,
  search: SearchSection,
  social: SocialSection,
  bookmarks: BookmarksSection,
};

export const TodayContent = () => {
  const { dividedSectionsIds, showResumeReading } = useTodayContent();

  return (
    <div className="today-content">
      <Header />
      {showResumeReading && <ResumeReadingSection />}
      {dividedSectionsIds.map((id, index) => {
        const isLastItem = index === dividedSectionsIds.length - 1;
        const Section = sectionComponentMap[id];

        return (
          <Fragment key={id}>
            <Section />
            {!isLastItem && <Divider />}
          </Fragment>
        );
      })}
    </div>
  );
};
