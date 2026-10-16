import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createDiscoverManager } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import {
  getExtensionExports,
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { TheographicExtensionApi } from "@packages/theographic-extension/ext_theographic/init";
import type { TheographicPlaceEntry } from "@packages/theographic-extension/ext_theographic/provider";

const { default: initTheographicExtension, openInSameTab } =
  await import("@packages/theographic-extension/ext_theographic/init");

function createContext() {
  const discover = createDiscoverManager();
  const context = {
    discover,
    bibleData: { api: { endpoint: "https://bible.example/" } },
    app: { openVerseReference: vi.fn().mockResolvedValue(undefined) },
    panes: { openPane: vi.fn() },
  } as unknown as SeedBibleState;
  return { context, discover };
}

function install() {
  const { context, discover } = createContext();
  setupExtensionContext(context);
  initTheographicExtension();
  return discover;
}

describe("initTheographicExtension", () => {
  afterEach(() => {
    unregisterExtension("theographic-extension");
  });

  it("installs without any other extension", () => {
    const discover = install();

    expect(discover.providers.value.map((provider) => provider.id)).toEqual([
      "theographic",
    ]);
  });

  it("declares people, places and events as their own content types", () => {
    const discover = install();

    expect(discover.contentTypes.value).toEqual([
      {
        id: "person_profile",
        title: {
          key: "people",
          ns: "theographic-extension",
          defaultValue: "People",
        },
        hiddenByDefault: true,
        layout: "custom",
        priority: 100,
      },
      {
        id: "place_profile",
        title: {
          key: "places",
          ns: "theographic-extension",
          defaultValue: "Places",
        },
        hiddenByDefault: true,
        layout: "custom",
        priority: 110,
      },
      {
        id: "event",
        title: {
          key: "events",
          ns: "theographic-extension",
          defaultValue: "Events",
        },
        hiddenByDefault: true,
        layout: "custom",
        priority: 120,
      },
    ]);
  });

  it("registers its discover provider", () => {
    const discover = install();

    expect(discover.providers.value.map((provider) => provider.id)).toEqual([
      "theographic",
    ]);
  });

  it("takes its types and provider with it when uninstalled", () => {
    const discover = install();

    unregisterExtension("theographic-extension");

    // Nothing left behind: no chips for types nobody provides, and no provider
    // still feeding results into the panel.
    expect(discover.contentTypes.value).toEqual([]);
    expect(discover.providers.value).toEqual([]);
  });
});

describe("the API it hands to dependent extensions", () => {
  const BETHEL: TheographicPlaceEntry = {
    id: "bethel_202",
    name: "Bethel (of Palestine)",
    latitude: 31.93053921,
    longitude: 35.22103275,
    apiLink: "/api/d/theographic/places/bethel_202.json",
    verses: [3],
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    unregisterExtension("theographic-extension");
  });

  function installApi(response: Response = new Response("", { status: 500 })) {
    const fetchMock = vi.fn().mockResolvedValue(response);
    globalThis.fetch = fetchMock;
    const { context } = createContext();
    setupExtensionContext(context);
    initTheographicExtension();
    const api = getExtensionExports<TheographicExtensionApi>(
      "theographic-extension"
    )!;
    return { api, fetchMock, openPane: context.panes.openPane };
  }

  it("lists the places a chapter mentions, with their verses", async () => {
    const chapter = {
      chapter: { number: 13, people: [], places: [BETHEL], events: [] },
    };
    const { api, fetchMock } = installApi(
      new Response(JSON.stringify(chapter), { status: 200 })
    );

    await expect(api.getChapterPlaces("GEN", 13)).resolves.toEqual([BETHEL]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bible.example/api/d/theographic/GEN/13.json"
    );
  });

  it("lists no places for a chapter the dataset has nothing for", async () => {
    const { api } = installApi(new Response("", { status: 404 }));

    await expect(api.getChapterPlaces("OBA", 1)).resolves.toEqual([]);
  });

  it("rejects when the chapter can't be loaded", async () => {
    const { api } = installApi(new Response("", { status: 500 }));

    await expect(api.getChapterPlaces("GEN", 14)).rejects.toThrow();
  });

  it("opens a place in its own floating pane", () => {
    const { api, openPane } = installApi();

    api.openPlace(BETHEL);

    expect(openPane).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "theographic-place-bethel_202",
        placement: "floating",
        title: "Bethel (of Palestine)",
      })
    );
  });

  it("can't map a place with neither a file nor coordinates", () => {
    const { api } = installApi();
    const { latitude: _lat, longitude: _lng, ...unplaced } = BETHEL;

    expect(api.canMapPlace(BETHEL)).toBe(true);
    expect(api.canMapPlace({ ...unplaced, name: "Abana" })).toBe(false);
  });
});

describe("openInSameTab", () => {
  /** Two tabs side by side, e.g. a two-pane layout. */
  function twoTabs(selectedId: string) {
    const tab = (
      id: string,
      book: string,
      chapter: number,
      translation = "BSB"
    ) => ({
      id,
      readingState: {
        translationId: { value: translation },
        bookId: { value: book },
        chapterNumber: { value: chapter },
      },
    });
    const selectedTabId = { value: selectedId };
    const selectTab = vi.fn((id: string) => {
      selectedTabId.value = id;
    });
    const openVerseReference = vi.fn().mockResolvedValue(undefined);
    const context = {
      tabs: {
        tabs: {
          value: [
            tab("left", "EXO", 4),
            tab("right", "GEN", 10),
            // The same chapter as "right", in another translation.
            tab("parallel", "GEN", 10, "KJV"),
          ],
        },
        selectedTabId,
        selectTab,
      },
      app: { openVerseReference },
    } as unknown as SeedBibleState;
    return { context, selectTab, openVerseReference, selectedTabId };
  }

  const micah = { book: "MIC" as const, chapter: 5, verse: 6 };
  const fromGenesis10 = { translationId: "BSB", book: "GEN", chapter: 10 };

  it("navigates the tab whose panel was clicked, even when another is selected", () => {
    // The reader is focused on the left pane but clicks a mention in the
    // right pane's panel: the right pane is the one that should move.
    const { context, selectTab, openVerseReference, selectedTabId } =
      twoTabs("left");

    openInSameTab(context, micah, fromGenesis10);

    expect(selectTab).toHaveBeenCalledWith("right");
    expect(selectedTabId.value).toBe("right");
    expect(openVerseReference).toHaveBeenCalledWith(micah);
  });

  it("leaves the selection alone when the selected tab is already the one", () => {
    const { context, selectTab, openVerseReference } = twoTabs("right");

    openInSameTab(context, micah, fromGenesis10);

    expect(selectTab).not.toHaveBeenCalled();
    expect(openVerseReference).toHaveBeenCalledWith(micah);
  });

  it("falls back to the selected tab when no tab is showing that chapter", () => {
    const { context, selectTab, openVerseReference } = twoTabs("left");

    openInSameTab(context, micah, {
      translationId: "BSB",
      book: "PSA",
      chapter: 23,
    });

    expect(selectTab).not.toHaveBeenCalled();
    expect(openVerseReference).toHaveBeenCalledWith(micah);
  });

  it("tells apart two panes on the same chapter by their translation", () => {
    const { context, selectTab } = twoTabs("left");

    openInSameTab(context, micah, { ...fromGenesis10, translationId: "KJV" });

    expect(selectTab).toHaveBeenCalledWith("parallel");
  });

  it("never opens a new tab to do it", () => {
    const { context } = twoTabs("left");
    const addTab = vi.fn();
    (context.tabs as unknown as { addTab: typeof addTab }).addTab = addTab;

    openInSameTab(context, micah, fromGenesis10);

    expect(addTab).not.toHaveBeenCalled();
  });
});
