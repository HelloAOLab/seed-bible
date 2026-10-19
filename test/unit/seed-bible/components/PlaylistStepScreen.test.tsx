import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  PlaylistStepScreen,
  playlistScenes,
} from "@packages/seed-bible/seed-bible/components/PlaylistStepScreen/PlaylistStepScreen";
import {
  createPlayingState,
  type PlaylistItemData,
  type PlaylistManager,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const t = ((key: string, options?: Record<string, unknown>) =>
  String(options?.defaultValue ?? key).replace(
    /\{\{(\w+)\}\}/g,
    (_match, name: string) => String(options?.[name] ?? "")
  )) as Parameters<typeof playlistScenes>[1];

const resolveBookName = (id: string) =>
  ({ GEN: "Genesis", EXO: "Exodus" })[id] ?? id;

const chapterWith = (text: string) =>
  ({
    chapter: {
      number: 1,
      content: [{ type: "verse", number: 7, content: [text] }],
    },
  }) as unknown as TranslationBookChapter;

const ITEMS: PlaylistItemData[] = [
  {
    type: "html",
    title: "Overview & Flow",
    html: "<p>Notice who speaks.</p>",
  },
  { type: "scene", title: "Hagar", subtitle: "Genesis 16 · the road to Shur" },
  {
    type: "bible-verse",
    ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
  },
  {
    type: "bible-verse",
    ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
    note: "<p>Observe.</p>",
    noteTitle: "Hagar and the Angel",
  },
  { type: "scene", title: "Moses" },
  {
    type: "compare",
    title: "The angel who speaks as God",
    refs: [
      { bookId: "GEN", chapter: 16, label: "Hagar" },
      { bookId: "EXO", chapter: 3, label: "Moses" },
    ],
    terms: [{ text: "angel", label: "introduced as messenger" }],
  },
  { type: "bible-verse", ref: { bookId: "EXO", chapter: 3 } },
];

describe("playlistScenes", () => {
  it("spans each scene over the queue steps under it, naming their kinds", () => {
    expect(playlistScenes(ITEMS, t)).toEqual([
      {
        title: "Hagar",
        subtitle: "Genesis 16 · the road to Shur",
        firstStep: 2,
        lastStep: 3,
        kinds: ["Scripture", "Note + Scripture"],
      },
      {
        title: "Moses",
        subtitle: null,
        firstStep: 4,
        lastStep: 5,
        kinds: ["Compare", "Scripture"],
      },
    ]);
  });

  it("leaves out a scene with nothing under it", () => {
    expect(
      playlistScenes(
        [...ITEMS.slice(0, 1), { type: "scene", title: "Empty" }],
        t
      )
    ).toEqual([]);
  });
});

describe("PlaylistStepScreen", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderScreen(items: PlaylistItemData[], step = 0) {
    const playing = createPlayingState([
      { id: "p1", title: "Angel of the LORD", description: null, items },
    ]);
    playing.currentIndex.value = step;
    const addTab = vi.fn();
    const stopPlaying = vi.fn();
    const playlists = {
      playing: signal(playing),
      playingAuthorName: signal("Craig"),
      stopPlaying,
      playingStepOptions: () => ({
        resolveBookName,
        loadChapter: async (_t: unknown, bookId: string) =>
          chapterWith(
            bookId === "GEN" ? "The angel found her." : "God called."
          ),
        onOpenPassage: addTab,
        authorName: "Craig",
      }),
    } as unknown as PlaylistManager;
    act(() => {
      render(
        <PlaylistStepScreen
          playlists={playlists}
          state={{} as SeedBibleState}
        />,
        container
      );
    });
    return { playing, addTab, stopPlaying };
  }

  it("renders nothing for a scripture step", () => {
    renderScreen(ITEMS, 1);
    expect(container.querySelector(".sb-step-screen")).toBeNull();
  });

  it("opens the overview with the playlist's length, a map of its scenes and Begin", () => {
    const { playing } = renderScreen(ITEMS, 0);

    expect(
      container.querySelector(".sb-step-screen-eyebrow")?.textContent
    ).toBe("Playlist · By Craig · 5 steps · ~12 min");
    expect(
      container.querySelector(".sb-step-screen-playlist")?.textContent
    ).toBe("Angel of the LORD");
    expect(
      container.querySelector(".sb-step-screen-step-eyebrow")?.textContent
    ).toContain("Note · Step 1 of 5 · 1 min");
    expect(container.querySelector(".sb-step-screen-title")?.textContent).toBe(
      "Overview & Flow"
    );

    const scenes = Array.from(
      container.querySelectorAll(".sb-step-screen-scene")
    ).map((el) => ({
      eyebrow: el.querySelector(".sb-step-screen-scene-eyebrow")?.textContent,
      title: el.querySelector(".sb-step-screen-scene-title")?.textContent,
      subtitle: el.querySelector(".sb-step-screen-scene-subtitle")?.textContent,
      kinds: el.querySelector(".sb-step-screen-scene-kinds")?.textContent,
    }));
    expect(scenes).toEqual([
      {
        eyebrow: "Scene 1 · Steps 2–3",
        title: "Hagar",
        subtitle: "Genesis 16 · the road to Shur",
        kinds: "Scripture · Note + Scripture",
      },
      {
        eyebrow: "Scene 2 · Steps 4–5",
        title: "Moses",
        subtitle: undefined,
        kinds: "Compare · Scripture",
      },
    ]);

    expect(
      container.querySelector(".sb-step-screen-up-next")?.textContent
    ).toBe("Up next · Scripture · 2 minGenesis 16:7-13");
    expect(container.querySelector(".sb-step-screen-previous")).toBeNull();
    const begin = container.querySelector<HTMLButtonElement>(
      ".sb-step-screen-next"
    )!;
    expect(begin.textContent).toContain("Begin");
    act(() => begin.click());
    expect(playing.currentIndex.value).toBe(1);
  });

  it("a scene card jumps to the scene's first step", () => {
    const { playing } = renderScreen(ITEMS, 0);
    act(() => {
      container
        .querySelectorAll<HTMLButtonElement>(".sb-step-screen-scene-button")[1]!
        .click();
    });
    expect(playing.currentIndex.value).toBe(3);
  });

  it("shows a compare step with its passages, Previous and Next step, and opens a passage in a tab", async () => {
    const { playing, addTab } = renderScreen(ITEMS, 3);

    expect(
      container.querySelector(".sb-step-screen-step-eyebrow")?.textContent
    ).toContain("Compare · Step 4 of 5 · 3 min");
    expect(container.querySelector(".sb-step-screen-title")?.textContent).toBe(
      "The angel who speaks as God"
    );
    expect(container.querySelector(".sb-step-screen-map")).toBeNull();
    expect(
      Array.from(container.querySelectorAll(".sb-step-compare-heading")).map(
        (el) => el.textContent
      )
    ).toEqual(["Genesis 16Hagar", "Exodus 3Moses"]);
    await vi.waitFor(() =>
      expect(
        container.querySelector(".sb-item-inline-preview-term")?.textContent
      ).toBe("angel")
    );

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-step-compare-open")!
        .click();
    });
    expect(addTab).toHaveBeenCalledWith({
      bookId: "GEN",
      chapter: 16,
      label: "Hagar",
    });

    expect(container.querySelector(".sb-step-screen-previous")).not.toBeNull();
    const next = container.querySelector<HTMLButtonElement>(
      ".sb-step-screen-next"
    )!;
    expect(next.textContent).toContain("Next step");
    act(() => next.click());
    expect(playing.currentIndex.value).toBe(4);
  });

  it("closing the screen stops the playlist", () => {
    const { stopPlaying } = renderScreen(ITEMS, 0);
    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-step-screen-close")!
        .click();
    });
    expect(stopPlaying).toHaveBeenCalledTimes(1);
  });

  it("offers Finish on the last step", () => {
    renderScreen([{ type: "html", html: "<p>Only.</p>", title: "Only" }], 0);
    expect(
      container.querySelector(".sb-step-screen-up-next")?.textContent
    ).toBe("Last step");
    expect(
      container.querySelector(".sb-step-screen-next")?.textContent
    ).toContain("Finish");
  });
});
