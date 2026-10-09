import type { SeedBibleState } from "../../managers/SeedBibleStateManager";

export interface ReaderLocation {
  translationId: string;
  bookId: string;
  chapterNumber: number;
  verse?: number | [number, number];
}

/**
 * Shows a location from a sidebar list (a save, a bookmark): selects the open
 * tab already on that chapter, scrolling to `verse` if given, or opens a new
 * tab there when none is.
 *
 * `beforeOpen` runs inside the same batch, for callers that also dismiss menus.
 */
export function openReaderLocation(
  state: SeedBibleState,
  location: ReaderLocation,
  beforeOpen?: () => void
): void {
  const { app, tabs: tabsManager } = state;
  const { translationId, bookId, chapterNumber, verse } = location;
  // Everything below changes some piece of state that mirrors to the URL:
  // the reading position of the tab being opened, and — on mobile — the
  // dismissal of the sidebar it was tapped in. Batched, they cost one history
  // entry; unbatched, the position write lands on the entry that opened the
  // sidebar and the dismissal adds a second entry for the same destination,
  // which leaves the back button looking dead.
  state.navigation.batchWrites(() => {
    beforeOpen?.();
    const scrollVerse = Array.isArray(verse) ? verse[0] : verse;
    const existing = tabsManager.tabs.value.find(
      (tab) =>
        tab.readingState.translationId.value === translationId &&
        tab.readingState.bookId.value === bookId &&
        tab.readingState.chapterNumber.value === chapterNumber
    );
    if (existing) {
      app.selectTab(existing.id);
      if (scrollVerse !== undefined) {
        void existing.readingState.selectTranslationAndChapter(
          translationId,
          bookId,
          chapterNumber,
          { scrollToVerse: scrollVerse }
        );
      }
      return;
    }
    // Pass the location as the new tab's initial reading state so
    // `loadInitialData()` lands directly on it. Calling `addTab()` and then
    // `selectTranslationAndChapter()` would race the default GEN 1 load and
    // sometimes lose, leaving the user on Genesis 1 instead.
    const newTab = tabsManager.addTab(undefined, {
      initialTranslationId: translationId,
      initialBookId: bookId,
      initialChapterNumber: chapterNumber,
    });
    if (scrollVerse !== undefined) {
      newTab.readingState.scrollToVerse.value = scrollVerse;
    }
    // `addTab()` only marks the tab selected inside TabsManager — it doesn't
    // place it in a layout slot or dismiss the sidebar. Without this the mobile
    // sidebar screen stays on top of the reader, and the location is written
    // over the history entry that opened the sidebar instead of getting an
    // entry of its own.
    app.selectTab(newTab.id);
  });
}
