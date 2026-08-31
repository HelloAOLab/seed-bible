import type { ReadonlySignal } from "@preact/signals";
import type { Bookmark } from "../../managers/BookmarksManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";
import { TimeProvider } from "./TimeContext";
import { Welcome } from "./Welcome";
import { Header } from "./Header";
import { ResumeReadingSection } from "./ResumeReadingSection";
import { BookmarksSection } from "./BookmarksSection";
import { SearchSection } from "./SearchSection";
import { SocialSection } from "./SocialSection";
import { useI18n } from "../../i18n";
import "./TodayPane.css";

import { memo } from "preact/compat";

/**
 * What the Today screen needs from the rest of the app: the managers its cards
 * read, and the three actions that reach outside Today's own domain.
 *
 * Passed down whole through the two layout components below; each leaf section
 * takes only the subset it uses.
 */
export interface TodayScreenProps {
  today: TodayManager;
  login: LoginManager;
  bookmarks: ReadonlySignal<Bookmark[]>;
  theme: ReadonlySignal<BibleTheme>;
  isMobile: ReadonlySignal<boolean>;
  /** Opens a passage in the reader and leaves Today. */
  onOpenPassage: (target: TodayPassageTarget) => void;
  /** Opens the book selector over the reader. */
  onOpenBookSelector: () => void;
  /** Reveals the full bookmarks list in the sidebar. */
  onShowBookmarksList: () => void;
}

export const TodayPane = memo<(props: TodayScreenProps) => preact.JSX.Element>(
  (props) => (
    <TimeProvider>
      <TodayContainer {...props} />
    </TimeProvider>
  )
);

/** Pane header title. A component so it can call `useI18n`. */
export function TodayPaneTitle() {
  const { t } = useI18n();
  return <>{t("today", { defaultValue: "Today" })}</>;
}

/**
 * Chooses between the Welcome page and the personalized layout.
 *
 * Welcome is a definite state — shown only when the user is known to have no
 * reading history (`empty`). `loading` and `ready` both render the personalized
 * layout (`loading` shows placeholders), so a returning user never flashes
 * Welcome while their history loads.
 */
function TodayContainer(props: TodayScreenProps) {
  const showWelcome = props.today.readingHistory.value.status === "empty";

  return (
    <div
      className="sb-today-container"
      style={{ alignItems: showWelcome ? "safe center" : "flex-start" }}
    >
      {showWelcome ? (
        <Welcome
          today={props.today}
          login={props.login}
          theme={props.theme}
          onOpenBookSelector={props.onOpenBookSelector}
          onOpenPassage={props.onOpenPassage}
        />
      ) : (
        <TodayContent {...props} />
      )}
    </div>
  );
}

function TodayContent(props: TodayScreenProps) {
  return (
    <div className="sb-today-content">
      <Header login={props.login} />
      {/* Unconditional: `TodayContainer` only reaches here while history is
          loading or ready, and the resume card renders a placeholder for the
          former. The `empty` case rendered Welcome instead. */}
      <ResumeReadingSection
        today={props.today}
        onOpenPassage={props.onOpenPassage}
      />
      {props.bookmarks.value.length > 0 && (
        <BookmarksSection
          today={props.today}
          bookmarks={props.bookmarks}
          isMobile={props.isMobile}
          onOpenPassage={props.onOpenPassage}
          onShowBookmarksList={props.onShowBookmarksList}
        />
      )}
      <SearchSection
        today={props.today}
        theme={props.theme}
        isMobile={props.isMobile}
        onOpenBookSelector={props.onOpenBookSelector}
        onOpenPassage={props.onOpenPassage}
      />
      <div className="sb-today-divider" />
      <SocialSection
        today={props.today}
        login={props.login}
        theme={props.theme}
        onOpenPassage={props.onOpenPassage}
      />
    </div>
  );
}
