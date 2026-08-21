/**
 * End-to-end cover for reading a reading-plan session through the reader.
 *
 * Tapping "Read" on a plan day hands the day's readings to the same playback
 * queue playlists use, which then drives the reader's own next/previous chapter
 * controls. That crosses four managers, so the bugs live in the seams rather
 * than in any one of them — hence a real reading state over a mocked API here,
 * wired to a real extension registry, a real playlist manager, and the URL
 * commit `TabsManager` performs on every navigation.
 */
import { createBibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { createBibleReadingExtensionManager } from "@packages/seed-bible/seed-bible/managers/BibleReadingExtensionManager";
import { createPlaylistManager } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import {
  EXAMPLE_API_ENDPOINT,
  aabBooks,
  createResponse,
  makeChapter,
  makeExampleUrl,
  translations,
  type WebResponseMap,
} from "../../../unit/seed-bible/managers/testUtils/mockBibleApiData";
import { signal } from "@preact/signals";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

let fetchMock: Mock;
const originalFetch = globalThis.fetch;
const teardown: (() => void)[] = [];

function responseMap(): WebResponseMap {
  const map: WebResponseMap = {
    [makeExampleUrl("/api/available_translations.json")]:
      createResponse(translations),
    [makeExampleUrl("/api/AAB/books.json")]: createResponse(aabBooks),
  };
  for (const [book, last] of [
    ["GEN", 6],
    ["EXO", 3],
    ["MAT", 3],
  ] as const) {
    for (let chapter = 1; chapter <= last; chapter++) {
      map[makeExampleUrl(`/api/AAB/${book}/${chapter}.json`)] = createResponse(
        makeChapter(aabBooks, book, chapter)
      );
    }
  }
  return map;
}

beforeEach(() => {
  // `updateQueryParams` writes through to the shared jsdom history, so without
  // this a manager built in the next test would seed from the previous test's
  // URL — inheriting its `playlist` param and trying to resume it.
  window.history.replaceState(null, "", "/");
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  const responses = responseMap();
  fetchMock.mockImplementation((url: string) => {
    const response = responses[url];
    if (!response) {
      throw new Error(`No mocked response for ${url}`);
    }
    return Promise.resolve(response);
  });
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  for (const dispose of teardown.splice(0)) {
    dispose();
  }
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

async function waitFor(condition: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Lets every pending navigation, effect and URL write settle. */
async function settle(readingState: any) {
  await waitFor(() => readingState.loading.value === false);
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  await waitFor(() => readingState.loading.value === false);
}

let planCounter = 0;

function setup() {
  const api = new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT);
  const dataManager = createBibleDataManager(api);
  const readingExtensionManager = createBibleReadingExtensionManager();
  const navigation = createNavigationManager();
  const i18n = createI18nManager(navigation, ["en"]);
  const highlights = {
    getChapterHighlights: vi.fn().mockReturnValue(signal({ highlights: [] })),
    highlightVerses: vi.fn(),
    unhighlightVerses: vi.fn(),
    highlightVerse: vi.fn(),
    unhighlightVerse: vi.fn(),
    saveChapterHighlights: vi.fn(),
  };
  const readingState = createBibleReadingState(
    dataManager,
    highlights as any,
    i18n,
    {
      initialTranslationId: "AAB",
      initialBookId: "GEN",
      initialChapterNumber: 1,
    },
    undefined,
    readingExtensionManager
  );
  const tab = {
    id: "tab-1",
    title: "Tab 1",
    readingState,
    sharedSession: null,
    sharedChat: null,
  };
  const tabs = {
    tabs: signal([tab]),
    selectedTabId: signal("tab-1"),
  } as any;
  const discover = {
    view: signal(null),
  } as any;
  const os = CasualOSManager();
  Object.assign(os, {
    recordData: vi.fn(),
    listDataByMarker: vi.fn().mockResolvedValue({ success: true, items: [] }),
    getData: vi.fn().mockResolvedValue({ success: true, data: null }),
    eraseData: vi.fn().mockResolvedValue({ success: true }),
  });
  const playlists = createPlaylistManager(
    os,
    { userId: signal("user-1"), login: vi.fn() } as any,
    tabs,
    navigation,
    signal(true),
    createModalManager(),
    i18n,
    readingExtensionManager,
    discover,
    {
      removeContext: vi.fn(),
    } as any
  );

  // What TabsManager does in the real app: each navigation writes the reading
  // state's query params (including the playlist extension's `playlist` /
  // `playlistStep`) back into the URL.
  const commitToUrl = () => {
    navigation.updateQueryParams(
      readingState.getUrlQueryParams(navigation.currentUrl.peek()),
      false
    );
  };
  const disposeNav = readingState.onNavigate(() => commitToUrl());
  commitToUrl();

  teardown.push(() => {
    disposeNav();
    readingState.dispose();
  });

  return {
    readingState,
    playlists,
    navigation,
    dataManager,
    planId: `plan-${++planCounter}`,
  };
}

function chapterItem(bookId: string, chapter: number) {
  return { type: "bible-verse" as const, ref: { bookId, chapter } };
}

function rangeItem(bookId: string, chapter: number, endChapter: number) {
  return { type: "bible-verse" as const, ref: { bookId, chapter, endChapter } };
}

function planPlaylist(id: string, items: any[]) {
  return {
    id,
    recordName: "record-1",
    authorUserId: "author-1",
    title: "My Plan",
    description: null,
    items,
    createdAtMs: 1,
    updatedAtMs: 1,
  } as any;
}

function position(readingState: any) {
  return `${readingState.bookId.value} ${readingState.chapterNumber.value}`;
}

describe("reading a plan session via the Read button", () => {
  it("contiguous single-book session: visits every chapter in order", async () => {
    const { readingState, playlists, planId } = setup();
    await settle(readingState);

    playlists.startPlaying(planPlaylist(planId, [rangeItem("GEN", 1, 3)]), 0);
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 1");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 2");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 3");
  });

  it("session that jumps between books: visits every reading in order", async () => {
    const { readingState, playlists, planId } = setup();
    await settle(readingState);

    playlists.startPlaying(
      planPlaylist(planId, [
        chapterItem("GEN", 1),
        chapterItem("EXO", 2),
        chapterItem("MAT", 3),
      ]),
      0
    );
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 1");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("EXO 2");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("MAT 3");
  });

  it("starting mid-session lands on that step", async () => {
    const { readingState, playlists, planId } = setup();
    await settle(readingState);

    playlists.startPlaying(
      planPlaylist(planId, [
        chapterItem("GEN", 1),
        chapterItem("EXO", 2),
        chapterItem("MAT", 3),
      ]),
      2
    );
    await settle(readingState);
    expect(position(readingState)).toBe("MAT 3");
  });

  it("keeps reading past the end of the session", async () => {
    const { readingState, playlists, planId } = setup();
    await settle(readingState);

    playlists.startPlaying(planPlaylist(planId, [rangeItem("GEN", 1, 2)]), 0);
    await settle(readingState);
    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 2");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 3");
  });

  it("going back then forward again stays in step with the queue", async () => {
    const { readingState, playlists, planId } = setup();
    await settle(readingState);

    playlists.startPlaying(
      planPlaylist(planId, [
        chapterItem("GEN", 1),
        chapterItem("EXO", 2),
        chapterItem("MAT", 3),
      ]),
      0
    );
    await settle(readingState);

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("EXO 2");

    await readingState.loadPreviousChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 1");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("EXO 2");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("MAT 3");
  });

  it("session whose last reading is a note: leaves the reader free to move on", async () => {
    const { readingState, playlists, planId } = setup();
    await settle(readingState);

    playlists.startPlaying(
      planPlaylist(planId, [
        chapterItem("GEN", 1),
        chapterItem("GEN", 2),
        { type: "html", html: "<p>Reflect on this.</p>" },
      ]),
      0
    );
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 1");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 2");

    // Stepping onto the note advances the queue but leaves the chapter on
    // screen — the note is shown in a modal, the reader has nothing to load.
    await readingState.loadNextChapter();
    await settle(readingState);
    expect(playlists.playing.value?.currentIndex.value).toBe(2);
    expect(position(readingState)).toBe("GEN 2");
    // Crucially the reader is not stuck: the session is over, so its own
    // chapter navigation is available again.
    expect(readingState.hasNext.value).toBe(true);

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 3");
  });

  it("session with a note in the MIDDLE: the chapter after it still loads", async () => {
    const { readingState, playlists, planId } = setup();
    await settle(readingState);

    playlists.startPlaying(
      planPlaylist(planId, [
        chapterItem("GEN", 1),
        { type: "html", html: "<p>Reflect.</p>" },
        chapterItem("MAT", 3),
      ]),
      0
    );
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 1");

    // Onto the note: queue advances, reader stays put.
    await readingState.loadNextChapter();
    await settle(readingState);
    expect(playlists.playing.value?.currentIndex.value).toBe(1);
    expect(position(readingState)).toBe("GEN 1");

    // And on to the session's last chapter, which must still load.
    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("MAT 3");
  });

  it("verse-range reading spanning chapters: reaches the final chapter", async () => {
    const { readingState, playlists, planId } = setup();
    await settle(readingState);

    // What "Add to plan" stores for a selection crossing a chapter boundary.
    playlists.startPlaying(
      planPlaylist(planId, [
        {
          type: "bible-verse" as const,
          ref: {
            bookId: "GEN",
            chapter: 1,
            verse: 2,
            endChapter: 3,
            endVerse: 2,
          },
        },
      ]),
      0
    );
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 1");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 2");

    await readingState.loadNextChapter();
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 3");
  });

  it("the swipe preview shows the chapter navigation actually lands on", async () => {
    const { readingState, playlists, dataManager, planId } = setup();
    await settle(readingState);

    playlists.startPlaying(
      planPlaylist(planId, [
        chapterItem("GEN", 1),
        chapterItem("EXO", 2),
        chapterItem("MAT", 3),
      ]),
      0
    );
    await settle(readingState);
    expect(position(readingState)).toBe("GEN 1");

    // What the mobile swipe track renders in its "next" panel.
    const preview = await readingState.getAdjacentChapter("next");
    const previewPosition = `${preview?.book.id} ${preview?.chapter.number}`;

    // What it used to render: the chapter that merely follows this one.
    const canonical = await dataManager.getNextChapter(
      readingState.chapterData.value!
    );
    expect(`${canonical?.book.id} ${canonical?.chapter.number}`).toBe("GEN 2");

    await readingState.loadNextChapter();
    await settle(readingState);

    // Navigation goes to the queue's next step, so the preview must match that
    // — not the canonical neighbour above.
    expect(previewPosition).toBe("EXO 2");
    expect(previewPosition).toBe(position(readingState));
  });

  it("two rapid forward navigations don't skip or stall", async () => {
    const { readingState, playlists, planId } = setup();
    await settle(readingState);

    playlists.startPlaying(planPlaylist(planId, [rangeItem("GEN", 1, 4)]), 0);
    await settle(readingState);

    // No settle between them: the user tapping/swiping twice quickly.
    const first = readingState.loadNextChapter();
    const second = readingState.loadNextChapter();
    await Promise.all([first, second]);
    await settle(readingState);

    const step = playlists.playing.value?.currentIndex.value;
    expect(position(readingState)).toBe(`GEN ${(step ?? 0) + 1}`);
  });
});
