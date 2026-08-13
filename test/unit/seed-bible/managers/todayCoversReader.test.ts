import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "./testUtils/mockBibleApiData";

/** The app defaults to the private API endpoint, so responses key on it. */
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

// A chapter has to actually load, or `readerVisible` is false for that reason
// alone and these assertions would hold no matter what Today did.
function responsesWithAChapter() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
  };
}

async function createStateWithLoadedChapter(todayOpen: boolean) {
  const state = await createTestSeedBibleState({
    responses: responsesWithAChapter(),
    todayOpen,
  });
  await waitFor(
    () =>
      state.app.currentReadingState.value?.tab.readingState.chapterData.value !=
      null,
    2000
  );
  return state;
}

/**
 * The tutorial offers its tour once the reader is visible. Today covers the
 * reader as a fullscreen pane, so "reader visible" has to account for it —
 * otherwise the offer card renders underneath the Today screen, where the user
 * can neither see nor dismiss it.
 *
 * An integration test on purpose: the risk is in how `createSeedBibleState`
 * wires the pane relative to `readerVisible`, not in `TutorialManager` itself,
 * and the failure is silent — everything renders, just with a prompt stranded
 * behind a fullscreen pane.
 */
describe("reader visibility while Today is open", () => {
  it("offers the tutorial once the chapter loads and nothing covers it", async () => {
    const state = await createStateWithLoadedChapter(false);

    expect(state.today.isOpen.value).toBe(false);
    await waitFor(() => state.tutorial.promptVisible.value, 2000);
    expect(state.tutorial.promptVisible.value).toBe(true);
  });

  it("never offers the tutorial while Today covers the reader", async () => {
    const state = await createStateWithLoadedChapter(true);

    expect(state.today.isOpen.value).toBe(true);
    // Long enough for the chapter-loaded effect to have run and re-run.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.tutorial.promptVisible.value).toBe(false);
  });

  it("offers the tutorial after Today is closed", async () => {
    const state = await createStateWithLoadedChapter(true);
    expect(state.tutorial.promptVisible.value).toBe(false);

    state.today.close();

    await waitFor(() => state.tutorial.promptVisible.value, 2000);
    expect(state.tutorial.promptVisible.value).toBe(true);
  });
});
