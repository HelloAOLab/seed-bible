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
import { SHARED_PAGE_MODAL_ID } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { PlaylistSchema } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { ReadingPlanSchema } from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import type { CreateTestSeedBibleStateOptions } from "../testUtils/createTestSeedBibleState";

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

const EXODUS_2 = {
  type: "bible-verse" as const,
  translationId: "AAB",
  ref: { bookId: "EXO", chapter: 2 },
};

/** Both kinds of shared page, each opening on something that starts at Exodus 2. */
type Seeds = Pick<
  CreateTestSeedBibleStateOptions,
  "initialPlaylistPageSeed" | "initialReadingPlanPageSeed"
>;

const PAGES: {
  kind: string;
  path: string;
  seed: Seeds;
  missingPath: string;
  missingSeed: Seeds;
  notFoundTitle: string;
}[] = [
  {
    kind: "playlist",
    path: "/en/playlist/owner.playlist_shared/exodus-stories",
    missingPath: "/en/playlist/owner.playlist_missing/gone",
    missingSeed: {
      initialPlaylistPageSeed: {
        locator: "owner.playlist_missing",
        item: null,
        authorName: null,
      },
    },
    notFoundTitle: "Playlist not found",
    seed: {
      initialPlaylistPageSeed: {
        locator: "owner.playlist_shared",
        item: PlaylistSchema.parse({
          id: "playlist_shared",
          recordName: "owner",
          authorUserId: "author-1",
          title: "Exodus Stories",
          description: null,
          items: [EXODUS_2],
          createdAtMs: 1,
          updatedAtMs: 1,
        }),
        authorName: "Ruth",
      },
    },
  },
  {
    kind: "reading plan",
    path: "/en/reading-plan/owner.plan_shared/exodus-stories",
    missingPath: "/en/reading-plan/owner.plan_missing/gone",
    missingSeed: {
      initialReadingPlanPageSeed: {
        locator: "owner.plan_missing",
        item: null,
        authorName: null,
      },
    },
    notFoundTitle: "Reading plan not found",
    seed: {
      initialReadingPlanPageSeed: {
        locator: "owner.plan_shared",
        item: ReadingPlanSchema.parse({
          address: "plan_shared",
          recordName: "owner",
          authorUserId: "author-1",
          locale: "en",
          title: "Exodus Stories",
          description: null,
          cadenceOptions: [
            {
              id: "daily",
              label: "Daily",
              cadence: { segments: [{ type: "read", days: 1 }] },
            },
          ],
          sessions: [
            // An empty first session is skipped: Start goes to the first
            // session that has something to read.
            { id: "s0", readings: [] },
            { id: "s1", readings: [{ id: "r1", item: EXODUS_2 }] },
          ],
          createdAtMs: 1,
          updatedAtMs: 1,
        }),
        authorName: "Ruth",
      },
    },
  },
];

/**
 * A visitor who opens a shared playlist or reading plan link came for that
 * content, so the first-run tutorial offer must not appear over it — and must
 * not appear once they start it either. Closing it without starting sends
 * them home, which is an ordinary visit again, so the offer can come back.
 *
 * An integration test because what matters is how `createSeedBibleState`
 * wires the shared-page modal, Today and the tutorial together. The modal
 * isn't a pane, so nothing else hides the reader from the tutorial: without
 * the suppression the offer appears as soon as the chapter loads.
 */
describe.each(PAGES)(
  "a shared $kind link",
  ({ path, seed, missingPath, missingSeed, notFoundTitle }) => {
    async function openSharedPage() {
      window.history.replaceState(null, "", path);
      const state = await createTestSeedBibleState({
        responses: responses(),
        todayOpen: "fromUrl",
        ...seed,
      });
      await waitFor(
        () =>
          state.app.currentReadingState.value?.tab.readingState.chapterData
            .value != null,
        2000
      );
      return state;
    }

    const modalOpen = (state: Awaited<ReturnType<typeof openSharedPage>>) =>
      state.modals.modals.value.some(
        (modal) => modal.id === SHARED_PAGE_MODAL_ID
      );

    it("does not offer the tutorial over the modal", async () => {
      const state = await openSharedPage();

      expect(modalOpen(state)).toBe(true);
      expect(state.today.isOpen.value).toBe(false);
      expect(state.tutorial.promptVisible.value).toBe(false);
    });

    it("starting goes to the first reading and keeps the offer back", async () => {
      const state = await openSharedPage();

      state.app.startSharedPage();
      await waitFor(
        () =>
          state.app.currentReadingState.value?.tab.readingState.chapterData
            .value?.book.id === "EXO",
        2000
      );

      expect(modalOpen(state)).toBe(false);
      expect(state.playlists.playing.value?.currentIndex.value).toBe(0);
      expect(state.tutorial.promptVisible.value).toBe(false);
    });

    it("shows a not-found modal when it doesn't exist, and goes home from it", async () => {
      window.history.replaceState(null, "", missingPath);
      const state = await createTestSeedBibleState({
        responses: responses(),
        todayOpen: "fromUrl",
        ...missingSeed,
      });

      const modal = state.modals.modals.value.find(
        (m) => m.id === SHARED_PAGE_MODAL_ID
      );
      expect(modal?.title).toBe(notFoundTitle);
      expect(state.app.title.value).toContain(notFoundTitle);
      expect(state.today.isOpen.value).toBe(false);

      state.modals.closeModal(SHARED_PAGE_MODAL_ID);

      expect(state.today.isOpen.value).toBe(true);
      expect(new URL(window.location.href).pathname).not.toMatch(
        /\/(playlist|reading-plan)\//
      );
    });

    it("offers the tutorial from the home screen after the modal is closed", async () => {
      const state = await openSharedPage();

      state.modals.closeModal(SHARED_PAGE_MODAL_ID);

      // Home is Today, which covers the reader, so the offer waits for Today
      // like it does on any visit to "/".
      expect(state.today.isOpen.value).toBe(true);
      expect(state.tutorial.promptVisible.value).toBe(false);

      state.today.close();

      await waitFor(() => state.tutorial.promptVisible.value, 2000);
      expect(state.tutorial.promptVisible.value).toBe(true);
    });
  }
);
