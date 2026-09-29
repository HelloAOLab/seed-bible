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
import { PLAYLIST_PAGE_MODAL_ID } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  PlaylistSchema,
  type PlaylistPageSeed,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

/** The app defaults to the private API endpoint, so responses key on it. */
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

function responses() {
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

const SEED: PlaylistPageSeed = {
  locator: "owner.playlist_shared",
  playlist: PlaylistSchema.parse({
    id: "playlist_shared",
    recordName: "owner",
    authorUserId: "author-1",
    title: "Exodus Stories",
    description: null,
    items: [
      {
        type: "bible-verse",
        translationId: "AAB",
        ref: { bookId: "EXO", chapter: 2 },
      },
    ],
    createdAtMs: 1,
    updatedAtMs: 1,
  }),
  authorName: "Ruth",
};

/**
 * A visitor who opens a shared playlist link came for the playlist, so the
 * first-run tutorial offer must not appear over it — and must not appear
 * once they start it either. Closing the playlist without starting it sends
 * them home, which is an ordinary visit again, so the offer can come back.
 *
 * An integration test because what matters is how `createSeedBibleState`
 * wires the playlist modal, Today and the tutorial together. The playlist
 * modal isn't a pane, so nothing else hides the reader from the tutorial:
 * without the suppression the offer appears as soon as the chapter loads.
 */
describe("tutorial offer on a playlist link", () => {
  async function openPlaylistPage() {
    window.history.replaceState(
      null,
      "",
      "/en/playlist/owner.playlist_shared/exodus-stories"
    );
    const state = await createTestSeedBibleState({
      responses: responses(),
      todayOpen: "fromUrl",
      initialPlaylistPageSeed: SEED,
    });
    await waitFor(
      () =>
        state.app.currentReadingState.value?.tab.readingState.chapterData
          .value != null,
      2000
    );
    return state;
  }

  const modalOpen = (state: Awaited<ReturnType<typeof openPlaylistPage>>) =>
    state.modals.modals.value.some(
      (modal) => modal.id === PLAYLIST_PAGE_MODAL_ID
    );

  it("does not offer the tutorial over the playlist", async () => {
    const state = await openPlaylistPage();

    expect(modalOpen(state)).toBe(true);
    expect(state.today.isOpen.value).toBe(false);
    expect(state.tutorial.promptVisible.value).toBe(false);
  });

  it("keeps the offer back after the playlist is started", async () => {
    const state = await openPlaylistPage();

    state.playlists.startPlaylistPage();
    await waitFor(
      () =>
        state.app.currentReadingState.value?.tab.readingState.chapterData.value
          ?.book.id === "EXO",
      2000
    );

    expect(modalOpen(state)).toBe(false);
    expect(state.tutorial.promptVisible.value).toBe(false);
  });

  it("offers the tutorial from the home screen after the playlist is closed", async () => {
    const state = await openPlaylistPage();

    state.modals.closeModal(PLAYLIST_PAGE_MODAL_ID);

    // Home is Today, which covers the reader, so the offer waits for Today
    // like it does on any visit to "/".
    expect(state.today.isOpen.value).toBe(true);
    expect(state.tutorial.promptVisible.value).toBe(false);

    state.today.close();

    await waitFor(() => state.tutorial.promptVisible.value, 2000);
    expect(state.tutorial.promptVisible.value).toBe(true);
  });
});
