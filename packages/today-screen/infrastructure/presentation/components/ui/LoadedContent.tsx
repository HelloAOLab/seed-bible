import { ResumeReadingSection } from "../containers/ResumeReadingSection";
import type { DividedSection } from "../containers/TodayContent";
import { Divider } from "./Divider";
import { Fragment } from "preact/jsx-runtime";
import { RecommendationsSection } from "../containers/RecommendationsSection";
import { SearchSection } from "../containers/SearchSection";
import { SocialSection } from "../containers/SocialSection";
import { BookmarksSection } from "../containers/BookmarksSection";

const sectionComponentMap: Record<DividedSection, () => preact.JSX.Element> = {
  recommendations: RecommendationsSection,
  search: SearchSection,
  social: SocialSection,
  bookmarks: BookmarksSection,
};

export const LoadedContent = ({
  showResumeReading,
  dividedSectionsIds,
}: {
  showResumeReading: boolean;
  dividedSectionsIds: DividedSection[];
}) => {
  return (
    <>
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
    </>
  );
};
