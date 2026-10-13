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
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { SHARED_PAGE_MODAL_ID } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { PlaylistSchema } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import {
  ReadingPlanSchema,
  createReadingPlanProgress,
  markSessionCompleteInProgress,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import { I18nProvider } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import { h, render } from "preact";
import { act } from "preact/test-utils";
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
    [makeUrl("/api/AAB/MAT/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "MAT", 1)
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
  failedTitle: string;
  /** The raw record the records server returns once it's reachable again. */
  record: unknown;
  loadFailed: (state: SeedBibleState) => boolean;
  retry: (state: SeedBibleState) => Promise<void>;
  /** What "Start" leads to for this kind. */
  expectStarted: (state: SeedBibleState) => Promise<void>;
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
    failedTitle: "Couldn't load playlist",
    record: null,
    loadFailed: (state) => state.playlists.playlistPageLoadFailed.value,
    retry: (state) => state.playlists.retryPlaylistPage(),
    // A playlist plays from its first item.
    expectStarted: async (state) => {
      await waitFor(
        () =>
          state.app.currentReadingState.value?.tab.readingState.chapterData
            .value?.book.id === "EXO",
        2000
      );
      // It plays at its own path, at its first step.
      const url = new URL(window.location.href);
      expect(url.pathname).toBe(
        "/en/playlist/owner.playlist_shared/exodus-stories/1"
      );
      expect(url.search).toBe("");
      expect(state.playlists.playing.value?.currentIndex.value).toBe(0);
    },
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
    failedTitle: "Couldn't load reading plan",
    record: null,
    loadFailed: (state) => state.readingPlans.readingPlanPageLoadFailed.value,
    retry: (state) => state.readingPlans.retryReadingPlanPage(),
    // A reading plan opens on its pace picker: the plans pane on the plan,
    // with no progress selected, and nothing playing yet.
    expectStarted: async (state) => {
      expect(
        state.panes.panes.value.some((pane) => pane.id === READING_PLANS_PANE)
      ).toBe(true);
      expect(state.readingPlans.selectedReadingPlan.value?.address).toBe(
        "plan_shared"
      );
      expect(state.readingPlans.selectedReadingPlanProgress.value).toBeNull();
      expect(state.playlists.playing.value).toBeNull();
    },
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

for (const page of PAGES) {
  page.record =
    page.seed.initialPlaylistPageSeed?.item ??
    page.seed.initialReadingPlanPageSeed?.item;
}

const CALL_PROCEDURE_URL = "https://auth.seedbible.org/api/v3/callProcedure";
const READING_PLANS_PANE = "reading-plans-pane";

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
  ({
    path,
    seed,
    expectStarted,
    missingPath,
    missingSeed,
    notFoundTitle,
    failedTitle,
    record,
    loadFailed,
    retry,
  }) => {
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

    it("starting leaves the page and keeps the offer back", async () => {
      const state = await openSharedPage();

      state.app.startSharedPage();

      expect(modalOpen(state)).toBe(false);
      // No longer on the shared page itself (a playlist moves on to its
      // playing path, a reading plan to the reader's chapter).
      expect(new URL(window.location.href).pathname).not.toBe(path);
      await expectStarted(state);
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

    describe("when it fails to load", () => {
      // No seed and no records-server response: the client's own load fails
      // the way it would offline.
      async function openFailingPage() {
        window.history.replaceState(null, "", path);
        const mockedResponses: Record<string, unknown> = responses();
        const state = await createTestSeedBibleState({
          responses: mockedResponses as ReturnType<typeof responses>,
          todayOpen: "fromUrl",
        });
        await waitFor(() => loadFailed(state), 2000);
        return { state, mockedResponses };
      }

      const openModal = (state: SeedBibleState) =>
        state.modals.modals.value.find((m) => m.id === SHARED_PAGE_MODAL_ID);

      it("says so and offers to try again", async () => {
        const { state } = await openFailingPage();

        expect(openModal(state)?.title).toBe(failedTitle);
        expect(state.app.title.value).toContain(failedTitle);
        expect(state.tutorial.promptVisible.value).toBe(false);
      });

      it("shows it once trying again succeeds", async () => {
        const { state, mockedResponses } = await openFailingPage();

        mockedResponses[CALL_PROCEDURE_URL] = createResponse({
          success: true,
          data: record,
        });
        await retry(state);

        expect(loadFailed(state)).toBe(false);
        expect(openModal(state)?.title).toBe("Exodus Stories");
      });

      it("goes home when closed", async () => {
        const { state } = await openFailingPage();

        state.modals.closeModal(SHARED_PAGE_MODAL_ID);

        expect(state.today.isOpen.value).toBe(true);
        expect(new URL(window.location.href).pathname).not.toMatch(
          /\/(playlist|reading-plan)\//
        );
      });
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

/**
 * What a reading plan link offers depends on whether the visitor has already
 * started that plan. These render the modal's content, since the in-progress
 * wording only appears once the reader's progress has loaded in the browser.
 */
describe("a shared reading plan link, for someone who has started it", () => {
  const PLAN = ReadingPlanSchema.parse({
    address: "plan_started",
    recordName: "owner",
    authorUserId: "author-1",
    locale: "en",
    title: "Three Days",
    description: null,
    cadenceOptions: [
      {
        id: "daily",
        label: "Daily",
        cadence: { segments: [{ type: "read", days: 1 }] },
      },
    ],
    sessions: [1, 2, 3].map((n) => ({
      id: `s${n}`,
      readings: [{ id: `r${n}`, item: EXODUS_2 }],
    })),
    createdAtMs: 1,
    updatedAtMs: 1,
  });

  async function openStartedPlan(options: {
    selfPaced?: boolean;
    done: number;
  }) {
    window.history.replaceState(
      null,
      "",
      "/en/reading-plan/owner.plan_started/three-days"
    );
    const state = await createTestSeedBibleState({
      responses: responses(),
      todayOpen: "fromUrl",
      initialReadingPlanPageSeed: {
        locator: "owner.plan_started",
        item: PLAN,
        authorName: null,
      },
    });
    let progress = createReadingPlanProgress(
      PLAN,
      "reader-1",
      "progress-1",
      Date.now(),
      { selfPaced: options.selfPaced }
    );
    for (const session of PLAN.sessions.slice(0, options.done)) {
      progress = markSessionCompleteInProgress(progress, session, Date.now());
    }
    // What a signed-in reader's progress sync would have loaded.
    state.readingPlans.userReadingPlanProgresses.value = [progress];
    return { state, progress };
  }

  function renderModal(state: SeedBibleState) {
    const modal = state.modals.modals.value.find(
      (m) => m.id === SHARED_PAGE_MODAL_ID
    );
    const container = document.createElement("div");
    act(() => {
      render(
        h(I18nProvider, {
          i18n: state.i18n,
          children: modal?.content({ t: state.i18n.i18n.t }),
        }),
        container
      );
    });
    return {
      text: container.textContent ?? "",
      buttons: [...container.querySelectorAll("button")].map(
        (b) => b.textContent
      ),
    };
  }

  it("offers to start a plan nobody has started, with its reading time", async () => {
    window.history.replaceState(
      null,
      "",
      "/en/reading-plan/owner.plan_started/three-days"
    );
    const state = await createTestSeedBibleState({
      responses: responses(),
      todayOpen: "fromUrl",
      initialReadingPlanPageSeed: {
        locator: "owner.plan_started",
        item: PLAN,
        authorName: null,
      },
    });

    const { text, buttons } = renderModal(state);

    expect(text).toMatch(/3 sessions · About \d+ min per session/);
    expect(buttons).toEqual(["Close", "Start Reading Plan"]);
  });

  it("says which day a scheduled reader is on, and offers to resume it or start over", async () => {
    const { state } = await openStartedPlan({ done: 1 });

    const { text, buttons } = renderModal(state);

    expect(text).toContain("You're on day 2");
    expect(buttons).toEqual(["Close", "Start from beginning", "Resume day 2"]);
  });

  it("counts in sessions for a self-paced reader", async () => {
    const { state } = await openStartedPlan({ selfPaced: true, done: 2 });

    const { text, buttons } = renderModal(state);

    expect(text).toContain("You're on session 3");
    expect(buttons).toEqual([
      "Close",
      "Start from beginning",
      "Resume session 3",
    ]);
  });

  it("offers only a fresh start once the plan is finished", async () => {
    const { state } = await openStartedPlan({ done: 3 });

    const { text, buttons } = renderModal(state);

    expect(text).toContain("You've finished this plan.");
    expect(buttons).toEqual(["Close", "Start from beginning"]);
  });

  it("resuming opens the plan on the reader's own progress", async () => {
    const { state, progress } = await openStartedPlan({ done: 1 });

    state.app.resumeSharedPage();

    expect(
      state.panes.panes.value.some((pane) => pane.id === READING_PLANS_PANE)
    ).toBe(true);
    expect(state.readingPlans.selectedReadingPlanProgress.value?.id).toBe(
      progress.id
    );
    expect(new URL(window.location.href).pathname).not.toContain(
      "/reading-plan/"
    );
  });

  it("starting over opens the pace picker instead of the existing progress", async () => {
    const { state } = await openStartedPlan({ done: 1 });

    state.app.startSharedPage();

    expect(state.readingPlans.selectedReadingPlan.value?.address).toBe(
      "plan_started"
    );
    expect(state.readingPlans.selectedReadingPlanProgress.value).toBeNull();
  });
});

describe("a shared playlist, playing at its own path", () => {
  const SEED = PAGES[0]!.seed.initialPlaylistPageSeed!;
  const modalOpen = (state: SeedBibleState) =>
    state.modals.modals.value.some(
      (modal) => modal.id === SHARED_PAGE_MODAL_ID
    );

  const TWO_STEPS = {
    ...SEED,
    item: PlaylistSchema.parse({
      ...SEED.item,
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

    state.app.startSharedPage();
    await waitFor(() => pathname().endsWith("/1"), 2000);
    // Let the first step's own navigation finish, or its URL write could
    // land after the step moves on and pass for the step's own write.
    await waitFor(
      () =>
        state.app.currentReadingState.value?.tab.readingState.chapterData.value
          ?.book.id === "EXO",
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
        item: PlaylistSchema.parse({
          ...SEED.item,
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
    state.app.startSharedPage();
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
    state.app.startSharedPage();
    await waitFor(() => pathname().endsWith("/1"), 2000);

    window.history.back();
    await waitFor(
      () => pathname() === "/en/playlist/owner.playlist_shared/exodus-stories",
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
