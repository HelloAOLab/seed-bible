import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  nivBooks,
  translations,
} from "./testUtils/mockBibleApiData";
import { TODAY_PANE_ID } from "@packages/seed-bible/seed-bible/managers/TodayManager";

/** The app defaults to the private API endpoint, so responses key on it. */
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

/** Genesis 1 is the boot tab's default; Exodus 2 is what storage restores. */
function responsesForBootAndRestore() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
    [makeUrl("/api/AAB/EXO/2.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "EXO", 2)
    ),
  };
}

/**
 * Genesis 1 is the boot tab's default; NIV is the profile's saved translation
 * and contains Matthew only, so it cannot hold the book the boot tab is on.
 */
function responsesForBootAndSavedTranslation() {
  return {
    ...responsesForBootAndRestore(),
    [makeUrl("/api/NIV/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(nivBooks),
    [makeUrl("/api/NIV/MAT/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(nivBooks, "MAT", 1)
    ),
  };
}

function storeTabOnExodus2(): void {
  window.localStorage.setItem(
    "sb-tabs-state",
    JSON.stringify({
      version: 1,
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "EXO", chapterNumber: 2 },
      ],
      selectedTabId: "tab-1",
      layout: "single",
      slotTabIds: ["tab-1"],
      selectedSlotIndex: 0,
    })
  );
}

/**
 * A visitor arriving with no reading position in the URL should land on Today
 * and stay there. A returning visitor also brings a saved reading position from
 * `localStorage`, which the app restores just after the first render — and the
 * reader writes that restored book/chapter into the address bar. That write is
 * the tail end of the same page load, not a navigation, so it must not count as
 * one: treating it as a navigation closed the fullscreen pane Today had just
 * opened, and the screen appeared and vanished again.
 */
describe("Today on a cold load with no reading position in the URL", () => {
  afterEach(() => {
    window.localStorage.removeItem("sb-tabs-state");
  });

  it("stays open while the saved reading position is restored", async () => {
    window.history.replaceState(null, "", "/");
    storeTabOnExodus2();

    const state = await createTestSeedBibleState({
      responses: responsesForBootAndRestore(),
      todayOpen: "fromUrl",
    });

    // The restore has to have actually happened, or "Today is still open" holds
    // for the uninteresting reason that nothing moved the reader at all.
    await waitFor(
      () => state.app.selectedTab.value?.readingState.bookId.value === "EXO",
      2000
    );
    expect(window.location.pathname).toBe("/en/AAB/exodus/2");

    expect(state.today.isOpen.value).toBe(true);
    expect(
      state.panes.panes.value.some((pane) => pane.id === TODAY_PANE_ID)
    ).toBe(true);
  });

  it("stays open while the profile's saved translation is restored", async () => {
    window.history.replaceState(null, "", "/");

    const state = await createTestSeedBibleState({
      responses: responsesForBootAndSavedTranslation(),
      todayOpen: "fromUrl",
    });

    // The boot tab is on Genesis, which the saved translation doesn't contain —
    // that mismatch is what makes the restore move the book, and moving the book
    // is what reaches the fullscreen-pane effect at all.
    expect(state.app.selectedTab.value?.readingState.bookId.value).toBe("GEN");
    expect(state.today.isOpen.value).toBe(true);

    state.login.profile.value = { name: "", config: { translationId: "NIV" } };

    // Same reasoning as above: the restore has to have actually landed, or
    // "Today is still open" holds for the uninteresting reason that nothing
    // moved the reader.
    await waitFor(
      () => state.app.selectedTab.value?.readingState.bookId.value === "MAT",
      2000
    );
    expect(window.location.pathname).toBe("/en/NIV/matthew/1");

    expect(state.today.isOpen.value).toBe(true);
    expect(
      state.panes.panes.value.some((pane) => pane.id === TODAY_PANE_ID)
    ).toBe(true);
  });
});
