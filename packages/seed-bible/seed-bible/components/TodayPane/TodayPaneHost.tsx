import { useI18n } from "../../i18n";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  openTodayPassage,
  type TodayManager,
} from "../../managers/TodayManager";
import { TodayPane } from "./TodayPane";

/**
 * Adapts core managers into the `TodayConfig` bag the Today tree still reads
 * through `TodayContext`. This exists only so the move off the extension could
 * leave the presentation layer untouched; it disappears when the components
 * start taking manager props directly.
 */
export function TodayPaneHost(props: {
  state: SeedBibleState;
  today: TodayManager;
}) {
  const { state, today } = props;
  const userId = state.login.userId.value ?? undefined;
  const profile = state.login.profile.value;

  return (
    <TodayPane
      config={{
        username: profile?.name,
        userId,
        userProfile: userId
          ? {
              name: profile?.name ?? "Guest",
              pictureUrl: profile?.pictureUrl,
              color: getUserAnimalVisual(userId).color,
              icon: getUserAnimalVisual(userId).defaultIcon,
            }
          : undefined,
        isMobile: state.app.isMobile,
        theme: state.theme.currentTheme.value,
        readingHistory: today.readingHistory,
        getCommunityReading: today.getCommunityReading,
        getReadingHistoryEvents: today.getReadingHistoryEvents,
        readingHistoryConfigProvider: today.readingHistoryConfigProvider,
        subscribedUsersProfileProvider: today.subscribedUsers,
        subscribedUsersIdsProvider: today.subscribedUsers,
        bookNames: today.bookNames,
        translationBooks: today.lastTranslationBooks,
        translationBooksMap: today.translationBooksMap,
        lastTranslationId: today.lastTranslationId,
        searchVerses: today.searchVerses,
        getVerseText: today.getVerseText,
        getDefaultTranslation: today.getDefaultTranslation,
        getTranslationBooks: today.getTranslationBooks,
        bookmarks: state.bookmarks.bookmarks,
        isBookmarksListOpen: state.bookmarks.isFilterActive.value,
        showBookmarksList: () => {
          state.sidebar.isSidebarCollapsed.value = false;
          state.bookmarks.isFilterActive.value = true;
        },
        openPassage: (target) => openTodayPassage(state, today, target),
        openBookSelector: () => {
          const slot =
            state.tabsLayout.slots.value.find(
              (candidate) =>
                candidate.id === state.tabsLayout.selectedSlotId.value
            ) ?? null;
          if (slot) {
            state.selector.setOpen(true, slot);
          }
        },
      }}
    />
  );
}

/** Pane header title. Separate component so it can call `useI18n`. */
export function TodayPaneTitle() {
  const { t } = useI18n();
  return <>{t("today", { defaultValue: "Today" })}</>;
}
