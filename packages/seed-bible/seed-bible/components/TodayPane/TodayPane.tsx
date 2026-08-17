import type { ReadonlySignal } from "@preact/signals";
import type { Bookmark } from "../../managers/BookmarksManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";
import { TimeProvider } from "./TimeContext";
import { TodayContainer } from "./TodayContainer";
import { useI18n } from "../../i18n";
import "./TodayPane.css";

import { memo } from "preact/compat";

/**
 * What the Today screen needs from the rest of the app: the managers its cards
 * read, and the three actions that reach outside Today's own domain.
 *
 * Passed down whole through the two layout components, which are pure
 * pass-through; each leaf section takes only the subset it uses.
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
