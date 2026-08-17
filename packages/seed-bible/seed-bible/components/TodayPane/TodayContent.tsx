import { useTodayContent } from "./useTodayContent";
import { Header } from "./Header";
import { ResumeReadingSection } from "./ResumeReadingSection";
import { Divider } from "./Divider";
import { Fragment } from "preact/jsx-runtime";
import { SearchSection } from "./SearchSection";
import { SocialSection } from "./SocialSection";
import { BookmarksSection } from "./BookmarksSection";
import type { TodayScreenProps } from "./TodayPane";

export type DividedSection = "search" | "social";

export const TodayContent = (props: TodayScreenProps) => {
  const { dividedSectionsIds, showResumeReading, showBookmarks } =
    useTodayContent(props);

  const sectionById: Record<DividedSection, preact.JSX.Element> = {
    search: (
      <SearchSection
        today={props.today}
        theme={props.theme}
        isMobile={props.isMobile}
        onOpenBookSelector={props.onOpenBookSelector}
        onOpenPassage={props.onOpenPassage}
      />
    ),
    social: (
      <SocialSection
        today={props.today}
        login={props.login}
        theme={props.theme}
        onOpenPassage={props.onOpenPassage}
      />
    ),
  };

  return (
    <div className="today-content">
      <Header login={props.login} />
      {showResumeReading && (
        <ResumeReadingSection
          today={props.today}
          onOpenPassage={props.onOpenPassage}
        />
      )}
      {showBookmarks && (
        <BookmarksSection
          today={props.today}
          bookmarks={props.bookmarks}
          isMobile={props.isMobile}
          onOpenPassage={props.onOpenPassage}
          onShowBookmarksList={props.onShowBookmarksList}
        />
      )}
      {dividedSectionsIds.map((id, index) => {
        const isLastItem = index === dividedSectionsIds.length - 1;

        return (
          <Fragment key={id}>
            {sectionById[id]}
            {!isLastItem && <Divider />}
          </Fragment>
        );
      })}
    </div>
  );
};
