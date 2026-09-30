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
    [makeUrl("/api/AAB/MAT/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "MAT", 1)
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
    // The address bar has moved from the playlist's page to its first step.
    const url = new URL(window.location.href);
    expect(url.pathname).toBe(
      "/en/playlist/owner.playlist_shared/exodus-stories/1"
    );
    expect(url.search).toBe("");
    expect(state.tutorial.promptVisible.value).toBe(false);
  });

  describe("playing at its own path", () => {
    const TWO_STEPS = {
      ...SEED,
      playlist: PlaylistSchema.parse({
        ...SEED.playlist,
        items: [
          {
            type: "bible-verse",
            translationId: "AAB",
            ref: { bookId: "EXO", chapter: 2 },
          },
          { type: "html", html: "<p>Reflect</p>" },
        ],
      }),
    };

    const pathname = () => new URL(window.location.href).pathname;

    it("writes each step into the path, including one that doesn't move the reader", async () => {
      window.history.replaceState(
        null,
        "",
        "/en/playlist/owner.playlist_shared/exodus-stories"
      );
      const state = await createTestSeedBibleState({
        responses: responses(),
        todayOpen: "fromUrl",
        initialPlaylistPageSeed: TWO_STEPS,
      });

      state.playlists.startPlaylistPage();
      await waitFor(() => pathname().endsWith("/1"), 2000);
      // Let the first step's own navigation finish, or its URL write could
      // land after the step moves on and pass for the step's own write.
      await waitFor(
        () =>
          state.app.currentReadingState.value?.tab.readingState.chapterData
            .value?.book.id === "EXO",
        2000
      );

      await state.playlists.playing.value!.next();
      await waitFor(() => pathname().endsWith("/2"), 2000);
      expect(pathname()).toBe(
        "/en/playlist/owner.playlist_shared/exodus-stories/2"
      );
    });

    it("moving to the next scripture step takes the reader to its chapter, not the default one", async () => {
      window.history.replaceState(
        null,
        "",
        "/en/playlist/owner.playlist_shared/exodus-stories"
      );
      const state = await createTestSeedBibleState({
        responses: responses(),
        todayOpen: "fromUrl",
        initialPlaylistPageSeed: {
          ...SEED,
          playlist: PlaylistSchema.parse({
            ...SEED.playlist,
            items: [
              {
                type: "bible-verse",
                translationId: "AAB",
                ref: { bookId: "EXO", chapter: 2 },
              },
              {
                type: "bible-verse",
                translationId: "AAB",
                ref: { bookId: "MAT", chapter: 1 },
              },
            ],
          }),
        },
      });
      const book = () =>
        state.app.currentReadingState.value?.tab.readingState.chapterData.value
          ?.book.id;
      state.playlists.startPlaylistPage();
      await waitFor(() => book() === "EXO", 2000);

      await state.playlists.playing.value!.next();
      await waitFor(() => pathname().endsWith("/2"), 2000);
      await waitFor(() => book() === "MAT", 2000);
      // Give a stray URL-driven navigation (to the default chapter) the
      // chance to land before checking it didn't.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(book()).toBe("MAT");
      expect(
        state.app.currentReadingState.value?.tab.readingState.bookId.value
      ).toBe("MAT");
    });

    it("Back from playing returns to the playlist's page and stops playback", async () => {
      window.history.replaceState(
        null,
        "",
        "/en/playlist/owner.playlist_shared/exodus-stories"
      );
      const state = await createTestSeedBibleState({
        responses: responses(),
        todayOpen: "fromUrl",
        initialPlaylistPageSeed: TWO_STEPS,
      });
      state.playlists.startPlaylistPage();
      await waitFor(() => pathname().endsWith("/1"), 2000);

      window.history.back();
      await waitFor(
        () =>
          pathname() === "/en/playlist/owner.playlist_shared/exodus-stories",
        2000
      );
      await waitFor(() => modalOpen(state), 2000);

      expect(state.playlists.playing.value).toBeNull();
    });

    it("a reload on a step resumes playback there, without the modal", async () => {
      window.history.replaceState(
        null,
        "",
        "/en/playlist/owner.playlist_shared/exodus-stories/1"
      );
      const state = await createTestSeedBibleState({
        responses: responses(),
        todayOpen: "fromUrl",
        initialPlaylistPageSeed: TWO_STEPS,
      });
      await state.playlists.initialPlaybackPromise;

      expect(state.playlists.playing.value?.currentIndex.value).toBe(0);
      expect(
        state.app.currentReadingState.value?.tab.readingState.chapterData.value
          ?.book.id
      ).toBe("EXO");
      expect(modalOpen(state)).toBe(false);
      expect(state.today.isOpen.value).toBe(false);
      expect(pathname()).toBe(
        "/en/playlist/owner.playlist_shared/exodus-stories/1"
      );
    });

    it("stopping playback leaves the playing path for the reader's chapter", async () => {
      window.history.replaceState(
        null,
        "",
        "/en/playlist/owner.playlist_shared/exodus-stories/1"
      );
      const state = await createTestSeedBibleState({
        responses: responses(),
        todayOpen: "fromUrl",
        initialPlaylistPageSeed: TWO_STEPS,
      });
      await state.playlists.initialPlaybackPromise;

      state.playlists.stopPlaying();

      expect(pathname()).toBe("/en/AAB/exodus/2");
      expect(state.playlists.playing.value).toBeNull();
    });
  });

  it("shows a not-found modal for a playlist that doesn't exist, and goes home from it", async () => {
    window.history.replaceState(
      null,
      "",
      "/en/playlist/owner.playlist_missing/gone"
    );
    const state = await createTestSeedBibleState({
      responses: responses(),
      todayOpen: "fromUrl",
      initialPlaylistPageSeed: {
        locator: "owner.playlist_missing",
        playlist: null,
        authorName: null,
      },
    });

    const modal = state.modals.modals.value.find(
      (m) => m.id === PLAYLIST_PAGE_MODAL_ID
    );
    expect(modal?.title).toBe("Playlist not found");
    expect(state.app.title.value).toContain("Playlist not found");
    expect(state.today.isOpen.value).toBe(false);

    state.modals.closeModal(PLAYLIST_PAGE_MODAL_ID);

    expect(state.today.isOpen.value).toBe(true);
    expect(new URL(window.location.href).pathname).not.toContain("/playlist/");
  });

  describe("when the playlist fails to load", () => {
    const CALL_PROCEDURE_URL =
      "https://auth.seedbible.org/api/v3/callProcedure";

    // No seed and no records-server response: the client's own load fails
    // the way it would offline.
    async function openFailingPlaylistPage() {
      window.history.replaceState(
        null,
        "",
        "/en/playlist/owner.playlist_shared/exodus-stories"
      );
      const mockedResponses: Record<string, unknown> = responses();
      const state = await createTestSeedBibleState({
        responses: mockedResponses as ReturnType<typeof responses>,
        todayOpen: "fromUrl",
      });
      await waitFor(() => state.playlists.playlistPageLoadFailed.value, 2000);
      return { state, mockedResponses };
    }

    const openModal = (state: Awaited<ReturnType<typeof openPlaylistPage>>) =>
      state.modals.modals.value.find((m) => m.id === PLAYLIST_PAGE_MODAL_ID);

    it("says so and offers to try again", async () => {
      const { state } = await openFailingPlaylistPage();

      expect(openModal(state)?.title).toBe("Couldn't load playlist");
      expect(state.app.title.value).toContain("Couldn't load playlist");
      expect(state.tutorial.promptVisible.value).toBe(false);
    });

    it("shows the playlist once trying again succeeds", async () => {
      const { state, mockedResponses } = await openFailingPlaylistPage();

      mockedResponses[CALL_PROCEDURE_URL] = createResponse({
        success: true,
        data: SEED.playlist,
      });
      await state.playlists.retryPlaylistPage();

      expect(openModal(state)?.title).toBe("Exodus Stories");
      expect(state.playlists.playlistPage.value?.playlist.id).toBe(
        "playlist_shared"
      );
    });

    it("goes home when closed", async () => {
      const { state } = await openFailingPlaylistPage();

      state.modals.closeModal(PLAYLIST_PAGE_MODAL_ID);

      expect(state.today.isOpen.value).toBe(true);
      expect(new URL(window.location.href).pathname).not.toContain(
        "/playlist/"
      );
    });
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
