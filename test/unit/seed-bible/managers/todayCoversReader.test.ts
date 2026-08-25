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

  it("holds the offer back while Today covers the reader, and makes it once Today closes", async () => {
    const state = await createStateWithLoadedChapter(true);

    expect(state.today.isOpen.value).toBe(true);
    expect(state.tutorial.promptVisible.value).toBe(false);

    // Closing Today is what turns the assertion above from "not yet" into "not
    // while covered". The offer appears from this same state with nothing else
    // changing, so everything else it waits on — the loaded chapter, the
    // profile — was already in place while that assertion ran, and Today was
    // the only thing holding it back. Waiting a fixed number of milliseconds
    // instead could only ever have established "not yet".
    state.today.close();

    await waitFor(() => state.tutorial.promptVisible.value, 2000);
    expect(state.tutorial.promptVisible.value).toBe(true);
  });
});
